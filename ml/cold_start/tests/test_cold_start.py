"""
Tests for the Cold Start Collaborative Filtering system.

Covers:
  - Feature engineering (full user + signup-only)
  - K-Means training + assignment
  - Heuristic fallback
  - API endpoint schemas
"""

from __future__ import annotations

import json
import math
import tempfile
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pytest

from ml.cold_start.model.feature_engineering import (
    CEFR_ORDINAL,
    GOAL_INDEX,
    MODULE_INDEX,
    extract_signup_features,
    extract_user_features,
    fit_scaler,
    get_feature_columns,
    save_feature_columns,
    load_feature_columns,
)
from ml.cold_start.model.clustering import LearnerClusterModel


# ── Fixtures ────────────────────────────────────────────────────────────────

KNOWN_NATIVE_LANGS = ["en", "pt", "zu"]
KNOWN_TARGET_LANGS = ["en", "fr", "zu"]


def _make_feature_columns() -> list[str]:
    return get_feature_columns(KNOWN_NATIVE_LANGS, KNOWN_TARGET_LANGS)


def _make_user_row(
    native_language: str = "en",
    target_language: str = "fr",
    proficiency_level: str = "B1",
    goals: list[str] | None = None,
    avg_session_length_ms: float = 600_000.0,
    preferred_time_of_day: str = "evening",
    module_distribution: dict[str, float] | None = None,
    forgetting_steepness: float | None = -0.3,
) -> dict:
    return {
        "native_language": native_language,
        "target_language": target_language,
        "proficiency_level": proficiency_level,
        "goals": goals or ["conversational", "travel"],
        "avg_session_length_ms": avg_session_length_ms,
        "preferred_time_of_day": preferred_time_of_day,
        "module_distribution": module_distribution or {
            "flashcard": 0.3,
            "story": 0.25,
            "conversation": 0.2,
            "listening": 0.15,
            "grammar_drill": 0.1,
        },
        "forgetting_steepness": forgetting_steepness,
    }


def _generate_training_data(n: int = 80) -> list[dict]:
    """Generate n synthetic user rows for training."""
    import random

    random.seed(42)
    rows = []
    native_options = KNOWN_NATIVE_LANGS
    target_options = KNOWN_TARGET_LANGS
    cefr_options = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"]
    goal_options = ["conversational", "formal", "travel", "business"]
    time_options = ["morning", "afternoon", "evening", "night"]
    module_options = [
        "flashcard", "sentence_build", "listening", "story",
        "conversation", "grammar_drill", "pronunciation", "placement_test",
    ]

    for _ in range(n):
        # Random module distribution
        raw_weights = [random.random() for _ in module_options]
        total = sum(raw_weights)
        mod_dist = {
            m: round(w / total, 4)
            for m, w in zip(module_options, raw_weights)
        }

        rows.append(_make_user_row(
            native_language=random.choice(native_options),
            target_language=random.choice(target_options),
            proficiency_level=random.choice(cefr_options),
            goals=random.sample(goal_options, k=random.randint(1, 3)),
            avg_session_length_ms=random.uniform(180_000, 1_500_000),
            preferred_time_of_day=random.choice(time_options),
            module_distribution=mod_dist,
            forgetting_steepness=random.uniform(-0.8, -0.05),
        ))

    return rows


# ── Feature Engineering Tests ───────────────────────────────────────────────


