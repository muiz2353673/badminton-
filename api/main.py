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

from bracket import generate_bracket_matches


class UpdateRegistrationBody(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    age_group: Optional[str] = None
    event: Optional[str] = None
    standard: Optional[str] = None
    partner_name: Optional[str] = None
    notes: Optional[str] = None


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
]
if os.environ.get("FRONTEND_ORIGIN"):
    origins.append(os.environ["FRONTEND_ORIGIN"].rstrip("/"))

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


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Tournament API", "docs": "/docs"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/generate-bracket")
def generate_bracket(body: GenerateBracketRequest) -> dict[str, Any]:
    """Generate full single-elimination bracket from registrations for an event + standard + age group."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")

    r = (
        supabase.table("registrations")
        .select("id, full_name")
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
        .select("id, tournament_id, event, standard, age_group, round, round_order, slot_in_round, player1_id, player2_id, score1, score2, winner_id, status, scheduled_at")
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

    # Resolve player IDs to names
    reg_ids = set()
    for m in matches:
        if m.get("player1_id"):
            reg_ids.add(m["player1_id"])
        if m.get("player2_id"):
            reg_ids.add(m["player2_id"])
        if m.get("winner_id"):
            reg_ids.add(m["winner_id"])

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
        m["player1_name"] = names.get(str(m.get("player1_id") or "")) or ("BYE" if m.get("player2_id") else "—")
        m["player2_name"] = names.get(str(m.get("player2_id") or "")) or ("BYE" if m.get("player1_id") else "—")
        m["winner_name"] = names.get(str(m.get("winner_id") or "")) or None

    events = list({m["event"] for m in matches}) if matches else []
    standards = list({m.get("standard") for m in matches if m.get("standard")}) if matches else []
    age_groups = list({m.get("age_group") for m in matches if m.get("age_group")}) if matches else []
    return {"tournament_id": tournament_id, "event_filter": event, "standard_filter": standard, "age_group_filter": age_group, "events": events, "standards": standards, "age_groups": age_groups, "matches": matches}


# --- Admin-only: edit/delete registrations (player info) and matches (draws) ---

@app.patch("/registrations/{registration_id}")
def update_registration(registration_id: str, body: UpdateRegistrationBody) -> dict[str, Any]:
    """Update a registration (player info). Admin only – call from admin UI only."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    payload = body.model_dump(exclude_unset=True)
    if not payload:
        return {"message": "No changes", "id": registration_id}
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
