"""
Supabase data-access layer for the LLM Feedback Generator.

Uses the service-role key (bypasses RLS) for server-to-server access.
Fetches user profiles, word data, interaction history, and known vocabulary
needed to build LLM prompts.
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
        logger.info("Supabase admin client initialised (feedback_generator)")
    return _client


# ── User profile ────────────────────────────────────────────────────────────


def get_user_profile(user_id: str) -> dict[str, Any] | None:
    """
    Fetch the user's profile for language context.
    Returns: target_language, native_language, proficiency_level
    """
    client = get_client()
    resp = (
        client.table("profiles")
        .select("target_language, native_language, proficiency_level")
        .eq("id", user_id)
        .single()
        .execute()
    )
    return resp.data


# ── Word data ───────────────────────────────────────────────────────────────


def get_word_details(word_id: str) -> dict[str, Any] | None:
    """
    Fetch full details of a user_word including knowledge-graph columns.
    """
    client = get_client()
    resp = (
        client.table("user_words")
        .select(
            "id, user_id, word, lemma, language, status, rating, "
            "ease_factor, interval, repetitions, next_review, "
            "exposure_count, production_score, pronunciation_score, "
            "tags, frequency_rank, part_of_speech, context_sentence"
        )
        .eq("id", word_id)
        .single()
        .execute()
    )
    return resp.data


def get_word_translation(word: str, language: str) -> str | None:
    """
    Look up the translation from the vocab (master) table.
    Returns the translated string or None.
    """
    client = get_client()
    resp = (
        client.table("vocab")
        .select("translation")
        .eq("word", word)
        .eq("language", language)
        .limit(1)
        .execute()
    )
    if resp.data:
        return resp.data[0].get("translation")
    return None


# ── Interaction history ─────────────────────────────────────────────────────


def get_session_interactions_for_word(
    user_id: str,
    word_id: str,
    session_id: str,
) -> list[dict[str, Any]]:
    """
    Fetch all interaction events for a specific word within a session.
    Used to count errors and detect in-session repetition.
    """
    client = get_client()
    resp = (
        client.table("interaction_events")
        .select(
            "id, correct, response_time_ms, module_source, input_mode, "
            "session_sequence_number, created_at"
        )
        .eq("user_id", user_id)
        .eq("word_id", word_id)
        .eq("session_id", session_id)
        .order("session_sequence_number", desc=False)
        .execute()
    )
    return resp.data or []


def get_module_history_for_word(
    user_id: str,
    word_id: str,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """
    Fetch cross-module review history for a word.
    Used by the error-pattern detector to analyse which modules the user
    gets the word right/wrong on, plus response times.
    """
    client = get_client()
    resp = (
        client.table("module_review_history")
        .select(
            "module_source, correct, response_time_ms, rating, "
            "ease_factor_after, status_after, created_at"
        )
        .eq("user_id", user_id)
        .eq("word_id", word_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return resp.data or []


def get_all_interaction_events_for_word(
    user_id: str,
    word_id: str,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """
    Fetch interaction events across all sessions for a word.
    Used for broader pattern detection (input_mode analysis).
    """
    client = get_client()
    resp = (
        client.table("interaction_events")
        .select(
            "correct, response_time_ms, module_source, input_mode, "
            "session_id, story_complexity_level, created_at"
        )
        .eq("user_id", user_id)
        .eq("word_id", word_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return resp.data or []


# ── Known vocabulary ────────────────────────────────────────────────────────


def get_known_words(
    user_id: str,
    language: str,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """
    Fetch words the user knows well (status = 'known' or 'mastered')
    sorted by highest ease_factor. Used for building analogies.
    """
    client = get_client()
    resp = (
        client.table("user_words")
        .select("id, word, lemma, part_of_speech, tags, ease_factor")
        .eq("user_id", user_id)
        .eq("language", language)
        .in_("status", ["known", "mastered"])
        .order("ease_factor", desc=True)
        .limit(limit)
        .execute()
    )
    return resp.data or []


def get_known_words_by_ids(
    word_ids: list[str],
) -> list[dict[str, Any]]:
    """
    Fetch specific user_words by their IDs.
    Used by grammar-examples endpoint when caller provides knownWordIds.
    """
    if not word_ids:
        return []
    client = get_client()
    resp = (
        client.table("user_words")
        .select("id, word, lemma, language, part_of_speech, status")
        .in_("id", word_ids)
        .execute()
    )
    return resp.data or []


# ── Grammar ─────────────────────────────────────────────────────────────────


def get_grammar_lesson(concept_tag: str) -> dict[str, Any] | None:
    """
    Fetch a grammar lesson by its concept tag.
    """
    client = get_client()
    resp = (
        client.table("grammar_lessons")
        .select("id, title, concept_tag, level, explanation, examples")
        .eq("concept_tag", concept_tag)
        .limit(1)
        .execute()
    )
    if resp.data:
        return resp.data[0]
    return None


# ── Feedback cache ──────────────────────────────────────────────────────────


def get_cached_feedback(
    user_id: str,
    word_id: str,
    pattern_detected: str,
) -> dict[str, Any] | None:
    """
    Check if we already generated feedback for this user+word+pattern combo
    recently (within 24 hours).
    """
    client = get_client()
    resp = (
        client.table("llm_feedback_cache")
        .select("*")
        .eq("user_id", user_id)
        .eq("word_id", word_id)
        .eq("pattern_detected", pattern_detected)
        .gte("created_at", "now() - interval '24 hours'")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if resp.data:
        return resp.data[0]
    return None


def save_feedback(
    user_id: str,
    word_id: str,
    session_id: str | None,
    pattern_detected: str,
    explanation: str,
    example_sentence: str,
    prompt_used: str,
    llm_provider: str,
    llm_model: str,
    latency_ms: int,
) -> str | None:
    """
    Store generated feedback for caching and audit.
    Returns the new row ID.
    """
    client = get_client()
    resp = (
        client.table("llm_feedback_cache")
        .insert(
            {
                "user_id": user_id,
                "word_id": word_id,
                "session_id": session_id,
                "pattern_detected": pattern_detected,
                "explanation": explanation,
                "example_sentence": example_sentence,
                "prompt_used": prompt_used,
                "llm_provider": llm_provider,
                "llm_model": llm_model,
                "latency_ms": latency_ms,
            }
        )
        .execute()
    )
    if resp.data:
        return resp.data[0].get("id")
    return None


def save_grammar_examples(
    user_id: str,
    grammar_concept_tag: str,
    sentences: list[str],
    prompt_used: str,
    llm_provider: str,
    llm_model: str,
    latency_ms: int,
) -> str | None:
    """
    Store generated grammar example sentences for caching.
    """
    client = get_client()
    resp = (
        client.table("llm_grammar_examples_cache")
        .insert(
            {
                "user_id": user_id,
                "grammar_concept_tag": grammar_concept_tag,
                "sentences": sentences,
                "prompt_used": prompt_used,
                "llm_provider": llm_provider,
                "llm_model": llm_model,
                "latency_ms": latency_ms,
            }
        )
        .execute()
    )
    if resp.data:
        return resp.data[0].get("id")
    return None
