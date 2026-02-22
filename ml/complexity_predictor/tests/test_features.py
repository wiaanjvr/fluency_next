"""
Unit tests for the feature engineering module.
"""

from __future__ import annotations

import numpy as np
import pytest

from ml.complexity_predictor.data.feature_engineering import (
    FEATURE_NAMES,
    NUM_FEATURES,
    extract_features,
    extract_training_features,
    features_to_dict,
)


class TestExtractFeatures:
    """Tests for the extract_features function."""

    @pytest.fixture
    def db_features(self) -> dict:
        return {
            "days_since_last_session": 1.5,
            "last_session_cognitive_load": 0.4,
            "last_session_completion_rate": 0.85,
            "current_streak_days": 5,
            "avg_performance_last_7_days": 0.78,
            "total_sessions": 20,
            "avg_session_duration_ms": 600000,
            "avg_session_word_count": 45,
        }

    def test_output_shape(self, db_features):
        features = extract_features(db_features, p_recall_avg=0.7)
        assert features.shape == (NUM_FEATURES,)
        assert features.dtype == np.float32

    def test_feature_count_matches_names(self):
        assert NUM_FEATURES == len(FEATURE_NAMES)

    def test_time_of_day_override(self, db_features):
        features = extract_features(
            db_features, p_recall_avg=0.7, time_of_day="morning"
        )
        assert features[0] == 0.0  # morning = 0

        features = extract_features(
            db_features, p_recall_avg=0.7, time_of_day="night"
        )
        assert features[0] == 3.0  # night = 3

    def test_day_of_week_override(self, db_features):
        features = extract_features(
            db_features, p_recall_avg=0.7, day_of_week=5
        )
        assert features[1] == 5.0

    def test_cognitive_load_clamped(self, db_features):
        db_features["last_session_cognitive_load"] = 2.5
        features = extract_features(db_features, p_recall_avg=0.7)
        assert features[3] <= 1.0

    def test_p_recall_default_when_none(self, db_features):
        features = extract_features(db_features, p_recall_avg=None)
        # Should use default_p_recall_avg (0.6)
        assert features[7] == pytest.approx(0.6, abs=0.01)

    def test_features_to_dict_roundtrip(self, db_features):
        features = extract_features(db_features, p_recall_avg=0.7)
        d = features_to_dict(features)
        assert set(d.keys()) == set(FEATURE_NAMES)
        for i, name in enumerate(FEATURE_NAMES):
            assert d[name] == pytest.approx(features[i], abs=1e-5)

    def test_missing_db_features_uses_defaults(self):
        features = extract_features({}, p_recall_avg=0.5)
        assert features.shape == (NUM_FEATURES,)
        # Should not raise even with empty dict


class TestExtractTrainingFeatures:
    """Tests for the extract_training_features function."""

    def test_valid_row(self):
        row = {
            "story_complexity_level": 3,
            "time_of_day": "afternoon",
            "day_of_week": 2,
            "days_since_last_session": 0.5,
            "last_session_cognitive_load": 0.35,
            "last_session_completion_rate": 0.9,
            "current_streak_days": 3,
            "avg_performance_last_7_days": 0.8,
            "actual_cognitive_load": 0.4,
            "actual_completion_rate": 0.85,
            "session_word_count": 50,
            "session_duration_ms": 600000,
        }
        result = extract_training_features(row)
        assert result is not None
        assert result["complexity_level"] == 3
        assert result["features"].shape == (NUM_FEATURES,)
        assert result["word_count"] == 50
        assert result["duration_minutes"] == pytest.approx(10.0, abs=0.1)

    def test_missing_complexity_returns_none(self):
        row = {"story_complexity_level": None}
        assert extract_training_features(row) is None

    def test_zero_complexity_returns_none(self):
        row = {"story_complexity_level": 0}
        assert extract_training_features(row) is None

    def test_is_optimal_flag(self):
        # Optimal: cognitive load in [0.25, 0.50] and completion >= 0.75
        row = {
            "story_complexity_level": 2,
            "actual_cognitive_load": 0.35,
            "actual_completion_rate": 0.85,
            "time_of_day": "morning",
            "day_of_week": 1,
        }
        result = extract_training_features(row)
        assert result is not None
        assert result["is_optimal"] is True

    def test_not_optimal_high_load(self):
        row = {
            "story_complexity_level": 3,
            "actual_cognitive_load": 0.7,
            "actual_completion_rate": 0.85,
            "time_of_day": "evening",
            "day_of_week": 3,
        }
        result = extract_training_features(row)
        assert result is not None
        assert result["is_optimal"] is False
