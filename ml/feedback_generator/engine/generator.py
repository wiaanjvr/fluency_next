"""
Feedback Generator — Main orchestrator.

Ties together:
  - Data fetching (supabase_client)
  - Trigger checking (trigger_checker)
  - Error pattern detection (pattern_detector)
  - Prompt building (prompt_engine)
  - LLM invocation (llm_client)
  - Response caching (supabase_client)
"""

from __future__ import annotations

from typing import Any

from loguru import logger

from ..data.supabase_client import (
    get_all_interaction_events_for_word,
    get_cached_feedback,
    get_grammar_lesson,
    get_known_words,
    get_known_words_by_ids,
    get_module_history_for_word,
    get_session_interactions_for_word,
    get_user_profile,
    get_word_details,
    get_word_translation,
    save_feedback,
    save_grammar_examples,
)
from .llm_client import get_llm_client
from .pattern_detector import detect_error_pattern
from .prompt_engine import (
    build_explain_prompt,
    build_grammar_examples_prompt,
    parse_explain_response,
    parse_grammar_examples_response,
)
from .trigger_checker import check_trigger


async def generate_explanation(
    user_id: str,
    word_id: str,
    session_id: str,
    force: bool = False,
) -> dict[str, Any]:
    """
    Full pipeline for generating a word-error explanation.

    1. Fetch user profile + word data
    2. Check trigger conditions (unless force=True)
    3. Detect error pattern
    4. Check cache
    5. Build prompt → call LLM
    6. Parse response, cache, and return

    Returns:
        {
            "explanation": str,
            "exampleSentence": str,
            "patternDetected": str,
            "patternDescription": str,
            "patternConfidence": float,
            "triggerReason": str,
            "cached": bool,
            "llmProvider": str,
            "llmModel": str,
            "latencyMs": int
        }
    """
    # ── 1. Fetch data ────────────────────────────────────────────────────
    profile = get_user_profile(user_id)
    if not profile:
        raise ValueError(f"User profile not found: {user_id}")

    word = get_word_details(word_id)
    if not word:
        raise ValueError(f"Word not found: {word_id}")

    session_interactions = get_session_interactions_for_word(
        user_id, word_id, session_id
    )

    # ── 2. Check triggers ────────────────────────────────────────────────
    if not force:
        trigger = check_trigger(word, session_interactions)
        if not trigger.should_fire:
            return {
                "explanation": "",
                "exampleSentence": "",
                "patternDetected": "none",
                "patternDescription": "",
                "patternConfidence": 0.0,
                "triggerReason": trigger.reason,
                "cached": False,
                "llmProvider": "",
                "llmModel": "",
                "latencyMs": 0,
                "triggered": False,
            }
        trigger_reason = trigger.reason
    else:
        trigger_reason = "forced"

    # ── 3. Detect error pattern ──────────────────────────────────────────
    module_history = get_module_history_for_word(user_id, word_id)
    all_events = get_all_interaction_events_for_word(user_id, word_id)
    pattern = detect_error_pattern(module_history, all_events)

    # ── 4. Check cache ───────────────────────────────────────────────────
    cached = get_cached_feedback(user_id, word_id, pattern.pattern)
    if cached:
        logger.info(
            f"Cache hit for user={user_id}, word={word_id}, "
            f"pattern={pattern.pattern}"
        )
        return {
            "explanation": cached.get("explanation", ""),
            "exampleSentence": cached.get("example_sentence", ""),
            "patternDetected": pattern.pattern,
            "patternDescription": pattern.description,
            "patternConfidence": pattern.confidence,
            "triggerReason": trigger_reason,
            "cached": True,
            "llmProvider": cached.get("llm_provider", ""),
            "llmModel": cached.get("llm_model", ""),
            "latencyMs": 0,
            "triggered": True,
        }

    # ── 5. Build prompt + call LLM ───────────────────────────────────────
    target_lang = profile.get("target_language", "fr")
    native_lang = profile.get("native_language", "en")
    cefr_level = profile.get("proficiency_level", "A1")

    # Fetch translation
    translation = get_word_translation(word["word"], target_lang)

    # Fetch known similar words for analogy
    known_words_data = get_known_words(user_id, target_lang, limit=20)
    # Filter to same POS if possible
    word_pos = word.get("part_of_speech")
    if word_pos:
        same_pos = [w["word"] for w in known_words_data if w.get("part_of_speech") == word_pos]
        other = [w["word"] for w in known_words_data if w.get("part_of_speech") != word_pos]
        known_similar = (same_pos + other)[:5]
    else:
        known_similar = [w["word"] for w in known_words_data[:5]]

    prompt = build_explain_prompt(
        target_language=target_lang,
        native_language=native_lang,
        cefr_level=cefr_level,
        target_word=word["word"],
        native_translation=translation,
        grammar_tags=word.get("tags", []),
        error_pattern=pattern.description,
        known_similar_words=known_similar,
    )

    llm = get_llm_client()
    llm_response = await llm.generate(prompt)

    # ── 6. Parse response ────────────────────────────────────────────────
    parsed = parse_explain_response(llm_response.text)

    # ── 7. Cache result ──────────────────────────────────────────────────
    try:
        save_feedback(
            user_id=user_id,
            word_id=word_id,
            session_id=session_id,
            pattern_detected=pattern.pattern,
            explanation=parsed["explanation"],
            example_sentence=parsed["example_sentence"],
            prompt_used=prompt,
            llm_provider=llm_response.provider,
            llm_model=llm_response.model,
            latency_ms=llm_response.latency_ms,
        )
    except Exception:
        logger.exception("Failed to cache feedback (non-fatal)")

    return {
        "explanation": parsed["explanation"],
        "exampleSentence": parsed["example_sentence"],
        "patternDetected": pattern.pattern,
        "patternDescription": pattern.description,
        "patternConfidence": pattern.confidence,
        "triggerReason": trigger_reason,
        "cached": False,
        "llmProvider": llm_response.provider,
        "llmModel": llm_response.model,
        "latencyMs": llm_response.latency_ms,
        "triggered": True,
    }


