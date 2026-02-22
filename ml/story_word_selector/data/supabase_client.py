"""
Supabase data-access layer for the Story Word Selector.

Uses the service-role key (bypasses RLS) to read user words, session data,
topic preferences, and interaction history.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
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
        logger.info("Supabase admin client initialised (story-word-selector)")
    return _client


# ── User words ──────────────────────────────────────────────────────────────

_USER_WORD_COLUMNS = (
    "id, user_id, word, lemma, language, status, ease_factor, interval, "
    "repetitions, next_review, last_reviewed, frequency_rank, "
    "exposure_count, production_score, pronunciation_score, tags, "
    "story_introduction_threshold, last_propel_module, last_propel_review_at, "
    "created_at, updated_at"
)


def fetch_user_words(user_id: str, language: str = "fr") -> list[dict[str, Any]]:
    """Fetch all user_words for a given user and language."""
    client = get_client()
    result = (
        client.table("user_words")
        .select(_USER_WORD_COLUMNS)
        .eq("user_id", user_id)
        .eq("language", language)
        .order("next_review", desc=False)
        .execute()
    )
    return result.data or []


# ── Recent sessions ─────────────────────────────────────────────────────────


def fetch_recent_session_word_ids(
    user_id: str, session_count: int = 2
) -> list[set[str]]:
    """
    Fetch the word IDs reviewed in the N most recent sessions.
    Returns a list of sets, most-recent first.
    """
    client = get_client()
    result = (
        client.table("session_summaries")
        .select("session_id, words_reviewed_ids")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(session_count)
        .execute()
    )

    sessions: list[set[str]] = []
    for row in result.data or []:
        word_ids = row.get("words_reviewed_ids") or []
        sessions.append(set(word_ids))
    return sessions


# ── Story-mode recency ──────────────────────────────────────────────────────


def fetch_story_mode_word_ids(user_id: str, days: int = 7) -> set[str]:
    """
    Fetch word IDs that appeared in story_engine interactions in the last N days.
    Used for the moduleVarietyBonus signal.
    """
    client = get_client()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    result = (
        client.table("interaction_events")
        .select("word_id")
        .eq("user_id", user_id)
        .eq("module_source", "story_engine")
        .gte("created_at", cutoff)
        .execute()
    )

    return {row["word_id"] for row in (result.data or []) if row.get("word_id")}


# ── Topic preferences ──────────────────────────────────────────────────────


def fetch_user_topic_preferences(user_id: str) -> dict[str, Any] | None:
    """
    Fetch the user's topic preference embedding from the
    user_topic_preferences table. Returns None if not found.
    """
    client = get_client()
    result = (
        client.table("user_topic_preferences")
        .select("*")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data


def upsert_topic_preferences(
    user_id: str,
    preference_vector: list[float],
    selected_topics: list[str],
    topic_engagement: dict[str, float],
) -> None:
    """Upsert the user's topic preference embedding."""
    client = get_client()
    client.table("user_topic_preferences").upsert(
        {
            "user_id": user_id,
            "preference_vector": preference_vector,
            "selected_topics": selected_topics,
            "topic_engagement": topic_engagement,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="user_id",
    ).execute()


# ── Story segment engagement ───────────────────────────────────────────────


def fetch_story_segment_engagement(user_id: str) -> list[dict[str, Any]]:
    """
    Fetch per-story engagement data (time_on_segment_ms, topic_tags)
    from story_segment_engagement table.
    """
    client = get_client()
    result = (
        client.table("story_segment_engagement")
        .select("story_id, topic_tags, time_on_segment_ms, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    return result.data or []


# ── Vocabulary topic tags ──────────────────────────────────────────────────


def fetch_word_topic_tags(word_ids: list[str]) -> dict[str, list[str]]:
    """
    Fetch the topic tags for a batch of word IDs from the vocabulary table.
    Returns a mapping of word_id → list of topic tags.
    """
    if not word_ids:
        return {}

    client = get_client()
    # We need user_words.id → vocabulary.topic_tags via the word/lemma link
    # For simplicity, query user_words tags field directly
    result = (
        client.table("user_words")
        .select("id, tags")
        .in_("id", word_ids)
        .execute()
    )

    return {
        row["id"]: row.get("tags") or []
        for row in (result.data or [])
    }
