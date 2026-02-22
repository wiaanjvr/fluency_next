"""
Tests for the trigger condition checker.
"""

from __future__ import annotations

import pytest

from ml.feedback_generator.engine.trigger_checker import (
    TriggerResult,
    check_trigger,
)


def _make_word(
    *,
    exposure_count: int = 0,
    ease_factor: float = 2.5,
    production_score: int = 50,
    status: str = "learning",
) -> dict:
    return {
        "id": "word-1",
        "word": "manger",
        "exposure_count": exposure_count,
        "ease_factor": ease_factor,
        "production_score": production_score,
        "status": status,
    }


def _make_interaction(*, correct: bool) -> dict:
    return {"correct": correct, "response_time_ms": 2000}


# ── Session repeat errors ──────────────────────────────────────────────────


def test_trigger_on_session_repeat_errors():
    """2+ errors in session → should fire."""
    word = _make_word()
    interactions = [
        _make_interaction(correct=False),
        _make_interaction(correct=False),
    ]
    result = check_trigger(word, interactions)
    assert result.should_fire is True
    assert result.reason == "session_repeat_errors"


def test_no_trigger_with_one_error():
    """Only 1 error in session → should not fire."""
    word = _make_word()
    interactions = [
        _make_interaction(correct=True),
        _make_interaction(correct=False),
    ]
    result = check_trigger(word, interactions)
    assert result.should_fire is False


# ── High exposure, low recognition ─────────────────────────────────────────


def test_trigger_on_high_exposure_low_recognition():
    """exposure > 5 and low recognition score → should fire."""
    word = _make_word(
        exposure_count=10,
        ease_factor=1.5,
        production_score=10,
        status="learning",
    )
    interactions = [_make_interaction(correct=True)]
    result = check_trigger(word, interactions)
    assert result.should_fire is True
    assert result.reason == "high_exposure_low_recognition"


def test_no_trigger_high_exposure_high_recognition():
    """exposure > 5 but high recognition → should not fire."""
    word = _make_word(
        exposure_count=10,
        ease_factor=2.5,
        production_score=80,
        status="known",
    )
    interactions = [_make_interaction(correct=True)]
    result = check_trigger(word, interactions)
    assert result.should_fire is False


def test_no_trigger_low_exposure():
    """Low exposure count → should not fire (even if recognition is low)."""
    word = _make_word(
        exposure_count=3,
        ease_factor=1.3,
        production_score=0,
        status="new",
    )
    interactions = [_make_interaction(correct=True)]
    result = check_trigger(word, interactions)
    assert result.should_fire is False
