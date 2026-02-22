"""
Supabase data-access layer for the Complexity Level Predictor.

Uses the service-role key (bypasses RLS) for server-to-server access.
"""

from __future__ import annotations

from typing import Any

from loguru import logger
from supabase import Client, create_client

from ..config import settings

_client: Client | None = None


def get_client() -> Client:
    """Lazily initialise and return the Supabase admin client."""
    global _client
    if _client is None:
        url = settings.supabase.url
        key = settings.supabase.service_role_key
        if not url or not key:
            raise RuntimeError(
                "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. "
                "Check your .env / .env.local files."
            )
        _client = create_client(url, key)
        logger.info("Supabase admin client initialised (complexity_predictor)")
    return _client


# ── Feature extraction ──────────────────────────────────────────────────────


def get_user_session_features(user_id: str) -> dict[str, Any] | None:
    """
    Call the get_user_session_features Postgres function to extract
    all features for the complexity predictor in a single round-trip.

    Returns a dict with:
      - days_since_last_session: float | None
      - last_session_cognitive_load: float
      - last_session_completion_rate: float
      - current_streak_days: int
      - avg_performance_last_7_days: float
      - total_sessions: int
      - avg_session_duration_ms: float
      - avg_session_word_count: float
    """
    client = get_client()
    resp = client.rpc(
        "get_user_session_features",
        {"p_user_id": user_id},
    ).execute()

    if not resp.data:
        return None

    # The RPC returns a list; take the first row
    row = resp.data[0] if isinstance(resp.data, list) else resp.data
    return row


# ── Labelled sessions for training ──────────────────────────────────────────


def fetch_labelled_sessions(
    min_sessions: int = 0,
    limit: int = 50000,
) -> list[dict[str, Any]]:
    """
    Fetch labelled historical sessions via the get_labelled_sessions RPC.
    Used by the training pipeline to build the dataset.
    """
    client = get_client()
    resp = client.rpc(
        "get_labelled_sessions",
        {"p_min_sessions": min_sessions, "p_limit": limit},
    ).execute()

    rows = resp.data or []
    logger.info(f"Fetched {len(rows)} labelled sessions for training")
    return rows


# ── Store session plan ──────────────────────────────────────────────────────


def save_session_plan(
    user_id: str,
    complexity_level: int,
    word_count: int,
    duration_minutes: float,
    confidence: float,
    input_features: dict[str, Any],
    model_version: str = "v0.1.0",
) -> str | None:
    """
    Persist a session plan prediction for audit trails and future training labels.
    Returns the plan ID.
    """
    client = get_client()
    resp = (
        client.table("session_plans")
        .insert({
            "user_id": user_id,
            "predicted_complexity_level": complexity_level,
            "recommended_word_count": word_count,
            "recommended_duration_minutes": round(duration_minutes, 1),
            "confidence": round(confidence, 4),
            "input_features": input_features,
            "model_version": model_version,
        })
        .execute()
    )
    if resp.data:
        plan_id = resp.data[0]["id"]
        logger.debug(f"Saved session plan {plan_id} for user {user_id}")
        return plan_id
    return None


# ── Recent session history for streak computation ───────────────────────────


def get_recent_sessions(
    user_id: str, days: int = 30
) -> list[dict[str, Any]]:
    """
    Fetch recent session summaries for a user.
    Used for computing streaks and recent performance in Python.
    """
    client = get_client()
    resp = (
        client.table("session_summaries")
        .select(
            "session_id, user_id, module_source, total_words, correct_count, "
            "completed_session, session_duration_ms, estimated_cognitive_load, "
            "started_at, ended_at"
        )
        .eq("user_id", user_id)
        .not_.is_("ended_at", "null")
        .order("started_at", desc=True)
        .limit(100)
        .execute()
    )
    return resp.data or []
