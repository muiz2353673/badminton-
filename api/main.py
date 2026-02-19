"""
Tournament API – FastAPI backend.
Uses Supabase (service role) for DB. Run: uvicorn main:app --reload --port 8000
"""
import os
from typing import Any, Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel

from bracket import generate_bracket_matches, generate_bracket_matches_doubles


class UpdateRegistrationBody(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    age_group: Optional[str] = None
    event: Optional[str] = None
    standard: Optional[str] = None
    partner_name: Optional[str] = None
    partner_id: Optional[str] = None
    notes: Optional[str] = None
    group_id: Optional[str] = None


class UpdateMatchBody(BaseModel):
    score1: Optional[int] = None
    score2: Optional[int] = None
    winner_id: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[str] = None

app = FastAPI(title="Tournament API")

# Allow frontend on localhost and common production hosts
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://tournament-web.onrender.com",
    "https://badminton-fme6.onrender.com",
]
if os.environ.get("FRONTEND_ORIGIN"):
    extra = os.environ["FRONTEND_ORIGIN"].strip().rstrip("/")
    if extra and extra not in origins:
        origins.append(extra)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Optional[Client] = create_client(url, key) if url and key else None


class GenerateBracketRequest(BaseModel):
    tournament_id: str
    event: str
    standard: str  # e.g. Intermediate, Advanced
    age_group: str  # U11, U13, U15, U17, U19, Senior – draws are per event + standard + age group


class CreateGroupRequest(BaseModel):
    tournament_id: str
    event: str
    standard: Optional[str] = None
    age_group: Optional[str] = None
    name: str  # e.g. "Group A"


class GenerateRoundRobinRequest(BaseModel):
    tournament_id: str
    event: str
    standard: Optional[str] = None
    age_group: Optional[str] = None


class UpdateGroupBody(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Tournament API", "docs": "/docs"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _is_doubles_event(event: str) -> bool:
    return "doubles" in (event or "").lower()


def _form_pairs(rows: list[dict[str, Any]]) -> list[tuple[str, str]]:
    """From registrations with partner_id, form unique pairs (mutual partner_id). Returns list of (id1, id2) with id1 < id2."""
    seen = set()
    pairs: list[tuple[str, str]] = []
    for r in rows:
        rid = str(r["id"])
        pid = r.get("partner_id")
        if not pid:
            continue
        pid = str(pid)
        if rid in seen or pid in seen:
            continue
        # Check mutual: find partner row and ensure partner.partner_id == rid
        partner = next((x for x in rows if str(x["id"]) == pid), None)
        if not partner or str(partner.get("partner_id")) != rid:
            continue
        seen.add(rid)
        seen.add(pid)
        pairs.append((min(rid, pid), max(rid, pid)))
    return pairs


@app.post("/generate-bracket")
def generate_bracket(body: GenerateBracketRequest) -> dict[str, Any]:
    """Generate full single-elimination bracket from registrations for an event + standard + age group. For doubles events, registrations must have partner_id set (mutual)."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")

    r = (
        supabase.table("registrations")
        .select("id, full_name, partner_id")
        .eq("tournament_id", body.tournament_id)
        .eq("event", body.event)
        .eq("standard", body.standard)
        .eq("age_group", body.age_group)
        .execute()
    )
    rows = r.data or []
    if len(rows) < 2:
        return {"message": "Not enough players", "count": len(rows), "matches_created": 0, "matches": []}

    # Remove existing matches for this tournament + event + standard + age_group so we can regenerate
    (
        supabase.table("matches")
        .delete()
        .eq("tournament_id", body.tournament_id)
        .eq("event", body.event)
        .eq("standard", body.standard)
        .eq("age_group", body.age_group)
        .execute()
    )

    if _is_doubles_event(body.event):
        pairs = _form_pairs(rows)
        if len(pairs) < 2:
            return {"message": "Not enough pairs (set partner for each player in Admin)", "count": len(pairs), "matches_created": 0, "matches": []}
        match_payloads = generate_bracket_matches_doubles(body.tournament_id, body.event, body.standard, body.age_group, pairs)
    else:
        match_payloads = generate_bracket_matches(body.tournament_id, body.event, body.standard, body.age_group, rows)

    if not match_payloads:
        return {"message": "Bracket generated", "count": len(rows), "matches_created": 0, "matches": []}
    ins = supabase.table("matches").insert(match_payloads).execute()
    inserted = ins.data or []

    return {
        "message": "Bracket generated",
        "count": len(rows),
        "matches_created": len(inserted),
        "matches": inserted,
    }


@app.get("/draws")
def get_draws(
    tournament_id: str = Query(..., description="Tournament UUID"),
    event: Optional[str] = Query(None, description="Filter by event name"),
    standard: Optional[str] = Query(None, description="Filter by standard (e.g. Intermediate, Advanced)"),
    age_group: Optional[str] = Query(None, description="Filter by age group (U11, U13, U15, U17, U19, Senior)"),
) -> dict[str, Any]:
    """Return matches for draw display, with player names. Optionally filter by event, standard, and age group."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")

    q = (
        supabase.table("matches")
        .select("id, tournament_id, event, standard, age_group, group_id, round, round_order, slot_in_round, player1_id, player1_partner_id, player2_id, player2_partner_id, score1, score2, winner_id, status, scheduled_at")
        .eq("tournament_id", tournament_id)
        .order("round_order")
        .order("slot_in_round")
    )
    if event:
        q = q.eq("event", event)
    if standard:
        q = q.eq("standard", standard)
    if age_group:
        q = q.eq("age_group", age_group)
    r = q.execute()
    matches = r.data or []

    # Resolve player IDs to names (including partners for doubles)
    reg_ids = set()
    for m in matches:
        for key in ("player1_id", "player1_partner_id", "player2_id", "player2_partner_id", "winner_id"):
            if m.get(key):
                reg_ids.add(m[key])

    names: dict[str, str] = {}
    if reg_ids:
        regs = (
            supabase.table("registrations")
            .select("id, full_name")
            .in_("id", list(reg_ids))
            .execute()
        )
        for row in regs.data or []:
            names[str(row["id"])] = row.get("full_name") or "?"

    for m in matches:
        p1 = names.get(str(m.get("player1_id") or "")) or ("BYE" if m.get("player2_id") else "—")
        p1_partner = names.get(str(m.get("player1_partner_id") or "")) if m.get("player1_partner_id") else None
        p2 = names.get(str(m.get("player2_id") or "")) or ("BYE" if m.get("player1_id") else "—")
        p2_partner = names.get(str(m.get("player2_partner_id") or "")) if m.get("player2_partner_id") else None
        m["player1_name"] = f"{p1} / {p1_partner}" if p1_partner else p1
        m["player2_name"] = f"{p2} / {p2_partner}" if p2_partner else p2
        m["player1_partner_name"] = p1_partner
        m["player2_partner_name"] = p2_partner
        m["winner_name"] = names.get(str(m.get("winner_id") or "")) or None

    events = list({m["event"] for m in matches}) if matches else []
    standards = list({m.get("standard") for m in matches if m.get("standard")}) if matches else []
    age_groups = list({m.get("age_group") for m in matches if m.get("age_group")}) if matches else []

    # Groups for this event (round-robin)
    groups_q = supabase.table("groups").select("id, name, sort_order").eq("tournament_id", tournament_id)
    if event:
        groups_q = groups_q.eq("event", event)
    if standard:
        groups_q = groups_q.eq("standard", standard)
    if age_group:
        groups_q = groups_q.eq("age_group", age_group)
    groups_res = groups_q.order("sort_order").order("name").execute()
    groups = groups_res.data or []

    return {"tournament_id": tournament_id, "event_filter": event, "standard_filter": standard, "age_group_filter": age_group, "events": events, "standards": standards, "age_groups": age_groups, "groups": groups, "matches": matches}


