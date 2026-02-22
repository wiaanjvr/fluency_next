"""
Word Selector — Orchestrates scoring, ranking, and 95% known-word enforcement.

Main entry point: ``select_story_words(user_id, target_word_count, complexity_level)``

Flow:
  1. Fetch all user words + contextual data (sessions, DKT, topic prefs)
  2. Partition into DUE words vs KNOWN pool
  3. Score all due words with storyScore()
  4. Select top-N due words (≤5% of total)
  5. Fill remaining slots from known pool, filtered by thematic relevance
  6. Return dueWords, knownFillWords, thematicBias
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import numpy as np
from loguru import logger

from ..config import settings
from ..data.dkt_client import fetch_dkt_forget_probs
from ..data.supabase_client import (
    fetch_recent_session_word_ids,
    fetch_story_mode_word_ids,
    fetch_story_segment_engagement,
    fetch_user_topic_preferences,
    fetch_user_words,
    fetch_word_topic_tags,
    upsert_topic_preferences,
)
from .scoring import ScoredWord, score_candidate_words
from .thematic_embeddings import (
    build_initial_preference_vector,
    compute_thematic_relevance,
    get_thematic_bias_tags,
    update_preference_vector,
)


# ── Result types ────────────────────────────────────────────────────────────


class WordSelectionResult:
    """Result of the adaptive word selection process."""

    def __init__(
        self,
        due_words: list[str],
        known_fill_words: list[str],
        thematic_bias: list[str],
        debug_info: dict[str, Any] | None = None,
    ):
        self.due_words = due_words
        self.known_fill_words = known_fill_words
        self.thematic_bias = thematic_bias
        self.debug_info = debug_info or {}


# ── Main entry point ────────────────────────────────────────────────────────


async def select_story_words(
    user_id: str,
    target_word_count: int,
    story_complexity_level: int = 1,
    language: str = "fr",
) -> WordSelectionResult:
    """
    Select words for a story using the ML-informed scoring function.

    Parameters
    ----------
    user_id : str
        UUID of the learner.
    target_word_count : int
        Total # distinct words the story should contain.
    story_complexity_level : int
        1-5 scale. Higher → more varied vocabulary, slightly relaxed constraints.
    language : str
        Target language code.

    Returns
    -------
    WordSelectionResult with dueWords (≤5%), knownFillWords (≥95%), thematicBias.
    """
    now = datetime.now(timezone.utc)
    cfg = settings.scoring

    # ── 1. Fetch data in parallel-ish (all are I/O bound) ───────────────
    # Note: in production these would be asyncio.gather'd; for now sequential
    user_words = fetch_user_words(user_id, language)
    if not user_words:
        logger.info(f"No user words for {user_id} — returning empty selection")
        return WordSelectionResult([], [], [])

    # Fetch DKT forgetting probabilities (graceful degradation)
    dkt_forget_map = await fetch_dkt_forget_probs(user_id)

    # Fetch recent session context
    recent_sessions = fetch_recent_session_word_ids(
        user_id, session_count=cfg.recency_session_window
    )

    # Fetch story-mode recency
    story_mode_recent = fetch_story_mode_word_ids(
        user_id, days=cfg.story_recency_days
    )

    # Fetch/build thematic preference vector
    user_pref_vector = await _get_or_build_preference_vector(user_id)

    # Get topic tags for all words
    word_ids = [w["id"] for w in user_words]
    word_tags_map = fetch_word_topic_tags(word_ids)

    # ── 2. Partition words ──────────────────────────────────────────────

    due_pool: list[dict[str, Any]] = []
    known_pool: list[dict[str, Any]] = []

    for w in user_words:
        status = w.get("status", "new")
        threshold = w.get("story_introduction_threshold", 1.0) or 1.0
        ease = w.get("ease_factor", 2.5) or 2.5

        # Must pass story introduction threshold
        if ease < threshold:
            continue

        next_review = w.get("next_review")
        is_due = False
        if next_review:
            try:
                review_dt = datetime.fromisoformat(
                    next_review.replace("Z", "+00:00")
                )
                is_due = review_dt <= now
            except (ValueError, TypeError):
                pass

        if status == "new" or is_due:
            due_pool.append(w)

        if status in ("known", "mastered", "learning"):
            known_pool.append(w)

    # ── 3. Score due words ──────────────────────────────────────────────

    scored_due = score_candidate_words(
        user_words=due_pool,
        dkt_forget_map=dkt_forget_map,
        recent_sessions=recent_sessions,
        story_mode_recent_words=story_mode_recent,
        user_pref_vector=user_pref_vector,
        word_tags_map=word_tags_map,
    )

    # ── 4. Apply 95% known constraint ──────────────────────────────────

    max_due_count = max(
        cfg.min_new_words,
        int(target_word_count * cfg.max_new_word_ratio),
    )
    # Complexity level can slightly increase the new-word allowance
    complexity_bonus = max(0, story_complexity_level - 1)
    max_due_count = min(
        max_due_count + complexity_bonus,
        int(target_word_count * 0.10),  # hard cap: never exceed 10%
    )

    selected_due = scored_due[:max_due_count]
    selected_due_ids = {sw.word_id for sw in selected_due}

    # ── 5. Fill remaining from known pool, ranked by thematic relevance ─

    remaining_count = target_word_count - len(selected_due)

    # Score known pool by thematic relevance (primary) + variety
    known_candidates: list[tuple[str, float]] = []
    for w in known_pool:
        wid = w["id"]
        if wid in selected_due_ids:
            continue  # already selected as due
        tags = word_tags_map.get(wid, w.get("tags") or [])
        relevance = compute_thematic_relevance(user_pref_vector, tags)

        # Small variety bonus for words not in story mode recently
        variety = 0.1 if wid not in story_mode_recent else 0.0

        # Small frequency bonus for common words (aids comprehension)
        freq_rank = w.get("frequency_rank") or 5000
        freq_bonus = max(0.0, 0.1 * (1.0 - freq_rank / 5000.0))

        combined = relevance + variety + freq_bonus
        known_candidates.append((wid, combined))

    # Sort by relevance score, then add controlled randomness
    known_candidates.sort(key=lambda x: x[1], reverse=True)

    # Take 70% by relevance, 30% random for variety (same pattern as existing code)
    priority_count = int(remaining_count * 0.7)
    random_count = remaining_count - priority_count

    priority_known = [wid for wid, _ in known_candidates[:priority_count]]
    remaining_candidates = [wid for wid, _ in known_candidates[priority_count:]]

    # Shuffle remaining for randomness
    rng = np.random.default_rng()
    if remaining_candidates:
        indices = rng.permutation(len(remaining_candidates))[:random_count]
        random_known = [remaining_candidates[i] for i in indices]
    else:
        random_known = []

    selected_known_ids = priority_known + random_known

    # ── 6. Compute thematic bias ────────────────────────────────────────

    thematic_bias = get_thematic_bias_tags(user_pref_vector, top_k=3)

    # ── 7. Build result ────────────────────────────────────────────────

    due_word_ids = [sw.word_id for sw in selected_due]
    known_word_ids = selected_known_ids

    debug_info = {
        "total_user_words": len(user_words),
        "due_pool_size": len(due_pool),
        "known_pool_size": len(known_pool),
        "dkt_coverage": len(dkt_forget_map),
        "max_due_allowed": max_due_count,
        "selected_due_count": len(due_word_ids),
        "selected_known_count": len(known_word_ids),
        "known_percentage": round(
            len(known_word_ids) / max(1, len(due_word_ids) + len(known_word_ids)) * 100,
            1,
        ),
        "top_due_scores": [
            {"wordId": sw.word_id, "score": sw.total_score, "word": sw.word}
            for sw in selected_due[:5]
        ],
    }

    logger.info(
        f"Story word selection for user {user_id}: "
        f"{len(due_word_ids)} due + {len(known_word_ids)} known = "
        f"{len(due_word_ids) + len(known_word_ids)} total "
        f"(target: {target_word_count}, "
        f"known%: {debug_info['known_percentage']}%)"
    )

    return WordSelectionResult(
        due_words=due_word_ids,
        known_fill_words=known_word_ids,
        thematic_bias=thematic_bias,
        debug_info=debug_info,
    )


# ── Thematic preference helper ─────────────────────────────────────────────


async def _get_or_build_preference_vector(user_id: str) -> np.ndarray:
    """
    Load the user's thematic preference vector from DB, or build a default.
    """
    dim = settings.scoring.topic_embedding_dim

    pref_row = fetch_user_topic_preferences(user_id)
    if pref_row and pref_row.get("preference_vector"):
        vec = np.array(pref_row["preference_vector"], dtype=np.float32)
        if len(vec) == dim:
            return vec

    # No preference vector yet — check if user has selected_topics in profile
    # and build from those, otherwise return neutral
    if pref_row and pref_row.get("selected_topics"):
        return build_initial_preference_vector(pref_row["selected_topics"])

    return np.zeros(dim, dtype=np.float32)


async def update_user_preferences_after_session(
    user_id: str,
    story_topic_tags: list[str],
    time_on_segment_ms: int,
    story_id: str | None = None,
) -> None:
    """
    Called after each story session to update the user's thematic preferences.

    Parameters
    ----------
    user_id : str
    story_topic_tags : list[str] — topic tags of the story just completed
    time_on_segment_ms : int — time spent on this story segment
    story_id : str | None — optional story ID for logging
    """
    dim = settings.scoring.topic_embedding_dim

    # Get current vector
    current_vec = await _get_or_build_preference_vector(user_id)

    # Build engagement record
    engagement = [{
        "topic_tags": story_topic_tags,
        "time_on_segment_ms": time_on_segment_ms,
    }]

    # Update
    updated_vec = update_preference_vector(current_vec, engagement)

    # Fetch existing prefs for merging
    pref_row = fetch_user_topic_preferences(user_id)
    selected_topics = (pref_row or {}).get("selected_topics", [])
    topic_engagement: dict[str, float] = (pref_row or {}).get("topic_engagement", {})

    # Update per-topic engagement counters
    for tag in story_topic_tags:
        topic_engagement[tag] = topic_engagement.get(tag, 0.0) + time_on_segment_ms

    # Persist
    upsert_topic_preferences(
        user_id=user_id,
        preference_vector=updated_vec.tolist(),
        selected_topics=selected_topics,
        topic_engagement=topic_engagement,
    )

    logger.debug(
        f"Updated thematic preferences for user {user_id} after story session. "
        f"Topics: {story_topic_tags}, time: {time_on_segment_ms}ms"
    )
