"""
Story Word Scoring Function — ML-informed ranking for candidate words.

Implements the storyScore(word) formula:

    storyScore(word) =
        (0.4 × p_forget_48h)           # DKT forgetting risk
      + (0.2 × recencyPenalty)          # penalize words seen in last 2 sessions
      + (0.2 × productionGap)           # gap between recognitionScore and productionScore
      + (0.1 × moduleVarietyBonus)      # bonus if word hasn't appeared in story mode recently
      + (0.1 × thematicRelevanceScore)  # match to user's topic preferences
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import numpy as np
from loguru import logger

from ..config import settings
from .thematic_embeddings import compute_thematic_relevance


@dataclass
class ScoredWord:
    """A word with its computed story score and component breakdown."""

    word_id: str
    word: str
    lemma: str | None
    status: str
    next_review: str | None
    frequency_rank: int | None
    production_score: float
    ease_factor: float
    tags: list[str]

    # ── Score components ──
    total_score: float = 0.0
    forget_risk: float = 0.0
    recency_penalty: float = 0.0
    production_gap: float = 0.0
    module_variety_bonus: float = 0.0
    thematic_relevance: float = 0.0


def _compute_forget_risk(
    word_id: str,
    dkt_forget_map: dict[str, float],
    word_data: dict[str, Any],
) -> float:
    """
    Get the DKT p_forget_48h for this word.

    Falls back to a heuristic based on overdue-ness if DKT is unavailable:
      fallback = clamp((days_overdue / 14), 0, 1)
    """
    if word_id in dkt_forget_map:
        return dkt_forget_map[word_id]

    # Heuristic fallback: more overdue → higher forget risk
    next_review = word_data.get("next_review")
    if not next_review:
        return 0.5  # unknown → moderate risk

    try:
        review_dt = datetime.fromisoformat(next_review.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        days_overdue = (now - review_dt).total_seconds() / 86400.0
        if days_overdue <= 0:
            return 0.0  # not yet due
        return float(np.clip(days_overdue / 14.0, 0.0, 1.0))
    except (ValueError, TypeError):
        return 0.5


def _compute_recency_penalty(
    word_id: str,
    recent_sessions: list[set[str]],
) -> float:
    """
    Penalize words seen in the last N sessions.

    Returns a value in [0, 1] where 1 = NOT recently seen (good — no penalty),
    and 0 = seen in the most recent session (bad — maximum penalty deducted).

    The scoring function uses this as a PENALTY:
      - Words seen very recently get LOW recencyPenalty (close to 0)
      - Words NOT seen recently get HIGH recencyPenalty (close to 1)

    This means: higher score = better candidate for inclusion.
    """
    if not recent_sessions:
        return 1.0  # no session data → no penalty (full score)

    for i, session_words in enumerate(recent_sessions):
        if word_id in session_words:
            # More recent session → stronger penalty
            # i=0 (most recent) → 0.0, i=1 → 0.5, etc.
            return float(i / len(recent_sessions))

    return 1.0  # not in any recent session → full score


def _compute_production_gap(word_data: dict[str, Any]) -> float:
    """
    Gap between recognition ability (ease_factor / SRS success) and 
    production ability (production_score).

    Returns a value in [0, 1] where:
      - 1.0 = huge gap (can recognize but can't produce — high priority)
      - 0.0 = no gap (production matches recognition)

    Recognition proxy: normalize ease_factor from [1.3, 3.0] to [0, 100].
    """
    production_score = word_data.get("production_score", 50.0)
    ease_factor = word_data.get("ease_factor", 2.5)

    # Normalize ease_factor to 0-100 scale
    # ease_factor range: 1.3 (hard) to ~3.0+ (easy)
    recognition_score = float(np.clip((ease_factor - 1.3) / (3.0 - 1.3) * 100, 0, 100))

    # Gap = how much better you are at recognition vs production
    gap = max(0.0, recognition_score - production_score) / 100.0
    return float(np.clip(gap, 0.0, 1.0))


def _compute_module_variety_bonus(
    word_id: str,
    story_mode_recent_words: set[str],
) -> float:
    """
    Bonus for words that haven't appeared in story mode recently.

    Returns 1.0 if the word has NOT been in story mode in the look-back window,
    0.0 if it has.
    """
    if word_id in story_mode_recent_words:
        return 0.0
    return 1.0


def score_candidate_words(
    user_words: list[dict[str, Any]],
    dkt_forget_map: dict[str, float],
    recent_sessions: list[set[str]],
    story_mode_recent_words: set[str],
    user_pref_vector: np.ndarray | None,
    word_tags_map: dict[str, list[str]],
) -> list[ScoredWord]:
    """
    Score all candidate words using the multi-signal storyScore function.

    Parameters
    ----------
    user_words : list of user_words rows from Supabase
    dkt_forget_map : word_id → p_forget_48h from DKT service
    recent_sessions : list of sets of word IDs from recent sessions
    story_mode_recent_words : set of word IDs seen in story mode recently
    user_pref_vector : 16-dim user preference embedding (or None)
    word_tags_map : word_id → list of topic tags

    Returns
    -------
    List of ScoredWord, sorted by total_score descending.
    """
    cfg = settings.scoring

    if user_pref_vector is None:
        user_pref_vector = np.zeros(cfg.topic_embedding_dim, dtype=np.float32)

    scored: list[ScoredWord] = []

    for w in user_words:
        word_id = w["id"]
        tags = word_tags_map.get(word_id, w.get("tags") or [])

        # Compute each component
        forget_risk = _compute_forget_risk(word_id, dkt_forget_map, w)
        recency_penalty = _compute_recency_penalty(word_id, recent_sessions)
        production_gap = _compute_production_gap(w)
        module_variety = _compute_module_variety_bonus(word_id, story_mode_recent_words)
        thematic = compute_thematic_relevance(user_pref_vector, tags)

        # Weighted sum
        total = (
            cfg.w_forget * forget_risk
            + cfg.w_recency_penalty * recency_penalty
            + cfg.w_production_gap * production_gap
            + cfg.w_module_variety * module_variety
            + cfg.w_thematic * thematic
        )

        scored.append(ScoredWord(
            word_id=word_id,
            word=w.get("word", ""),
            lemma=w.get("lemma"),
            status=w.get("status", "new"),
            next_review=w.get("next_review"),
            frequency_rank=w.get("frequency_rank"),
            production_score=w.get("production_score", 0.0),
            ease_factor=w.get("ease_factor", 2.5),
            tags=tags,
            total_score=round(total, 6),
            forget_risk=round(forget_risk, 4),
            recency_penalty=round(recency_penalty, 4),
            production_gap=round(production_gap, 4),
            module_variety_bonus=round(module_variety, 4),
            thematic_relevance=round(thematic, 4),
        ))

    # Sort by total score, descending
    scored.sort(key=lambda s: s.total_score, reverse=True)

    logger.debug(
        f"Scored {len(scored)} candidate words. "
        f"Top score: {scored[0].total_score if scored else 'N/A'}, "
        f"DKT coverage: {sum(1 for w in user_words if w['id'] in dkt_forget_map)}/{len(user_words)}"
    )

    return scored