# --- Admin-only: edit/delete registrations (player info) and matches (draws) ---

@app.patch("/registrations/{registration_id}")
def update_registration(registration_id: str, body: UpdateRegistrationBody) -> dict[str, Any]:
    """Update a registration (player info). Admin only. Setting partner_id also sets the partner's partner_id to this registration (mutual)."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        return {"message": "No changes", "id": registration_id}

    # If changing partner_id, clear old partner's link and set new partner's link
    if "partner_id" in payload:
        old = supabase.table("registrations").select("partner_id").eq("id", registration_id).execute()
        old_partner = old.data[0].get("partner_id") if old.data else None
        if old_partner:
            supabase.table("registrations").update({"partner_id": None}).eq("id", old_partner).execute()
        new_partner = payload["partner_id"]
        if new_partner:
            supabase.table("registrations").update({"partner_id": registration_id}).eq("id", new_partner).execute()

    r = supabase.table("registrations").update(payload).eq("id", registration_id).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Registration not found")
    return {"message": "Updated", "registration": r.data[0]}


@app.delete("/registrations/{registration_id}")
def delete_registration(registration_id: str) -> dict[str, str]:
    """Delete a registration (player). Admin only."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    r = supabase.table("registrations").delete().eq("id", registration_id).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Registration not found")
    return {"message": "Deleted", "id": registration_id}


@app.patch("/matches/{match_id}")
def update_match(match_id: str, body: UpdateMatchBody) -> dict[str, Any]:
    """Update a match (score, winner, status). Admin only – draws editable only for admin."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        return {"message": "No changes", "id": match_id}
    r = supabase.table("matches").update(payload).eq("id", match_id).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Match not found")
    return {"message": "Updated", "match": r.data[0]}


@app.delete("/matches/{match_id}")
def delete_match(match_id: str) -> dict[str, str]:
    """Delete a match. Admin only."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    r = supabase.table("matches").delete().eq("id", match_id).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Match not found")
    return {"message": "Deleted", "id": match_id}


# --- Round-robin groups (admin assigns players to groups, then generates matches) ---

