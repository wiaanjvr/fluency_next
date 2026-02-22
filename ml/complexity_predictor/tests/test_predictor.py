"""
Unit tests for the ComplexityPredictor inference engine.
"""

from __future__ import annotations

import numpy as np
import pytest

from ml.complexity_predictor.inference.predictor import ComplexityPredictor


@pytest.fixture
def predictor() -> ComplexityPredictor:
    return ComplexityPredictor()


class TestHeuristicPrediction:
    """Tests for the heuristic fallback when no model is loaded."""

    def test_default_fallback(self, predictor):
        result = predictor._heuristic_fallback("user-123")
        assert result["complexityLevel"] == 1
        assert result["recommendedWordCount"] == 40
        assert result["confidence"] == 0.2
        assert result["usingModel"] is False

    def test_heuristic_with_features(self, predictor):
        features = np.array(
            [1.0, 3.0, 0.7, 0.35, 0.85, 1.8, 0.78, 0.7],
            dtype=np.float32,
        )
        feature_dict = {
            "time_of_day": 1.0,
            "day_of_week": 3.0,
            "days_since_last_session": 0.7,
            "last_session_cognitive_load": 0.35,
            "last_session_completion_rate": 0.85,
            "current_streak_days": 1.8,
            "avg_performance_last_7_days": 0.78,
            "p_recall_avg": 0.7,
        }
        result = predictor._heuristic_prediction(features, feature_dict)
        assert 1 <= result["complexityLevel"] <= 5
        assert result["recommendedWordCount"] >= 20
        assert result["confidence"] == 0.3

    def test_heuristic_high_recall_increases_complexity(self, predictor):
        # High p_recall should push complexity up
        features_high = np.array(
            [1.0, 3.0, 0.7, 0.3, 0.9, 1.8, 0.9, 0.9],
            dtype=np.float32,
        )
        dict_high = {
            "time_of_day": 1.0,
            "day_of_week": 3.0,
            "days_since_last_session": 0.7,
            "last_session_cognitive_load": 0.3,
            "last_session_completion_rate": 0.9,
            "current_streak_days": 1.8,
            "avg_performance_last_7_days": 0.9,
            "p_recall_avg": 0.9,
        }

        features_low = np.array(
            [1.0, 3.0, 0.7, 0.3, 0.9, 1.8, 0.9, 0.3],
            dtype=np.float32,
        )
        dict_low = {**dict_high, "p_recall_avg": 0.3}

        result_high = predictor._heuristic_prediction(features_high, dict_high)
        result_low = predictor._heuristic_prediction(features_low, dict_low)

        assert result_high["complexityLevel"] >= result_low["complexityLevel"]

    def test_heuristic_high_cognitive_load_decreases_complexity(self, predictor):
        features = np.array(
            [1.0, 3.0, 0.7, 0.7, 0.5, 0.7, 0.5, 0.6],
            dtype=np.float32,
        )
        feature_dict = {
            "time_of_day": 1.0,
            "day_of_week": 3.0,
            "days_since_last_session": 0.7,
            "last_session_cognitive_load": 0.7,
            "last_session_completion_rate": 0.5,
            "current_streak_days": 0.7,
            "avg_performance_last_7_days": 0.5,
            "p_recall_avg": 0.6,
        }
        result = predictor._heuristic_prediction(features, feature_dict)
        # High cognitive load should bring complexity down
        assert result["complexityLevel"] <= 2

    def test_complexity_always_in_valid_range(self, predictor):
        """Fuzz test: random features should always produce valid output."""
        for _ in range(100):
            features = np.random.rand(8).astype(np.float32)
            feature_dict = {
                "time_of_day": float(features[0]),
                "day_of_week": float(features[1]),
                "days_since_last_session": float(features[2]),
                "last_session_cognitive_load": float(features[3]),
                "last_session_completion_rate": float(features[4]),
                "current_streak_days": float(features[5]),
                "avg_performance_last_7_days": float(features[6]),
                "p_recall_avg": float(features[7]),
            }
            result = predictor._heuristic_prediction(features, feature_dict)
            assert 1 <= result["complexityLevel"] <= 5
            assert 20 <= result["recommendedWordCount"] <= 120
            assert 3.0 <= result["recommendedDurationMinutes"] <= 25.0


class TestModelNotLoaded:
    def test_is_loaded_false_initially(self, predictor):
        assert predictor.is_loaded is False

    def test_load_nonexistent_raises(self, predictor):
        with pytest.raises((FileNotFoundError, RuntimeError)):
            predictor.load()
