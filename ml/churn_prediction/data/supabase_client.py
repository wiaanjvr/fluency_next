"""
Supabase data-access layer for the Churn Prediction & Engagement Rescue service.

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
        logger.info("Supabase admin client initialised (churn_prediction)")
    return _client


# ── Training data retrieval ─────────────────────────────────────────────────


def fetch_pre_session_training_data(
    lookback_days: int = 90,
) -> list[dict[str, Any]]:
    """
    Fetch pre-session churn training data via the SQL function.
    Returns rows with features + did_not_session_today label.
    """
    client = get_client()
    resp = client.rpc(
        "get_pre_session_training_data",
        {"p_lookback_days": lookback_days},
    ).execute()

    rows = resp.data or []
    logger.info(
        f"Fetched {len(rows)} pre-session training samples "
        f"(lookback={lookback_days} days)"
    )
    return rows


def fetch_mid_session_training_data(
    min_session_words: int = 5,
) -> list[dict[str, Any]]:
    """
    Fetch mid-session abandonment training data via the SQL function.
    Returns snapshot rows with features + abandoned_session label.
    """
    client = get_client()
    resp = client.rpc(
        "get_mid_session_training_data",
        {"p_min_session_words": min_session_words},
    ).execute()

    rows = resp.data or []
    logger.info(
        f"Fetched {len(rows)} mid-session training snapshots "
        f"(min_words={min_session_words})"
    )
    return rows


# ── Live feature retrieval ──────────────────────────────────────────────────


def fetch_user_pre_session_features(user_id: str) -> dict[str, Any] | None:
    """
    Fetch real-time pre-session features for a single user.
    Computes days_since_last_session, streak, last session stats, etc.
    """
    client = get_client()

    # Get last session info
    last_session_resp = (
        client.table("session_summaries")
        .select(
            "session_id, started_at, ended_at, completed_session, "
            "estimated_cognitive_load"
        )
        .eq("user_id", user_id)
        .order("started_at", desc=True)
        .limit(1)
        .execute()
    )

    if not last_session_resp.data:
        return None

    last_session = last_session_resp.data[0]

    # Count sessions in last 4 weeks for weekly average
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    four_weeks_ago = (now - timedelta(days=28)).isoformat()

    sessions_4w_resp = (
        client.table("session_summaries")
        .select("session_id", count="exact")
        .eq("user_id", user_id)
        .gte("started_at", four_weeks_ago)
        .execute()
    )
    sessions_in_4w = sessions_4w_resp.count or 0

    # Compute streak: count consecutive days with sessions going backward
    recent_sessions_resp = (
        client.table("session_summaries")
        .select("started_at")
        .eq("user_id", user_id)
        .order("started_at", desc=True)
        .limit(60)
        .execute()
    )

    streak = 0
    if recent_sessions_resp.data:
        session_dates: set[str] = set()
        for row in recent_sessions_resp.data:
            dt = datetime.fromisoformat(row["started_at"].replace("Z", "+00:00"))
            session_dates.add(dt.strftime("%Y-%m-%d"))

        check_date = now.date() - timedelta(days=1)  # Start from yesterday
        while check_date.strftime("%Y-%m-%d") in session_dates:
            streak += 1
            check_date -= timedelta(days=1)

    # Days since last session
    last_started = datetime.fromisoformat(
        last_session["started_at"].replace("Z", "+00:00")
    )
    days_since = (now - last_started).total_seconds() / 86400.0

    return {
        "days_since_last_session": round(days_since, 2),
        "current_streak_days": streak,
        "last_session_cognitive_load": last_session.get(
            "estimated_cognitive_load"
        ) or 0.5,
        "last_session_completion": last_session.get("completed_session", False),
        "average_sessions_per_week": round(sessions_in_4w / 4.0, 2),
        "day_of_week": now.weekday(),  # 0=Monday in Python
        "time_of_day": _get_time_bucket(now.hour),
    }


def fetch_mid_session_features(
    user_id: str,
    session_id: str,
    words_completed_so_far: int,
) -> dict[str, Any] | None:
    """
    Fetch real-time mid-session features for a running session.
    """
    client = get_client()
    from datetime import datetime, timezone

    # Get session summary for total words and start time
    session_resp = (
        client.table("session_summaries")
        .select("total_words, started_at, estimated_cognitive_load")
        .eq("session_id", session_id)
        .limit(1)
        .execute()
    )

    # Get recent events in this session
    events_resp = (
        client.table("interaction_events")
        .select("correct, response_time_ms, session_sequence_number, created_at")
        .eq("session_id", session_id)
        .order("session_sequence_number", desc=False)
        .limit(words_completed_so_far)
        .execute()
    )

    events = events_resp.data or []
    if not events:
        return None

    # Compute consecutive errors (trailing streak of incorrect)
    consecutive_errors = 0
    for e in reversed(events):
        if not e.get("correct", True):
            consecutive_errors += 1
        else:
            break

    # Response time trend: avg of last 3 - avg of first 3
    response_times = [
        e["response_time_ms"] for e in events if e.get("response_time_ms")
    ]
    if len(response_times) >= 3:
        first_3_avg = sum(response_times[:3]) / 3
        last_3_avg = sum(response_times[-3:]) / 3
        rt_trend = last_3_avg - first_3_avg
    else:
        rt_trend = 0.0

    # Session duration so far
    now = datetime.now(timezone.utc)
    if session_resp.data:
        session_info = session_resp.data[0]
        started_at = datetime.fromisoformat(
            session_info["started_at"].replace("Z", "+00:00")
        )
        duration_ms = (now - started_at).total_seconds() * 1000
        total_words = session_info.get("total_words") or (
            words_completed_so_far * 2
        )  # estimate if not set
        cognitive_load = session_info.get("estimated_cognitive_load") or 0.5
    else:
        duration_ms = 0.0
        total_words = words_completed_so_far * 2
        cognitive_load = 0.5

    words_remaining = max(total_words - words_completed_so_far, 0)

    return {
        "consecutive_errors": consecutive_errors,
        "response_time_trend": round(rt_trend, 2),
        "session_duration_so_far_ms": round(duration_ms, 2),
        "cognitive_load": cognitive_load,
        "words_remaining_in_session": words_remaining,
    }


def fetch_user_stats_for_notification(user_id: str) -> dict[str, Any]:
    """Fetch stats for personalised notification hooks."""
    client = get_client()

    # Total unique words seen
    words_resp = (
        client.table("interaction_events")
        .select("word_id", count="exact")
        .eq("user_id", user_id)
        .not_.is_("word_id", "null")
        .execute()
    )

    # User's target language from profile
    profile_resp = (
        client.table("profiles")
        .select("target_language, proficiency_level")
        .eq("id", user_id)
        .single()
        .execute()
    )

    # Current streak (already computed in pre-session features)
    return {
        "total_words_seen": words_resp.count or 0,
        "target_language": (
            profile_resp.data.get("target_language", "your language")
            if profile_resp.data
            else "your language"
        ),
    }


# ── Prediction persistence ──────────────────────────────────────────────────


def save_churn_prediction(
    user_id: str,
    churn_probability: float,
    trigger_notification: bool,
    notification_hook: str | None,
    features: dict[str, Any],
    model_version: str = "v0.1.0",
) -> str | None:
    """Persist a pre-session churn prediction. Returns the record ID."""
    client = get_client()
    try:
        resp = (
            client.table("churn_predictions")
            .upsert(
                {
                    "user_id": user_id,
                    "churn_probability": churn_probability,
                    "trigger_notification": trigger_notification,
                    "notification_hook": notification_hook,
                    "model_version": model_version,
                    "features": features,
                },
                on_conflict="user_id,prediction_date",
            )
            .execute()
        )
        if resp.data:
            return resp.data[0].get("id")
    except Exception as exc:
        logger.warning(f"Failed to save churn prediction: {exc}")
    return None


def save_abandonment_snapshot(
    user_id: str,
    session_id: str,
    words_completed_so_far: int,
    abandonment_probability: float,
    recommended_intervention: str | None,
    features: dict[str, Any],
    model_version: str = "v0.1.0",
) -> str | None:
    """Persist a mid-session abandonment snapshot. Returns the record ID."""
    client = get_client()
    try:
        resp = (
            client.table("session_abandonment_snapshots")
            .insert(
                {
                    "user_id": user_id,
                    "session_id": session_id,
                    "words_completed_so_far": words_completed_so_far,
                    "abandonment_probability": abandonment_probability,
                    "recommended_intervention": recommended_intervention,
                    "features": features,
                    "model_version": model_version,
                }
            )
            .execute()
        )
        if resp.data:
            return resp.data[0].get("id")
    except Exception as exc:
        logger.warning(f"Failed to save abandonment snapshot: {exc}")
    return None


def save_rescue_intervention(
    user_id: str,
    session_id: str,
    intervention_type: str,
    trigger_probability: float,
    intervention_payload: dict[str, Any],
) -> str | None:
    """Log a rescue intervention action. Returns the record ID."""
    client = get_client()
    try:
        resp = (
            client.table("rescue_interventions")
            .insert(
                {
                    "user_id": user_id,
                    "session_id": session_id,
                    "intervention_type": intervention_type,
                    "trigger_probability": trigger_probability,
                    "intervention_payload": intervention_payload,
                }
            )
            .execute()
        )
        if resp.data:
            return resp.data[0].get("id")
    except Exception as exc:
        logger.warning(f"Failed to save rescue intervention: {exc}")
    return None


# ── Helpers ─────────────────────────────────────────────────────────────────


def _get_time_bucket(hour: int) -> str:
    """Map hour of day to a time-of-day bucket."""
    if 5 <= hour < 12:
        return "morning"
    elif 12 <= hour < 17:
        return "afternoon"
    elif 17 <= hour < 21:
        return "evening"
    else:
        return "night"