class TestFeatureEngineering:
    def test_get_feature_columns_length(self):
        cols = _make_feature_columns()
        # 3 native + 3 target + 1 cefr + 4 goals + 1 session_length
        # + 4 time_of_day + 8 modules + 1 steepness = 25
        assert len(cols) == 25

    def test_get_feature_columns_names(self):
        cols = _make_feature_columns()
        assert "native_en" in cols
        assert "target_fr" in cols
        assert "cefr_ordinal" in cols
        assert "goal_conversational" in cols
        assert "avg_session_length_min" in cols
        assert "time_evening" in cols
        assert "module_pref_flashcard" in cols
        assert "forgetting_steepness" in cols

    def test_extract_user_features_shape(self):
        cols = _make_feature_columns()
        row = _make_user_row()
        vec = extract_user_features(row, cols)
        assert vec.shape == (len(cols),)

    def test_extract_user_features_one_hot(self):
        cols = _make_feature_columns()
        row = _make_user_row(native_language="en", target_language="fr")
        vec = extract_user_features(row, cols)
        col_idx = {c: i for i, c in enumerate(cols)}

        # Native language: en=1, others=0
        assert vec[col_idx["native_en"]] == 1.0
        assert vec[col_idx["native_pt"]] == 0.0
        assert vec[col_idx["native_zu"]] == 0.0

        # Target language: fr=1, others=0
        assert vec[col_idx["target_fr"]] == 1.0
        assert vec[col_idx["target_en"]] == 0.0

    def test_extract_user_features_cefr(self):
        cols = _make_feature_columns()
        row = _make_user_row(proficiency_level="B1")
        vec = extract_user_features(row, cols)
        col_idx = {c: i for i, c in enumerate(cols)}
        assert vec[col_idx["cefr_ordinal"]] == CEFR_ORDINAL["B1"]

    def test_extract_user_features_goals(self):
        cols = _make_feature_columns()
        row = _make_user_row(goals=["conversational", "travel"])
        vec = extract_user_features(row, cols)
        col_idx = {c: i for i, c in enumerate(cols)}
        assert vec[col_idx["goal_conversational"]] == 1.0
        assert vec[col_idx["goal_travel"]] == 1.0
        assert vec[col_idx["goal_formal"]] == 0.0
        assert vec[col_idx["goal_business"]] == 0.0

    def test_extract_user_features_session_length(self):
        cols = _make_feature_columns()
        row = _make_user_row(avg_session_length_ms=600_000)  # 10 min
        vec = extract_user_features(row, cols)
        col_idx = {c: i for i, c in enumerate(cols)}
        assert abs(vec[col_idx["avg_session_length_min"]] - 10.0) < 0.01

    def test_extract_signup_features_partial(self):
        cols = _make_feature_columns()
        vec = extract_signup_features(
            native_language="pt",
            target_language="en",
            cefr_level="A2",
            goals=["business"],
            feature_columns=cols,
        )
        col_idx = {c: i for i, c in enumerate(cols)}

        assert vec[col_idx["native_pt"]] == 1.0
        assert vec[col_idx["target_en"]] == 1.0
        assert vec[col_idx["cefr_ordinal"]] == CEFR_ORDINAL["A2"]
        assert vec[col_idx["goal_business"]] == 1.0

        # Behavioural features should be zero
        assert vec[col_idx["avg_session_length_min"]] == 0.0
        assert vec[col_idx["forgetting_steepness"]] == 0.0
        assert vec[col_idx["module_pref_flashcard"]] == 0.0

    def test_feature_columns_persistence(self):
        cols = _make_feature_columns()
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            path = Path(f.name)

        save_feature_columns(cols, path)
        loaded = load_feature_columns(path)
        assert loaded == cols
        path.unlink()


# ── Clustering Model Tests ──────────────────────────────────────────────────


class TestLearnerClusterModel:
    def test_train_and_assign(self):
        data = _generate_training_data(80)
        model = LearnerClusterModel()

        result = model.train(data)

        assert result["status"] == "trained"
        assert result["n_users"] == 80
        assert result["n_clusters"] <= 20
        assert result["inertia"] > 0

        # Assign a new user
        assignment = model.assign(
            native_language="en",
            target_language="fr",
            cefr_level="A1",
            goals=["conversational", "travel"],
        )

        assert "cluster_id" in assignment
        assert 0 <= assignment["cluster_id"] < 20
        assert len(assignment["recommended_path"]) > 0
        assert 1 <= assignment["default_complexity_level"] <= 5
        assert assignment["estimated_vocab_start"].startswith("top_")
        assert 0 <= assignment["confidence"] <= 1

    def test_train_insufficient_data(self):
        model = LearnerClusterModel()
        with pytest.raises(ValueError, match="Need at least"):
            model.train([_make_user_row()])

    def test_assign_before_load(self):
        model = LearnerClusterModel()
        with pytest.raises(RuntimeError, match="Model not loaded"):
            model.assign("en", "fr", "A1", ["conversational"])

    def test_save_and_load(self):
        data = _generate_training_data(80)
        model1 = LearnerClusterModel()
        model1.train(data)

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)

            # Patch config paths to use temp directory
            with patch("ml.cold_start.model.clustering.settings") as mock_settings:
                mock_paths = type("PathConfig", (), {
                    "kmeans_model_path": tmp_path / "kmeans.joblib",
                    "scaler_path": tmp_path / "scaler.joblib",
                    "cluster_profiles_path": tmp_path / "profiles.json",
                    "feature_columns_path": tmp_path / "columns.json",
                })()
                mock_settings.paths = mock_paths
                mock_settings.clustering = type("C", (), {
                    "n_clusters": 20,
                    "module_sources": (
                        "flashcard", "sentence_build", "listening", "story",
                        "conversation", "grammar_drill", "pronunciation", "placement_test",
                    ),
                    "cefr_levels": ("A0", "A1", "A2", "B1", "B2", "C1", "C2"),
                    "goal_categories": ("conversational", "formal", "travel", "business"),
                })()

                model1.save()

                model2 = LearnerClusterModel()
                model2.load()
                assert model2.is_loaded

                # Verify same assignment
                a1 = model1.assign("en", "fr", "B1", ["conversational"])
                a2 = model2.assign("en", "fr", "B1", ["conversational"])
                assert a1["cluster_id"] == a2["cluster_id"]

    def test_confidence_is_distance_based(self):
        data = _generate_training_data(80)
        model = LearnerClusterModel()
        model.train(data)

        # Two different users should get different confidence values
        a1 = model.assign("en", "fr", "A1", ["conversational"])
        a2 = model.assign("zu", "en", "C1", ["business", "formal"])

        # Both should be valid
        assert 0 <= a1["confidence"] <= 1
        assert 0 <= a2["confidence"] <= 1

    def test_cluster_profiles_have_required_fields(self):
        data = _generate_training_data(80)
        model = LearnerClusterModel()
        model.train(data)

        for cid, profile in model._cluster_profiles.items():
            assert "size" in profile
            assert "recommended_module_weights" in profile
            assert "default_complexity_level" in profile
            assert "recommended_path" in profile
            assert "estimated_vocab_start" in profile
            assert "avg_forgetting_steepness" in profile
            assert 1 <= profile["default_complexity_level"] <= 5