async def generate_grammar_examples(
    user_id: str,
    grammar_concept_tag: str,
    known_word_ids: list[str] | None = None,
) -> dict[str, Any]:
    """
    Generate 3 example sentences demonstrating a grammar concept
    using only the user's known vocabulary.

    Args:
        user_id: UUID of the user
        grammar_concept_tag: e.g. "passé_composé", "subjunctive"
        known_word_ids: optional list of word IDs to use; if None,
                        fetches the user's known words automatically

    Returns:
        {
            "sentences": list[str],
            "grammarConcept": str,
            "llmProvider": str,
            "llmModel": str,
            "latencyMs": int
        }
    """
    # ── 1. Fetch user profile ────────────────────────────────────────────
    profile = get_user_profile(user_id)
    if not profile:
        raise ValueError(f"User profile not found: {user_id}")

    target_lang = profile.get("target_language", "fr")
    native_lang = profile.get("native_language", "en")
    cefr_level = profile.get("proficiency_level", "A1")

    # ── 2. Fetch grammar lesson details ──────────────────────────────────
    grammar_lesson = get_grammar_lesson(grammar_concept_tag)
    grammar_explanation = None
    if grammar_lesson:
        grammar_explanation = grammar_lesson.get("explanation")

    # ── 3. Fetch known words ─────────────────────────────────────────────
    if known_word_ids:
        word_rows = get_known_words_by_ids(known_word_ids)
        known_words = [w["word"] for w in word_rows if w.get("word")]
    else:
        word_rows = get_known_words(user_id, target_lang, limit=30)
        known_words = [w["word"] for w in word_rows if w.get("word")]

    # ── 4. Build prompt + call LLM ───────────────────────────────────────
    prompt = build_grammar_examples_prompt(
        target_language=target_lang,
        native_language=native_lang,
        cefr_level=cefr_level,
        grammar_concept=grammar_concept_tag,
        grammar_explanation=grammar_explanation,
        known_words=known_words,
    )

    llm = get_llm_client()
    llm_response = await llm.generate(prompt)

    # ── 5. Parse response ────────────────────────────────────────────────
    sentences = parse_grammar_examples_response(llm_response.text)

    # ── 6. Cache result ──────────────────────────────────────────────────
    try:
        save_grammar_examples(
            user_id=user_id,
            grammar_concept_tag=grammar_concept_tag,
            sentences=sentences,
            prompt_used=prompt,
            llm_provider=llm_response.provider,
            llm_model=llm_response.model,
            latency_ms=llm_response.latency_ms,
        )
    except Exception:
        logger.exception("Failed to cache grammar examples (non-fatal)")

    return {
        "sentences": sentences,
        "grammarConcept": grammar_concept_tag,
        "llmProvider": llm_response.provider,
        "llmModel": llm_response.model,
        "latencyMs": llm_response.latency_ms,
    }
