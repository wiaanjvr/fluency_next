"""
Data access layer for cognitive load estimation.

Fetches interaction events, baselines, and word metadata from Supabase.
"""

from __future__ import annotations

from typing import Any

from loguru import logger

from . import get_supabase
from ..config import settings


# ---------------------------------------------------------------------------
# User baselines
# ---------------------------------------------------------------------------


def get_user_baseline(user_id: str) -> dict[str, Any]:
    """Fetch the user-level response-time baseline."""
    sb = get_supabase()
    resp = (
        sb.table("user_baselines")
        .select("*")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if resp.data:
        return resp.data
    return {
        "user_id": user_id,
        "avg_response_time_ms": settings.cognitive_load.default_baseline_ms,
        "total_sessions": 0,
        "last_session_at": None,
    }


def get_module_baselines(user_id: str) -> dict[str, float]:
    """
    Fetch per-module average response times for a user.

    Returns: { module_source: avg_response_time_ms }
    Falls back to the global baseline for modules with no data.
    """
    sb = get_supabase()
    global_baseline = get_user_baseline(user_id)["avg_response_time_ms"]

    # Aggregate from interaction_events grouped by module_source
    resp = (
        sb.rpc(
            "get_user_module_baselines",
            {"p_user_id": user_id},
        ).execute()
    )

    result: dict[str, float] = {}
    if resp.data:
        for row in resp.data:
            result[row["module_source"]] = row["avg_response_time_ms"]

    return result


def get_difficulty_bucket_baselines(
    user_id: str,
) -> dict[str, dict[str, float]]:
    """
    Fetch per-module + per-difficulty-bucket average response times.

    Returns: { module_source: { bucket: avg_response_time_ms } }
    """
    sb = get_supabase()

    resp = (
        sb.rpc(
            "get_user_difficulty_baselines",
            {"p_user_id": user_id},
        ).execute()
    )

    result: dict[str, dict[str, float]] = {}
    if resp.data:
        for row in resp.data:
            mod = row["module_source"]
            bucket = row["word_status"]
            if mod not in result:
                result[mod] = {}
            result[mod][bucket] = row["avg_response_time_ms"]

    return result


# ---------------------------------------------------------------------------
# Session events
# ---------------------------------------------------------------------------


def get_session_events(session_id: str) -> list[dict[str, Any]]:
    """Fetch all interaction events for a session, ordered by sequence."""
    sb = get_supabase()
    resp = (
        sb.table("interaction_events")
        .select(
            "id, word_id, module_source, correct, response_time_ms, "
            "session_fatigue_proxy, session_sequence_number, created_at"
        )
        .eq("session_id", session_id)
        .order("session_sequence_number", desc=False)
        .execute()
    )
    return resp.data or []


def get_session_summary(session_id: str) -> dict[str, Any] | None:
    """Fetch the session summary row."""
    sb = get_supabase()
    resp = (
        sb.table("session_summaries")
        .select("*")
        .eq("session_id", session_id)
        .maybe_single()
        .execute()
    )
    return resp.data


def get_word_statuses(user_id: str, word_ids: list[str]) -> dict[str, str]:
    """
    Look up the status (new/learning/known/mastered) for a list of word_ids.

    Returns: { word_id: status }
    """
    if not word_ids:
        return {}

    sb = get_supabase()
    resp = (
        sb.table("user_words")
        .select("id, status")
        .eq("user_id", user_id)
        .in_("id", word_ids)
        .execute()
    )

    return {row["id"]: row["status"] for row in (resp.data or [])}


# ---------------------------------------------------------------------------
# Write: update session summary with cognitive load
# ---------------------------------------------------------------------------


def update_session_cognitive_load(
    session_id: str,
    estimated_cognitive_load: float,
) -> None:
    """Write the final estimated cognitive load to the session summary."""
    sb = get_supabase()
    sb.table("session_summaries").update(
        {"estimated_cognitive_load": round(estimated_cognitive_load, 4)}
    ).eq("session_id", session_id).execute()
    logger.debug(
        f"Updated session {session_id} cognitive load → {estimated_cognitive_load:.3f}"
    )
