"""
Error Pattern Detector for the LLM Feedback Generator.

Analyses a user's interaction history for a specific word to detect
systematic error patterns. The detected pattern is passed into the
LLM prompt to produce targeted explanations.

Detected patterns:
  - production_gap       : right on MC, wrong on typing/speaking
  - contextualization    : right in isolation, wrong in story context
  - slow_recognition     : mostly correct but response times are high
  - general_difficulty   : wrong across most modules / input modes
  - early_learning       : too few data points for pattern detection
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from loguru import logger


@dataclass
class ErrorPattern:
    """Result of error-pattern analysis."""

    pattern: str  # one of the pattern names above
    description: str  # human-readable description for prompt
    confidence: float  # 0.0 – 1.0
    details: dict[str, Any]  # supporting evidence


def detect_error_pattern(
    module_history: list[dict[str, Any]],
    interaction_events: list[dict[str, Any]],
) -> ErrorPattern:
    """
    Analyse cross-module review history + interaction events for a word
    to detect the user's specific error pattern.

    Args:
        module_history: rows from module_review_history (most recent first)
        interaction_events: rows from interaction_events (most recent first)

    Returns:
        ErrorPattern with the detected pattern and supporting evidence.
    """
    if len(module_history) + len(interaction_events) < 3:
        return ErrorPattern(
            pattern="early_learning",
            description="Not enough interaction data to detect a specific pattern yet.",
            confidence=0.0,
            details={"total_events": len(module_history) + len(interaction_events)},
        )

    # ── Aggregate stats by input mode ────────────────────────────────────
    mode_stats = _aggregate_by_input_mode(interaction_events)

    # ── Aggregate stats by module source ─────────────────────────────────
    module_stats = _aggregate_by_module(module_history, interaction_events)

    # ── Check for production gap ─────────────────────────────────────────
    production_gap = _check_production_gap(mode_stats)
    if production_gap:
        return production_gap

    # ── Check for contextualization issue ────────────────────────────────
    context_issue = _check_contextualization(module_stats)
    if context_issue:
        return context_issue

    # ── Check for slow recognition ───────────────────────────────────────
    slow_recog = _check_slow_recognition(interaction_events)
    if slow_recog:
        return slow_recog

    # ── Default: general difficulty ──────────────────────────────────────
    total = len(module_history) + len(interaction_events)
    correct_count = sum(1 for e in module_history if e.get("correct"))
    correct_count += sum(1 for e in interaction_events if e.get("correct"))
    accuracy = correct_count / total if total > 0 else 0.0

    return ErrorPattern(
        pattern="general_difficulty",
        description=(
            f"The learner struggles with this word across all exercise types "
            f"(accuracy: {accuracy:.0%} over {total} attempts)."
        ),
        confidence=0.7,
        details={
            "total_attempts": total,
            "accuracy": round(accuracy, 3),
            "mode_stats": mode_stats,
            "module_stats": module_stats,
        },
    )


# ── Helpers ─────────────────────────────────────────────────────────────────


def _aggregate_by_input_mode(
    events: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    """Group interaction events by input_mode and compute accuracy + avg RT."""
    stats: dict[str, dict[str, Any]] = {}
    for ev in events:
        mode = ev.get("input_mode", "unknown")
        if mode not in stats:
            stats[mode] = {"correct": 0, "total": 0, "rt_sum": 0, "rt_count": 0}
        stats[mode]["total"] += 1
        if ev.get("correct"):
            stats[mode]["correct"] += 1
        rt = ev.get("response_time_ms")
        if rt and rt > 0:
            stats[mode]["rt_sum"] += rt
            stats[mode]["rt_count"] += 1

    # Compute derived metrics
    for mode, s in stats.items():
        s["accuracy"] = s["correct"] / s["total"] if s["total"] > 0 else 0.0
        s["avg_rt_ms"] = (
            s["rt_sum"] / s["rt_count"] if s["rt_count"] > 0 else None
        )

    return stats


def _aggregate_by_module(
    module_history: list[dict[str, Any]],
    interaction_events: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    """Group reviews by module_source and compute accuracy."""
    stats: dict[str, dict[str, Any]] = {}

    for ev in module_history:
        mod = ev.get("module_source", "unknown")
        if mod not in stats:
            stats[mod] = {"correct": 0, "total": 0}
        stats[mod]["total"] += 1
        if ev.get("correct"):
            stats[mod]["correct"] += 1

    for ev in interaction_events:
        mod = ev.get("module_source", "unknown")
        if mod not in stats:
            stats[mod] = {"correct": 0, "total": 0}
        stats[mod]["total"] += 1
        if ev.get("correct"):
            stats[mod]["correct"] += 1

    for mod, s in stats.items():
        s["accuracy"] = s["correct"] / s["total"] if s["total"] > 0 else 0.0

    return stats


def _check_production_gap(
    mode_stats: dict[str, dict[str, Any]],
) -> ErrorPattern | None:
    """
    Detect: right on multiple_choice / reading but wrong on typing / speaking.
    This indicates the learner recognises the word but cannot produce it.
    """
    passive_modes = {"multiple_choice", "reading"}
    active_modes = {"typing", "speaking"}

    passive_acc = _weighted_accuracy(mode_stats, passive_modes)
    active_acc = _weighted_accuracy(mode_stats, active_modes)
    passive_total = sum(
        mode_stats.get(m, {}).get("total", 0) for m in passive_modes
    )
    active_total = sum(
        mode_stats.get(m, {}).get("total", 0) for m in active_modes
    )

    if passive_total < 2 or active_total < 2:
        return None

    gap = passive_acc - active_acc
    if gap >= 0.35:
        confidence = min(1.0, gap / 0.5)
        return ErrorPattern(
            pattern="production_gap",
            description=(
                f"The learner recognises this word in multiple-choice and reading "
                f"({passive_acc:.0%} accuracy) but struggles to produce it when "
                f"typing or speaking ({active_acc:.0%} accuracy). "
                f"This is a production gap — they know the meaning but cannot "
                f"actively recall the spelling or pronunciation."
            ),
            confidence=round(confidence, 2),
            details={
                "passive_accuracy": round(passive_acc, 3),
                "active_accuracy": round(active_acc, 3),
                "gap": round(gap, 3),
                "passive_total": passive_total,
                "active_total": active_total,
            },
        )
    return None


def _check_contextualization(
    module_stats: dict[str, dict[str, Any]],
) -> ErrorPattern | None:
    """
    Detect: right in isolated drills (flashcards, cloze) but wrong in
    story context.
    """
    isolated_modules = {"flashcards", "cloze", "conjugation", "foundation"}
    story_modules = {"story_engine", "free_reading"}

    iso_acc = _weighted_accuracy(module_stats, isolated_modules)
    story_acc = _weighted_accuracy(module_stats, story_modules)
    iso_total = sum(
        module_stats.get(m, {}).get("total", 0) for m in isolated_modules
    )
    story_total = sum(
        module_stats.get(m, {}).get("total", 0) for m in story_modules
    )

    if iso_total < 2 or story_total < 2:
        return None

    gap = iso_acc - story_acc
    if gap >= 0.30:
        confidence = min(1.0, gap / 0.5)
        return ErrorPattern(
            pattern="contextualization",
            description=(
                f"The learner knows this word in isolated drills ({iso_acc:.0%} "
                f"accuracy in flashcards/cloze) but struggles when it appears "
                f"in story context ({story_acc:.0%} accuracy). "
                f"They need help connecting the word to real sentence usage."
            ),
            confidence=round(confidence, 2),
            details={
                "isolated_accuracy": round(iso_acc, 3),
                "story_accuracy": round(story_acc, 3),
                "gap": round(gap, 3),
                "isolated_total": iso_total,
                "story_total": story_total,
            },
        )
    return None


def _check_slow_recognition(
    events: list[dict[str, Any]],
) -> ErrorPattern | None:
    """
    Detect: mostly correct answers but with unusually slow response times.
    This indicates recognition without automaticity.
    """
    correct_events = [e for e in events if e.get("correct")]
    if len(correct_events) < 3:
        return None

    # Calculate accuracy
    total = len(events)
    accuracy = len(correct_events) / total

    if accuracy < 0.7:
        return None  # Not "mostly correct"

    # Check response times for correct answers
    rts = [
        e["response_time_ms"]
        for e in correct_events
        if e.get("response_time_ms") and e["response_time_ms"] > 0
    ]
    if len(rts) < 3:
        return None

    avg_rt = sum(rts) / len(rts)

    # Slow if average RT > 5 seconds for correct answers
    if avg_rt > 5000:
        confidence = min(1.0, (avg_rt - 5000) / 5000)
        return ErrorPattern(
            pattern="slow_recognition",
            description=(
                f"The learner usually gets this word correct ({accuracy:.0%} "
                f"accuracy) but takes a long time to answer (average "
                f"{avg_rt / 1000:.1f}s). They recognise the word but haven't "
                f"built automaticity — the recall is effortful, not instant."
            ),
            confidence=round(confidence, 2),
            details={
                "accuracy": round(accuracy, 3),
                "avg_response_time_ms": round(avg_rt, 0),
                "correct_count": len(correct_events),
                "total_count": total,
            },
        )
    return None


def _weighted_accuracy(
    stats: dict[str, dict[str, Any]],
    modes: set[str],
) -> float:
    """Compute weighted-average accuracy across a set of modes/modules."""
    total_correct = 0
    total_attempts = 0
    for mode in modes:
        s = stats.get(mode, {})
        total_correct += s.get("correct", 0)
        total_attempts += s.get("total", 0)
    return total_correct / total_attempts if total_attempts > 0 else 0.0