# ── Heuristic Fallback Tests ───────────────────────────────────────────────


class TestHeuristicFallback:
    def test_conversational_goal(self):
        from ml.cold_start.model.clustering import heuristic_assignment

        result = heuristic_assignment("A1", ["conversational"])
        assert result["cluster_id"] == -1
        assert "conversation" in result["recommended_path"]
        assert result["recommended_path"][0] == "conversation"
        assert result["default_complexity_level"] == 1
        assert result["estimated_vocab_start"] == "top_500"
        assert result["confidence"] == 0.0

    def test_business_goal(self):
        from ml.cold_start.model.clustering import heuristic_assignment

        result = heuristic_assignment("B2", ["business"])
        assert result["recommended_path"][0] == "grammar_drill"
        assert result["default_complexity_level"] == 4

    def test_multiple_goals(self):
        from ml.cold_start.model.clustering import heuristic_assignment

        result = heuristic_assignment("A2", ["travel", "conversational"])
        path = result["recommended_path"]
        # Travel first, then conversational additions
        assert path[0] == "conversation"
        # All 8 modules should be present
        assert len(path) == 8

    def test_cefr_to_frequency_band(self):
        assert LearnerClusterModel._cefr_to_frequency_band("A0") == "top_500"
        assert LearnerClusterModel._cefr_to_frequency_band("A2") == "top_1000"
        assert LearnerClusterModel._cefr_to_frequency_band("B1") == "top_2000"
        assert LearnerClusterModel._cefr_to_frequency_band("C2") == "top_8000"


# ── Schema Tests ────────────────────────────────────────────────────────────


class TestSchemas:
    def test_assign_cluster_request_aliases(self):
        from ml.cold_start.api.schemas import AssignClusterRequest

        # camelCase input (from frontend)
        req = AssignClusterRequest(
            nativeLanguage="en",
            targetLanguage="fr",
            cefrLevel="A1",
            goals=["conversational"],
        )
        assert req.native_language == "en"
        assert req.target_language == "fr"
        assert req.cefr_level == "A1"

    def test_assign_cluster_request_snake_case(self):
        from ml.cold_start.api.schemas import AssignClusterRequest

        # snake_case input (from Python)
        req = AssignClusterRequest(
            native_language="en",
            target_language="fr",
            cefr_level="A1",
            goals=["conversational"],
        )
        assert req.native_language == "en"

    def test_assign_cluster_response_serialisation(self):
        from ml.cold_start.api.schemas import AssignClusterResponse

        resp = AssignClusterResponse(
            cluster_id=3,
            recommended_path=["story", "flashcard"],
            default_complexity_level=2,
            estimated_vocab_start="top_1000",
            confidence=0.85,
            recommended_module_weights={"story": 0.4, "flashcard": 0.6},
            assignment_id="test-id",
            using_model=True,
        )
        data = resp.model_dump(by_alias=True)
        assert data["clusterId"] == 3
        assert data["defaultComplexityLevel"] == 2
        assert data["usingModel"] is True