@app.get("/groups")
def list_groups(
    tournament_id: str = Query(..., description="Tournament UUID"),
    event: Optional[str] = Query(None),
    standard: Optional[str] = Query(None),
    age_group: Optional[str] = Query(None),
) -> dict[str, Any]:
    """List groups for an event + standard + age_group. Used by admin to manage round-robin draw."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    q = supabase.table("groups").select("id, tournament_id, event, standard, age_group, name, sort_order").eq("tournament_id", tournament_id)
    if event:
        q = q.eq("event", event)
    if standard:
        q = q.eq("standard", standard)
    if age_group:
        q = q.eq("age_group", age_group)
    r = q.order("sort_order").order("name").execute()
    return {"groups": r.data or []}


@app.post("/groups")
def create_group(body: CreateGroupRequest) -> dict[str, Any]:
    """Create a group for round-robin. Admin then assigns players to it."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    payload = {"tournament_id": body.tournament_id, "event": body.event, "standard": body.standard, "age_group": body.age_group, "name": body.name}
    r = supabase.table("groups").insert(payload).execute()
    if not r.data:
        raise HTTPException(status_code=500, detail="Failed to create group")
    return {"message": "Created", "group": r.data[0]}


@app.patch("/groups/{group_id}")
def update_group(group_id: str, body: UpdateGroupBody) -> dict[str, Any]:
    """Rename a group or change sort_order."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    allowed = body.model_dump(exclude_unset=True)
    if not allowed:
        return {"message": "No changes", "id": group_id}
    r = supabase.table("groups").update(allowed).eq("id", group_id).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Group not found")
    return {"message": "Updated", "group": r.data[0]}


@app.delete("/groups/{group_id}")
def delete_group(group_id: str) -> dict[str, Any]:
    """Delete a group. Unassigns registrations and deletes matches in this group."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    supabase.table("registrations").update({"group_id": None}).eq("group_id", group_id).execute()
    supabase.table("matches").delete().eq("group_id", group_id).execute()
    r = supabase.table("groups").delete().eq("id", group_id).execute()
    if not r.data:
        raise HTTPException(status_code=404, detail="Group not found")
    return {"message": "Deleted", "id": group_id}


@app.post("/generate-round-robin")
def generate_round_robin(body: GenerateRoundRobinRequest) -> dict[str, Any]:
    """For each group in this event+standard+age_group, create round-robin matches (every pair of players in that group). Replaces existing group matches."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")

    gr = (
        supabase.table("groups")
        .select("id, name")
        .eq("tournament_id", body.tournament_id)
        .eq("event", body.event)
    )
    if body.standard is not None:
        gr = gr.eq("standard", body.standard)
    if body.age_group is not None:
        gr = gr.eq("age_group", body.age_group)
    groups_data = gr.order("sort_order").order("name").execute().data or []

    # Remove any elimination-bracket matches for this event (group_id is null) so we only show round-robin
    del_q = supabase.table("matches").delete().eq("tournament_id", body.tournament_id).eq("event", body.event).is_("group_id", "null")
    if body.standard is not None:
        del_q = del_q.eq("standard", body.standard)
    if body.age_group is not None:
        del_q = del_q.eq("age_group", body.age_group)
    del_q.execute()

    is_doubles = _is_doubles_event(body.event)
    total_created = 0
    for g in groups_data:
        gid, gname = g["id"], g["name"]
        regs = (
            supabase.table("registrations")
            .select("id, partner_id")
            .eq("tournament_id", body.tournament_id)
            .eq("event", body.event)
            .eq("group_id", gid)
            .execute()
        )
        rows = regs.data or []
        # Delete existing matches for this group
        supabase.table("matches").delete().eq("group_id", gid).execute()

        if is_doubles:
            pairs = _form_pairs(rows)
            if len(pairs) < 2:
                continue
            match_payloads = []
            for i in range(len(pairs)):
                for j in range(i + 1, len(pairs)):
                    a, b = pairs[i], pairs[j]
                    match_payloads.append({
                        "tournament_id": body.tournament_id,
                        "event": body.event,
                        "standard": body.standard,
                        "age_group": body.age_group,
                        "group_id": gid,
                        "round": gname,
                        "round_order": 0,
                        "slot_in_round": len(match_payloads),
                        "player1_id": a[0],
                        "player1_partner_id": a[1],
                        "player2_id": b[0],
                        "player2_partner_id": b[1],
                        "status": "scheduled",
                    })
        else:
            player_ids = [r["id"] for r in rows]
            if len(player_ids) < 2:
                continue
            match_payloads = []
            for i in range(len(player_ids)):
                for j in range(i + 1, len(player_ids)):
                    match_payloads.append({
                        "tournament_id": body.tournament_id,
                        "event": body.event,
                        "standard": body.standard,
                        "age_group": body.age_group,
                        "group_id": gid,
                        "round": gname,
                        "round_order": 0,
                        "slot_in_round": len(match_payloads),
                        "player1_id": player_ids[i],
                        "player2_id": player_ids[j],
                        "status": "scheduled",
                    })
        if match_payloads:
            supabase.table("matches").insert(match_payloads).execute()
            total_created += len(match_payloads)

    return {"message": "Round-robin matches generated", "matches_created": total_created, "groups_processed": len(groups_data)}
