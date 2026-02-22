"""
Tests for the error pattern detector.

Uses synthetic interaction data to verify pattern detection logic.
"""

from __future__ import annotations

import pytest

from ml.feedback_generator.engine.pattern_detector import (
    ErrorPattern,
    detect_error_pattern,
)


# ── Helpers ─────────────────────────────────────────────────────────────────


def _make_event(
    *,
    correct: bool,
    module_source: str = "flashcards",
    input_mode: str = "multiple_choice",
    response_time_ms: int = 2000,
    session_id: str = "sess-1",
) -> dict:
    return {
        "correct": correct,
        "module_source": module_source,
        "input_mode": input_mode,
        "response_time_ms": response_time_ms,
        "session_id": session_id,
    }


def _make_review(
    *,
    correct: bool,
    module_source: str = "flashcards",
    response_time_ms: int = 2000,
) -> dict:
    return {
        "correct": correct,
        "module_source": module_source,
        "response_time_ms": response_time_ms,
    }


# ── Early learning ──────────────────────────────────────────────────────────


def test_early_learning_few_events():
    """With <3 events, should return early_learning."""
    result = detect_error_pattern(
        module_history=[_make_review(correct=True)],
        interaction_events=[_make_event(correct=False)],
    )
    assert result.pattern == "early_learning"
    assert result.confidence == 0.0


# ── Production gap ──────────────────────────────────────────────────────────


def test_production_gap():
    """
    Right on MC/reading, wrong on typing/speaking → production_gap.
    """
    events = [
        # MC correct
        _make_event(correct=True, input_mode="multiple_choice"),
        _make_event(correct=True, input_mode="multiple_choice"),
        _make_event(correct=True, input_mode="reading"),
        # Typing wrong
        _make_event(correct=False, input_mode="typing"),
        _make_event(correct=False, input_mode="typing"),
        _make_event(correct=False, input_mode="speaking"),
    ]
    result = detect_error_pattern(module_history=[], interaction_events=events)
    assert result.pattern == "production_gap"
    assert result.confidence > 0.5


def test_no_production_gap_when_balanced():
    """
    Similar accuracy across modes → not a production gap.
    """
    events = [
        _make_event(correct=True, input_mode="multiple_choice"),
        _make_event(correct=False, input_mode="multiple_choice"),
        _make_event(correct=True, input_mode="typing"),
        _make_event(correct=False, input_mode="typing"),
    ]
    result = detect_error_pattern(module_history=[], interaction_events=events)
    assert result.pattern != "production_gap"


# ── Contextualization ───────────────────────────────────────────────────────


def test_contextualization_issue():
    """
    Right in flashcards, wrong in story_engine → contextualization.
    """
    reviews = [
        _make_review(correct=True, module_source="flashcards"),
        _make_review(correct=True, module_source="flashcards"),
        _make_review(correct=True, module_source="cloze"),
        _make_review(correct=False, module_source="story_engine"),
        _make_review(correct=False, module_source="story_engine"),
        _make_review(correct=False, module_source="free_reading"),
    ]
    events = [
        _make_event(correct=True, module_source="flashcards", input_mode="multiple_choice"),
        _make_event(correct=False, module_source="story_engine", input_mode="reading"),
    ]
    result = detect_error_pattern(module_history=reviews, interaction_events=events)
    assert result.pattern == "contextualization"
    assert result.confidence > 0.3


# ── Slow recognition ───────────────────────────────────────────────────────


def test_slow_recognition():
    """
    Mostly correct but very slow → slow_recognition.
    """
    events = [
        _make_event(correct=True, response_time_ms=8000),
        _make_event(correct=True, response_time_ms=7000),
        _make_event(correct=True, response_time_ms=9000),
        _make_event(correct=True, response_time_ms=6500),
        _make_event(correct=False, response_time_ms=3000),
    ]
    result = detect_error_pattern(module_history=[], interaction_events=events)
    assert result.pattern == "slow_recognition"
    assert result.confidence > 0.3
    assert result.details["avg_response_time_ms"] > 5000


def test_not_slow_if_fast():
    """
    Correct and fast → not slow_recognition.
    """
    events = [
        _make_event(correct=True, response_time_ms=1500),
        _make_event(correct=True, response_time_ms=1200),
        _make_event(correct=True, response_time_ms=1800),
        _make_event(correct=True, response_time_ms=1000),
    ]
    result = detect_error_pattern(module_history=[], interaction_events=events)
    assert result.pattern != "slow_recognition"


# ── General difficulty ──────────────────────────────────────────────────────


def test_general_difficulty():
    """
    Wrong across all modes and modules → general_difficulty.
    """
    events = [
        _make_event(correct=False, input_mode="multiple_choice"),
        _make_event(correct=False, input_mode="typing"),
        _make_event(correct=False, input_mode="reading"),
        _make_event(correct=True, input_mode="multiple_choice"),
    ]
    reviews = [
        _make_review(correct=False, module_source="flashcards"),
        _make_review(correct=False, module_source="story_engine"),
    ]
    result = detect_error_pattern(module_history=reviews, interaction_events=events)
    assert result.pattern == "general_difficulty"
    assert result.details["accuracy"] < 0.5
