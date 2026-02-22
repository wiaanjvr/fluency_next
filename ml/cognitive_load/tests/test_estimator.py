"""
Unit tests for the CognitiveLoadEstimator engine.
"""

from __future__ import annotations

import pytest

from ml.cognitive_load.engine import CognitiveLoadEstimator


@pytest.fixture
def estimator() -> CognitiveLoadEstimator:
    return CognitiveLoadEstimator()


class TestInitAndEndSession:
    def test_init_session_registers(self, estimator: CognitiveLoadEstimator):
        estimator.init_session("s1", "u1", "story_engine", user_baseline_ms=2000)
        assert estimator.has_session("s1")

    def test_end_session_removes(self, estimator: CognitiveLoadEstimator):
        estimator.init_session("s1", "u1", "flashcards", user_baseline_ms=2000)
        result = estimator.end_session("s1")
        assert result == 0.0  # no events → 0
        assert not estimator.has_session("s1")

    def test_end_unknown_session_returns_none(
        self, estimator: CognitiveLoadEstimator
    ):
        assert estimator.end_session("nonexistent") is None


class TestRecordEvent:
    def test_no_response_time_returns_none(self, estimator: CognitiveLoadEstimator):
        estimator.init_session("s1", "u1", "cloze", user_baseline_ms=2000)
        assert estimator.record_event("s1", response_time_ms=None) is None

    def test_zero_response_time_returns_none(self, estimator: CognitiveLoadEstimator):
        estimator.init_session("s1", "u1", "cloze", user_baseline_ms=2000)
        assert estimator.record_event("s1", response_time_ms=0) is None

    def test_unknown_session_returns_none(self, estimator: CognitiveLoadEstimator):
        assert estimator.record_event("nope", response_time_ms=3000) is None

    def test_equal_to_baseline_returns_zero(self, estimator: CognitiveLoadEstimator):
        estimator.init_session("s1", "u1", "grammar", user_baseline_ms=2000)
        load = estimator.record_event("s1", response_time_ms=2000)
        assert load == 0.0

    def test_faster_than_baseline_returns_zero(
        self, estimator: CognitiveLoadEstimator
    ):
        estimator.init_session("s1", "u1", "grammar", user_baseline_ms=2000)
        load = estimator.record_event("s1", response_time_ms=1000)
        # (1000 - 2000) / 2000 = -0.5 → clamped to 0.0
        assert load == 0.0

    def test_double_baseline_returns_half(self, estimator: CognitiveLoadEstimator):
        estimator.init_session("s1", "u1", "grammar", user_baseline_ms=2000)
        load = estimator.record_event("s1", response_time_ms=3000)
        # (3000 - 2000) / 2000 = 0.5
        assert load == 0.5

    def test_very_slow_clamped_to_one(self, estimator: CognitiveLoadEstimator):
        estimator.init_session("s1", "u1", "grammar", user_baseline_ms=1000)
        load = estimator.record_event("s1", response_time_ms=10000)
        # (10000 - 1000) / 1000 = 9.0 → clamped to 1.0
        assert load == 1.0


class TestBaselineResolution:
    def test_bucket_baseline_preferred(self, estimator: CognitiveLoadEstimator):
        estimator.init_session(
            "s1",
            "u1",
            "story_engine",
            user_baseline_ms=3000,
            module_baselines={"story_engine": 2500},
            bucket_baselines={"story_engine": {"new": 4000, "known": 1500}},
        )
        # "new" word → should use 4000ms baseline
        load = estimator.record_event(
            "s1", response_time_ms=6000, word_status="new"
        )
        # (6000 - 4000) / 4000 = 0.5
        assert load == 0.5

    def test_module_baseline_fallback(self, estimator: CognitiveLoadEstimator):
        estimator.init_session(
            "s1",
            "u1",
            "story_engine",
            user_baseline_ms=3000,
            module_baselines={"story_engine": 2000},
            bucket_baselines={},
        )
        load = estimator.record_event(
            "s1", response_time_ms=3000, word_status="new"
        )
        # (3000 - 2000) / 2000 = 0.5
        assert load == 0.5

    def test_global_baseline_fallback(self, estimator: CognitiveLoadEstimator):
        estimator.init_session(
            "s1", "u1", "grammar", user_baseline_ms=2000
        )
        load = estimator.record_event("s1", response_time_ms=3000)
        # (3000 - 2000) / 2000 = 0.5
        assert load == 0.5


