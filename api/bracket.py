"""
Single-elimination bracket generation.
Produces round_order, slot_in_round, and round labels for draw display.
"""
import math
from typing import Any


def round_label(round_order: int, total_rounds: int) -> str:
    if round_order == 1:
        return "Round 1"
    if round_order == total_rounds:
        return "Final"
    if round_order == total_rounds - 1 and total_rounds >= 3:
        return "Semi-final"
    if round_order == total_rounds - 2 and total_rounds >= 4:
        return "Quarter-final"
    return f"Round {round_order}"


def generate_bracket_matches(
    tournament_id: str,
    event: str,
    registration_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Build list of match payloads for a full single-elimination bracket.
    registration_rows: list of {id, full_name} from registrations.
    """
    players = [r["id"] for r in registration_rows]
    n = len(players)
    if n < 2:
        return []

    total_rounds = max(1, math.ceil(math.log2(n)))
    first_round_slots = 2**total_rounds  # positions 0..first_round_slots-1
    num_r1_matches = first_round_slots // 2

    matches_to_insert: list[dict[str, Any]] = []

    # Round 1: assign players to positions; byes are positions >= n
    for m in range(num_r1_matches):
        pos1, pos2 = 2 * m, 2 * m + 1
        if pos1 >= n and pos2 >= n:
            continue  # double bye – no match
        p1 = str(registration_rows[pos1]["id"]) if pos1 < n else None
        p2 = str(registration_rows[pos2]["id"]) if pos2 < n else None
        slot = len([x for x in matches_to_insert if x.get("round_order") == 1])
        matches_to_insert.append({
            "tournament_id": tournament_id,
            "event": event,
            "round": round_label(1, total_rounds),
            "round_order": 1,
            "slot_in_round": slot,
            "player1_id": p1,
            "player2_id": p2,
            "status": "scheduled",
        })

    # Later rounds: empty slots, filled when results come in
    for r in range(2, total_rounds + 1):
        num_matches = 2 ** (total_rounds - r)
        for s in range(num_matches):
            matches_to_insert.append({
                "tournament_id": tournament_id,
                "event": event,
                "round": round_label(r, total_rounds),
                "round_order": r,
                "slot_in_round": s,
                "player1_id": None,
                "player2_id": None,
                "status": "scheduled",
            })

    return matches_to_insert
