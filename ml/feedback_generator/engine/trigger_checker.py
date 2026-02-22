"""
Trigger condition checker for the LLM Feedback Generator.

Determines whether feedback generation should fire for a given
user + word + session combination.

Trigger conditions (OR):
  1. User gets the same word wrong 2+ times in one session
  2. A word has exposure_count > 5 but recognition_score < 0.4
     (recognition_score is approximated from ease_factor normalised to 0..1)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from loguru import logger

from ..config import settings


@dataclass
class TriggerResult:
    """Result of a trigger check."""

    should_fire: bool
    reason: str
    details: dict[str, Any]


def check_trigger(
    word_details: dict[str, Any],
    session_interactions: list[dict[str, Any]],
) -> TriggerResult:
    """
    Check whether feedback should be generated for this word.

    Args:
        word_details: row from user_words (including knowledge-graph columns)
        session_interactions: interaction_events for this word in this session

    Returns:
        TriggerResult with should_fire flag and supporting reason.
    """
    triggers = settings.triggers

    # ── Condition 1: repeated errors in this session ─────────────────────
    error_count = sum(1 for e in session_interactions if not e.get("correct"))
    if error_count >= triggers.session_error_repeat_threshold:
        return TriggerResult(
            should_fire=True,
            reason="session_repeat_errors",
            details={
                "error_count_in_session": error_count,
                "threshold": triggers.session_error_repeat_threshold,
            },
        )

    # ── Condition 2: high exposure but low recognition ───────────────────
    exposure_count = word_details.get("exposure_count", 0)
    recognition_score = _compute_recognition_score(word_details)

    if (
        exposure_count > triggers.exposure_count_threshold
        and recognition_score < triggers.recognition_score_threshold
    ):
        return TriggerResult(
            should_fire=True,
            reason="high_exposure_low_recognition",
            details={
                "exposure_count": exposure_count,
                "recognition_score": round(recognition_score, 3),
                "exposure_threshold": triggers.exposure_count_threshold,
                "recognition_threshold": triggers.recognition_score_threshold,
            },
        )

    return TriggerResult(
        should_fire=False,
        reason="no_trigger",
        details={
            "error_count_in_session": error_count,
            "exposure_count": exposure_count,
            "recognition_score": round(recognition_score, 3),
        },
    )


def _compute_recognition_score(word: dict[str, Any]) -> float:
    """
    Approximate a 0..1 recognition score from available SRS metrics.

    Combines:
      - ease_factor (SM-2: 1.3..2.5, normalised to 0..1)
      - production_score (0..100, normalised to 0..1)
      - status weight (new=0, learning=0.2, known=0.6, mastered=0.9)

    Weighted average: 40% ease, 30% production, 30% status
    """
    # Normalise ease_factor (SM-2 range: 1.3 → 0.0, 2.5 → 1.0)
    ef = word.get("ease_factor", 2.5)
    ef_norm = max(0.0, min(1.0, (ef - 1.3) / 1.2))

    # Normalise production_score (0..100 → 0..1)
    prod = word.get("production_score", 0) / 100.0

    # Status weight
    status_map = {"new": 0.0, "learning": 0.2, "known": 0.6, "mastered": 0.9}
    status = word.get("status", "new")
    status_w = status_map.get(status, 0.0)

    return 0.40 * ef_norm + 0.30 * prod + 0.30 * status_w