class TestGetSessionLoad:
    def test_empty_session_returns_defaults(
        self, estimator: CognitiveLoadEstimator
    ):
        estimator.init_session("s1", "u1", "cloze", user_baseline_ms=2000)
        result = estimator.get_session_load("s1")
        assert result is not None
        assert result["currentLoad"] == 0.0
        assert result["trend"] == "stable"
        assert result["recommendedAction"] == "continue"
        assert result["eventCount"] == 0

    def test_unknown_session_returns_none(
        self, estimator: CognitiveLoadEstimator
    ):
        assert estimator.get_session_load("nope") is None

    def test_load_after_events(self, estimator: CognitiveLoadEstimator):
        estimator.init_session("s1", "u1", "grammar", user_baseline_ms=2000)
        for rt in [2000, 2500, 3000, 3500, 4000]:
            estimator.record_event("s1", response_time_ms=rt, sequence=rt)
        result = estimator.get_session_load("s1")
        assert result is not None
        assert result["eventCount"] == 5
        assert result["currentLoad"] == 1.0  # (4000-2000)/2000 = 1.0
        assert result["avgLoad"] > 0

    def test_end_session_break_recommendation(
        self, estimator: CognitiveLoadEstimator
    ):
        estimator.init_session("s1", "u1", "grammar", user_baseline_ms=1000)
        # Push extremely high load
        for i in range(5):
            estimator.record_event("s1", response_time_ms=10000, sequence=i)
        result = estimator.get_session_load("s1")
        assert result is not None
        assert result["recommendedAction"] == "end-session"


class TestTrendDetection:
    def test_increasing_trend(self, estimator: CognitiveLoadEstimator):
        estimator.init_session("s1", "u1", "grammar", user_baseline_ms=2000)
        # Gradually increasing response times
        for i, rt in enumerate([2000, 2200, 2500, 2800, 3200, 3600, 4000, 4500]):
            estimator.record_event("s1", response_time_ms=rt, sequence=i)
        result = estimator.get_session_load("s1")
        assert result is not None
        assert result["trend"] == "increasing"

    def test_decreasing_trend(self, estimator: CognitiveLoadEstimator):
        estimator.init_session("s1", "u1", "grammar", user_baseline_ms=2000)
        # Gradually decreasing response times
        for i, rt in enumerate([4500, 4000, 3600, 3200, 2800, 2500, 2200, 2000]):
            estimator.record_event("s1", response_time_ms=rt, sequence=i)
        result = estimator.get_session_load("s1")
        assert result is not None
        assert result["trend"] == "decreasing"

    def test_stable_trend(self, estimator: CognitiveLoadEstimator):
        estimator.init_session("s1", "u1", "grammar", user_baseline_ms=2000)
        # Steady response times
        for i in range(8):
            estimator.record_event("s1", response_time_ms=2500, sequence=i)
        result = estimator.get_session_load("s1")
        assert result is not None
        assert result["trend"] == "stable"


class TestConsecutiveHighLoad:
    def test_consecutive_high_load_triggers_simplify(
        self, estimator: CognitiveLoadEstimator
    ):
        estimator.init_session("s1", "u1", "grammar", user_baseline_ms=2000)
        # 3 consecutive events with load > 0.6
        # load > 0.6 → rt > 2000 * 1.6 = 3200ms
        for i in range(3):
            estimator.record_event("s1", response_time_ms=3500, sequence=i)
        result = estimator.get_session_load("s1")
        assert result is not None
        assert result["consecutiveHighLoad"] == 3
        assert result["recommendedAction"] == "simplify"

    def test_correct_answer_resets_consecutive(
        self, estimator: CognitiveLoadEstimator
    ):
        estimator.init_session("s1", "u1", "grammar", user_baseline_ms=2000)
        # 2 high-load, 1 low-load, 2 high-load
        estimator.record_event("s1", response_time_ms=3500, sequence=0)
        estimator.record_event("s1", response_time_ms=3500, sequence=1)
        estimator.record_event("s1", response_time_ms=2000, sequence=2)  # reset
        estimator.record_event("s1", response_time_ms=3500, sequence=3)
        estimator.record_event("s1", response_time_ms=3500, sequence=4)

        result = estimator.get_session_load("s1")
        assert result is not None
        assert result["consecutiveHighLoad"] == 2  # not 4


class TestEndSessionReturnsAverage:
    def test_final_load(self, estimator: CognitiveLoadEstimator):
        estimator.init_session("s1", "u1", "grammar", user_baseline_ms=2000)
        estimator.record_event("s1", response_time_ms=2000, sequence=0)  # 0.0
        estimator.record_event("s1", response_time_ms=3000, sequence=1)  # 0.5
        estimator.record_event("s1", response_time_ms=4000, sequence=2)  # 1.0
        final = estimator.end_session("s1")
        assert final is not None
        assert abs(final - 0.5) < 0.01  # avg of [0, 0.5, 1.0] = 0.5
