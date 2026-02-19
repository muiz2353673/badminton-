"""
Tournament API – FastAPI backend.
Uses Supabase (service role) for DB. Run: uvicorn main:app --reload --port 8000
"""
import os
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel

app = FastAPI(title="Tournament API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Tournament API", "docs": "/docs"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/generate-bracket")
def generate_bracket(body: GenerateBracketRequest) -> dict[str, Any]:
    """Placeholder: generate a simple bracket from registrations for an event."""
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    # Fetch registrations for this tournament + event
    r = (
        supabase.table("registrations")
        .select("id, full_name")
        .eq("tournament_id", body.tournament_id)
        .eq("event", body.event)
        .execute()
    )
    rows = r.data or []
    if len(rows) < 2:
        return {"message": "Not enough players", "count": len(rows), "matches": []}
    # Simple first-round pairing (no seeding)
    matches = []
    for i in range(0, len(rows) - 1, 2):
        p1, p2 = rows[i], rows[i + 1]
        ins = (
            supabase.table("matches")
            .insert(
                {
                    "tournament_id": body.tournament_id,
                    "event": body.event,
                    "round": "Round 1",
                    "player1_id": p1["id"],
                    "player2_id": p2["id"],
                    "status": "scheduled",
                }
            )
            .execute()
        )
        if ins.data:
            matches.append(ins.data[0])
    return {"message": "Bracket generated", "count": len(rows), "matches_created": len(matches), "matches": matches}
