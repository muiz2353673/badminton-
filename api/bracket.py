"""
Single-elimination bracket generation.
Produces round_order, slot_in_round, and round labels for draw display.
"""
from __future__ import annotations

import math
from typing import Any, Optional


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
    standard: Optional[str],
    age_group: Optional[str],
    registration_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Build list of match payloads for a full single-elimination bracket.
    registration_rows: list of {id, full_name} from registrations (filtered by event + standard + age_group).
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
            "standard": standard,
            "age_group": age_group,
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
                "standard": standard,
                "age_group": age_group,
                "round": round_label(r, total_rounds),
                "round_order": r,
                "slot_in_round": s,
                "player1_id": None,
                "player2_id": None,
                "status": "scheduled",
            })

    return matches_to_insert


def generate_bracket_matches_doubles(
    tournament_id: str,
    event: str,
    standard: Optional[str],
    age_group: Optional[str],
    pairs: list[tuple[str, str]],
) -> list[dict[str, Any]]:
    """
    Build single-elimination bracket for doubles. Each entry is a pair (id1, id2).
    Match payloads include player1_id, player1_partner_id, player2_id, player2_partner_id.
    """
    n = len(pairs)
    if n < 2:
        return []

    total_rounds = max(1, math.ceil(math.log2(n)))
    first_round_slots = 2**total_rounds
    num_r1_matches = first_round_slots // 2

    matches_to_insert: list[dict[str, Any]] = []

    for m in range(num_r1_matches):
        pos1, pos2 = 2 * m, 2 * m + 1
        if pos1 >= n and pos2 >= n:
            continue
        pair1 = pairs[pos1] if pos1 < n else (None, None)
        pair2 = pairs[pos2] if pos2 < n else (None, None)
        slot = len([x for x in matches_to_insert if x.get("round_order") == 1])
        payload = {
            "tournament_id": tournament_id,
            "event": event,
            "standard": standard,
            "age_group": age_group,
            "round": round_label(1, total_rounds),
            "round_order": 1,
            "slot_in_round": slot,
            "player1_id": str(pair1[0]) if pair1[0] else None,
            "player1_partner_id": str(pair1[1]) if pair1[1] else None,
            "player2_id": str(pair2[0]) if pair2[0] else None,
            "player2_partner_id": str(pair2[1]) if pair2[1] else None,
            "status": "scheduled",
        }
        matches_to_insert.append(payload)

    for r in range(2, total_rounds + 1):
        num_matches = 2 ** (total_rounds - r)
        for s in range(num_matches):
            matches_to_insert.append({
                "tournament_id": tournament_id,
                "event": event,
                "standard": standard,
                "age_group": age_group,
                "round": round_label(r, total_rounds),
                "round_order": r,
                "slot_in_round": s,
                "player1_id": None,
                "player1_partner_id": None,
                "player2_id": None,
                "player2_partner_id": None,
                "status": "scheduled",
            })

    return matches_to_insert
