"""
Supabase data-access layer for the DKT pipeline.

Uses the service-role key (bypasses RLS) so the training pipeline can
read all users' interaction events in bulk.
"""

from __future__ import annotations

from datetime import datetime, timezone
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
                "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
            )
        _client = create_client(url, key)
        logger.info("Supabase admin client initialised")
    return _client


# ── Interaction events ──────────────────────────────────────────────────────

# Columns we need for training (avoids SELECT *)
_EVENT_COLUMNS = (
    "id, user_id, word_id, grammar_concept_id, module_source, correct, "
    "response_time_ms, session_id, session_sequence_number, time_of_day, "
    "day_of_week, days_since_last_review, days_since_last_session, "
    "consecutive_correct_in_session, session_fatigue_proxy, input_mode, "
    "created_at"
)


def fetch_all_events(
    *,
    since: datetime | None = None,
    batch_size: int = 5000,
) -> list[dict[str, Any]]:
    """
    Fetch interaction events for all users, optionally only those created
    after *since*.  Handles Supabase pagination internally.
    """
    client = get_client()
    all_rows: list[dict[str, Any]] = []
    offset = 0

    while True:
        q = (
            client.table("interaction_events")
            .select(_EVENT_COLUMNS)
            .order("created_at")
            .range(offset, offset + batch_size - 1)
        )
        if since is not None:
            q = q.gte("created_at", since.isoformat())

        resp = q.execute()
        rows = resp.data or []
        all_rows.extend(rows)
        logger.debug(f"Fetched {len(rows)} events (offset={offset})")

        if len(rows) < batch_size:
            break
        offset += batch_size

    logger.info(f"Total interaction events fetched: {len(all_rows)}")
    return all_rows


def fetch_user_events(user_id: str) -> list[dict[str, Any]]:
    """Fetch all events for a single user, ordered chronologically."""
    client = get_client()
    all_rows: list[dict[str, Any]] = []
    offset = 0
    batch_size = 2000

    while True:
        resp = (
            client.table("interaction_events")
            .select(_EVENT_COLUMNS)
            .eq("user_id", user_id)
            .order("created_at")
            .range(offset, offset + batch_size - 1)
            .execute()
        )
        rows = resp.data or []
        all_rows.extend(rows)
        if len(rows) < batch_size:
            break
        offset += batch_size

    return all_rows


# ── User baselines ──────────────────────────────────────────────────────────


def fetch_user_baseline(user_id: str) -> dict[str, Any] | None:
    """Fetch the baseline stats for a single user."""
    client = get_client()
    resp = (
        client.table("user_baselines")
        .select("avg_response_time_ms, total_sessions, last_session_at")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return resp.data


def fetch_all_baselines() -> dict[str, dict[str, Any]]:
    """Fetch all user baselines, keyed by user_id."""
    client = get_client()
    all_rows: list[dict[str, Any]] = []
    offset = 0
    batch_size = 1000

    while True:
        resp = (
            client.table("user_baselines")
            .select("user_id, avg_response_time_ms, total_sessions")
            .range(offset, offset + batch_size - 1)
            .execute()
        )
        rows = resp.data or []
        all_rows.extend(rows)
        if len(rows) < batch_size:
            break
        offset += batch_size

    return {r["user_id"]: r for r in all_rows}


# ── User words ──────────────────────────────────────────────────────────────


def fetch_user_words(user_id: str) -> list[dict[str, Any]]:
    """Fetch all words for a user (id, word, part_of_speech, tags)."""
    client = get_client()
    resp = (
        client.table("user_words")
        .select("id, word, part_of_speech, tags")
        .eq("user_id", user_id)
        .execute()
    )
    return resp.data or []


def fetch_all_distinct_word_ids() -> list[str]:
    """
    Return every distinct word_id that has appeared in interaction_events.
    Used to build the vocabulary index.
    """
    client = get_client()
    # PostgREST doesn't support SELECT DISTINCT, so we use an RPC or
    # fallback to fetching with a limit.  For robustness, we paginate:
    word_ids: set[str] = set()
    offset = 0
    batch_size = 5000

    while True:
        resp = (
            client.table("interaction_events")
            .select("word_id")
            .not_.is_("word_id", "null")
            .order("word_id")
            .range(offset, offset + batch_size - 1)
            .execute()
        )
        rows = resp.data or []
        for r in rows:
            word_ids.add(r["word_id"])
        if len(rows) < batch_size:
            break
        offset += batch_size

    return sorted(word_ids)


# ── Grammar tags ────────────────────────────────────────────────────────────


def fetch_all_grammar_tags() -> list[dict[str, Any]]:
    """Fetch grammar lesson tags (id, title, cefr_level) for tag indexing."""
    client = get_client()
    resp = (
        client.table("grammar_lessons")
        .select("id, title, cefr_level")
        .execute()
    )
    return resp.data or []
