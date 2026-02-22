"""
Rescue intervention engine.

Selects the best intervention based on session context and
abandonment probability. Interventions are prioritised:
  1. Shorten session (reduce remaining words by 50%)
  2. Switch to easier content (recognition score > 0.7)
  3. Switch module (e.g. from story to Anki drill)
  4. Celebrate micro-progress (surface a stat)
  5. Suggest break (after 25+ minutes)
"""

from __future__ import annotations

import random
from typing import Any

from loguru import logger

from ..config import settings


def select_intervention(
    abandonment_probability: float,
    session_features: dict[str, Any],
    user_stats: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    """
    Select the best rescue intervention based on context.

    Args:
        abandonment_probability: Model output (0-1)
        session_features: Current session state (consecutive_errors,
            response_time_trend, session_duration_so_far_ms, cognitive_load,
            words_remaining_in_session)
        user_stats: Optional user stats for personalisation (total_words_seen,
            target_language, current_streak_days)

    Returns:
        Intervention dict or None if probability is below threshold.
    """
    threshold = settings.mid_session.abandonment_threshold
    if abandonment_probability < threshold:
        return None

    # Extract context
    consec_errors = int(session_features.get("consecutive_errors", 0))
    rt_trend = float(session_features.get("response_time_trend", 0))
    duration_ms = float(session_features.get("session_duration_so_far_ms", 0))
    cog_load = float(session_features.get("cognitive_load", 0.5))
    words_remaining = int(session_features.get("words_remaining_in_session", 10))
    duration_min = duration_ms / 60_000

    # Score each intervention based on context
    candidates = _score_interventions(
        consec_errors=consec_errors,
        rt_trend=rt_trend,
        duration_min=duration_min,
        cog_load=cog_load,
        words_remaining=words_remaining,
        abandonment_probability=abandonment_probability,
        user_stats=user_stats,
    )

    if not candidates:
        return None

    # Pick the highest-scoring intervention
    best = max(candidates, key=lambda c: c["score"])

    logger.info(
        f"Selected intervention: {best['type']} "
        f"(score={best['score']:.2f}, p_abandon={abandonment_probability:.3f})"
    )

    return {
        "type": best["type"],
        "payload": best["payload"],
        "message": best["message"],
    }


def _score_interventions(
    consec_errors: int,
    rt_trend: float,
    duration_min: float,
    cog_load: float,
    words_remaining: int,
    abandonment_probability: float,
    user_stats: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Score each intervention type based on session context."""
    candidates: list[dict[str, Any]] = []
    cfg = settings.interventions

    # ── 1. Shorten session ──────────────────────────────────────────────
    # Best when many words remain and user is fatigued
    if words_remaining > 3:
        new_remaining = max(1, int(words_remaining * cfg.shorten_factor))
        score = 0.8  # High base priority
        if words_remaining > 10:
            score += 0.1
        if cog_load > 0.7:
            score += 0.1
        candidates.append(
            {
                "type": "shorten_session",
                "score": score,
                "payload": {
                    "original_remaining": words_remaining,
                    "new_remaining": new_remaining,
                    "reduction_percent": round(
                        (1 - cfg.shorten_factor) * 100
                    ),
                },
                "message": (
                    f"Let's make this easier — just {new_remaining} more "
                    f"word{'s' if new_remaining > 1 else ''} to go!"
                ),
            }
        )

    # ── 2. Switch to easier content ─────────────────────────────────────
    # Best when consecutive errors are high
    if consec_errors >= 2:
        score = 0.7
        if consec_errors >= 4:
            score += 0.2
        candidates.append(
            {
                "type": "switch_easier_content",
                "score": score,
                "payload": {
                    "min_recognition_score": cfg.easy_recognition_threshold,
                    "consecutive_errors_trigger": consec_errors,
                },
                "message": (
                    "Let's revisit some words you know well to build "
                    "confidence back up!"
                ),
            }
        )

    # ── 3. Switch module ────────────────────────────────────────────────
    # Offer when fatigue is high (rising response times)
    if rt_trend > 500 or cog_load > 0.75:
        score = 0.6
        if rt_trend > 1500:
            score += 0.15
        candidates.append(
            {
                "type": "switch_module",
                "score": score,
                "payload": {
                    "suggested_module": "flashcards",
                    "reason": "fatigue_detected",
                },
                "message": (
                    "Feeling stuck? Switch to a quick flashcard drill instead!"
                ),
            }
        )

    # ── 4. Celebrate micro-progress ─────────────────────────────────────
    # Best for moderate risk — give encouragement
    if user_stats:
        total_words = user_stats.get("total_words_seen", 0)
        language = user_stats.get("target_language", "your language")
        if total_words > 0:
            score = 0.5
            # Boost if near a milestone
            for milestone in [100, 250, 500, 750, 1000, 1500, 2000]:
                if abs(total_words - milestone) <= 20:
                    score += 0.2
                    break
            candidates.append(
                {
                    "type": "celebrate_micro_progress",
                    "score": score,
                    "payload": {
                        "total_words_seen": total_words,
                        "target_language": language,
                    },
                    "message": (
                        f"Amazing! You've now seen {total_words} "
                        f"{language.title()} words!"
                    ),
                }
            )

    # ── 5. Suggest break ────────────────────────────────────────────────
    # Best when session has been long
    if duration_min >= cfg.break_suggestion_minutes:
        score = 0.55
        if duration_min >= 35:
            score += 0.15
        candidates.append(
            {
                "type": "suggest_break",
                "score": score,
                "payload": {
                    "session_duration_min": round(duration_min, 1),
                    "suggested_break_min": cfg.break_duration_minutes,
                },
                "message": (
                    f"You've been studying for {int(duration_min)} minutes. "
                    f"Take {cfg.break_duration_minutes}?"
                ),
            }
        )

    return candidates


def generate_notification_hook(
    churn_probability: float,
    user_stats: dict[str, Any],
    streak: int = 0,
) -> str:
    """
    Generate a personalised notification hook for pre-session churn rescue.

    Args:
        churn_probability: Model output (0-1)
        user_stats: Dict with total_words_seen, target_language
        streak: Current streak in days

    Returns:
        A notification message string.
    """
    total_words = user_stats.get("total_words_seen", 0)
    language = user_stats.get("target_language", "your language")

    templates = list(settings.notifications.hooks)

    # Filter to relevant templates
    if streak > 0:
        # Include streak-related messages
        pass
    else:
        # Remove streak-related templates
        templates = [t for t in templates if "{streak}" not in t]

    if total_words < 10:
        templates = [t for t in templates if "{count}" not in t]

    if not templates:
        templates = list(settings.notifications.hooks)

    template = random.choice(templates)

    # Approximate words "about to forget" (heuristic: 10-30% of total)
    words_at_risk = max(3, int(total_words * 0.15))

    hook = template.format(
        count=words_at_risk,
        streak=streak,
        language=language.title(),
    )

    return hook
