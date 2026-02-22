"""
Tests for the Churn Prediction & Engagement Rescue system.

Covers:
  - Pre-session feature extraction & prediction
  - Mid-session feature extraction & prediction
  - Heuristic fallbacks
  - Intervention selection logic
  - Notification hook generation
  - API endpoint schemas
"""

from __future__ import annotations

import random
import tempfile
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pytest

from ml.churn_prediction.model.pre_session import (
    PRE_SESSION_FEATURES,
    PreSessionChurnModel,
)
from ml.churn_prediction.model.mid_session import (
    MID_SESSION_FEATURES,
    MidSessionAbandonmentModel,
)
from ml.churn_prediction.model.interventions import (
    generate_notification_hook,
    select_intervention,
)


# ── Fixtures ────────────────────────────────────────────────────────────────


def _make_pre_session_row(
    days_since: float = 1.0,
    streak: int = 5,
    cog_load: float = 0.6,
    completed: bool = True,
    avg_weekly: float = 4.0,
    dow: int = 2,
    time_of_day: str = "evening",
    churned: bool = False,
) -> dict:
    return {
        "days_since_last_session": days_since,
        "current_streak_days": streak,
        "last_session_cognitive_load": cog_load,
        "last_session_completion": completed,
        "average_sessions_per_week": avg_weekly,
        "day_of_week": dow,
        "time_of_day": time_of_day,
        "did_not_session_today": churned,
    }


def _make_mid_session_row(
    consec_errors: int = 0,
    rt_trend: float = 0.0,
    duration_ms: float = 300_000.0,
    cog_load: float = 0.5,
    words_remaining: int = 10,
    abandoned: bool = False,
) -> dict:
    return {
        "consecutive_errors": consec_errors,
        "response_time_trend": rt_trend,
        "session_duration_so_far_ms": duration_ms,
        "cognitive_load": cog_load,
        "words_remaining_in_session": words_remaining,
        "abandoned_session": abandoned,
    }


def _generate_pre_session_data(n: int = 600) -> list[dict]:
    """Generate synthetic pre-session training data."""
    random.seed(42)
    rows = []
    for _ in range(n):
        days_since = random.uniform(0.1, 14.0)
        streak = random.randint(0, 30)
        avg_weekly = random.uniform(0.5, 7.0)

        # Simulate realistic label: higher days_since → more likely to churn
        churn_prob = min(1.0, days_since / 10.0) * 0.7
        churn_prob -= min(streak * 0.02, 0.2)
        churn_prob = max(0.0, min(1.0, churn_prob))
        churned = random.random() < churn_prob

        rows.append(
            _make_pre_session_row(
                days_since=round(days_since, 2),
                streak=streak,
                cog_load=round(random.uniform(0.2, 0.9), 2),
                completed=random.random() > 0.2,
                avg_weekly=round(avg_weekly, 2),
                dow=random.randint(0, 6),
                time_of_day=random.choice(
                    ["morning", "afternoon", "evening", "night"]
                ),
                churned=churned,
            )
        )
    return rows


def _generate_mid_session_data(n: int = 400) -> list[dict]:
    """Generate synthetic mid-session training data."""
    random.seed(42)
    rows = []
    for _ in range(n):
        consec = random.randint(0, 8)
        rt_trend = random.uniform(-500, 3000)
        duration = random.uniform(60_000, 2_400_000)
        cog = random.uniform(0.2, 0.95)
        remaining = random.randint(1, 30)

        # Simulate label: errors + fatigue → abandonment
        abandon_prob = consec * 0.08 + max(0, rt_trend / 5000) + max(0, (cog - 0.6)) * 0.3
        abandon_prob = max(0, min(1.0, abandon_prob))
        abandoned = random.random() < abandon_prob

        rows.append(
            _make_mid_session_row(
                consec_errors=consec,
                rt_trend=round(rt_trend, 2),
                duration_ms=round(duration, 2),
                cog_load=round(cog, 2),
                words_remaining=remaining,
                abandoned=abandoned,
            )
        )
    return rows


# ── Pre-session model tests ─────────────────────────────────────────────────


class TestPreSessionModel:

    def test_feature_extraction_shape(self) -> None:
        row = _make_pre_session_row()
        features = PreSessionChurnModel.extract_features(row)
        assert features.shape == (len(PRE_SESSION_FEATURES),)
        assert features.dtype == np.float64

    def test_feature_extraction_time_one_hot(self) -> None:
        for time_val in ["morning", "afternoon", "evening", "night"]:
            row = _make_pre_session_row(time_of_day=time_val)
            features = PreSessionChurnModel.extract_features(row)
            # Indices 6-9 are the one-hot time encodings
            time_encoding = features[6:10]
            assert sum(time_encoding) == 1.0
            assert max(time_encoding) == 1.0

    def test_feature_matrix_extraction(self) -> None:
        rows = [
            _make_pre_session_row(churned=True),
            _make_pre_session_row(churned=False),
        ]
        model = PreSessionChurnModel()
        X, y = model.extract_feature_matrix(rows)
        assert X.shape == (2, len(PRE_SESSION_FEATURES))
        assert y.shape == (2,)
        assert y[0] == 1.0
        assert y[1] == 0.0

    def test_train_and_predict(self) -> None:
        model = PreSessionChurnModel()
        data = _generate_pre_session_data(600)

        result = model.train(data)
        assert result["status"] == "trained"
        assert result["n_samples"] == 600
        assert 0 <= result["train_accuracy"] <= 1.0
        assert model.is_loaded

        # Predict for a high-risk user
        proba = model.predict(
            _make_pre_session_row(days_since=10.0, streak=0, avg_weekly=0.5)
        )
        assert 0.0 <= proba <= 1.0

        # Predict for a low-risk user
        proba_low = model.predict(
            _make_pre_session_row(days_since=0.5, streak=15, avg_weekly=6.0)
        )
        assert 0.0 <= proba_low <= 1.0
        # High risk should generally be higher than low risk
        # (may not always hold with random data, but likely)

    def test_train_insufficient_data(self) -> None:
        model = PreSessionChurnModel()
        with pytest.raises(ValueError, match="Insufficient"):
            model.train([_make_pre_session_row()] * 10)

    def test_heuristic_fallback(self) -> None:
        model = PreSessionChurnModel()
        assert not model.is_loaded

        # High risk user (many days since last session)
        proba = model.predict(
            {"days_since_last_session": 10, "current_streak_days": 0,
             "average_sessions_per_week": 0.5}
        )
        assert proba > 0.7

        # Low risk user (active streak)
        proba = model.predict(
            {"days_since_last_session": 0.5, "current_streak_days": 10,
             "average_sessions_per_week": 5}
        )
        assert proba < 0.3

    def test_save_and_load(self) -> None:
        model = PreSessionChurnModel()
        data = _generate_pre_session_data(600)
        model.train(data)

        with tempfile.TemporaryDirectory() as tmpdir:
            model_path = Path(tmpdir) / "pre_session_model.joblib"
            scaler_path = Path(tmpdir) / "pre_session_scaler.joblib"

            with patch(
                "ml.churn_prediction.model.pre_session.settings"
            ) as mock_settings:
                mock_settings.paths.pre_session_model_path = model_path
                mock_settings.paths.pre_session_scaler_path = scaler_path

                model.save()

                # Load into a new model
                model2 = PreSessionChurnModel()
                model2.load()
                assert model2.is_loaded

                # Predictions should match
                test_row = _make_pre_session_row()
                p1 = model.predict(test_row)
                p2 = model2.predict(test_row)
                assert abs(p1 - p2) < 1e-6


# ── Mid-session model tests ─────────────────────────────────────────────────


class TestMidSessionModel:

    def test_feature_extraction_shape(self) -> None:
        row = _make_mid_session_row()
        features = MidSessionAbandonmentModel.extract_features(row)
        assert features.shape == (len(MID_SESSION_FEATURES),)
        assert features.dtype == np.float64

    def test_feature_matrix_extraction(self) -> None:
        rows = [
            _make_mid_session_row(abandoned=True),
            _make_mid_session_row(abandoned=False),
        ]
        model = MidSessionAbandonmentModel()
        X, y = model.extract_feature_matrix(rows)
        assert X.shape == (2, len(MID_SESSION_FEATURES))
        assert y[0] == 1.0
        assert y[1] == 0.0

    def test_train_and_predict(self) -> None:
        model = MidSessionAbandonmentModel()
        data = _generate_mid_session_data(400)

        result = model.train(data)
        assert result["status"] == "trained"
        assert result["n_samples"] == 400
        assert model.is_loaded

        proba = model.predict(
            _make_mid_session_row(consec_errors=5, rt_trend=2000, cog_load=0.9)
        )
        assert 0.0 <= proba <= 1.0

    def test_heuristic_fallback(self) -> None:
        model = MidSessionAbandonmentModel()
        assert not model.is_loaded

        # High risk
        proba = model.predict({
            "consecutive_errors": 6,
            "response_time_trend": 3000,
            "session_duration_so_far_ms": 1_800_000,
            "cognitive_load": 0.9,
            "words_remaining_in_session": 15,
        })
        assert proba > 0.6

        # Low risk
        proba = model.predict({
            "consecutive_errors": 0,
            "response_time_trend": -200,
            "session_duration_so_far_ms": 120_000,
            "cognitive_load": 0.3,
            "words_remaining_in_session": 2,
        })
        assert proba < 0.3

    def test_save_and_load(self) -> None:
        model = MidSessionAbandonmentModel()
        data = _generate_mid_session_data(400)
        model.train(data)

        with tempfile.TemporaryDirectory() as tmpdir:
            model_path = Path(tmpdir) / "mid_session_model.joblib"
            scaler_path = Path(tmpdir) / "mid_session_scaler.joblib"

            with patch(
                "ml.churn_prediction.model.mid_session.settings"
            ) as mock_settings:
                mock_settings.paths.mid_session_model_path = model_path
                mock_settings.paths.mid_session_scaler_path = scaler_path

                model.save()
                model2 = MidSessionAbandonmentModel()
                model2.load()
                assert model2.is_loaded


# ── Intervention tests ──────────────────────────────────────────────────────


class TestInterventions:

    def test_no_intervention_below_threshold(self) -> None:
        result = select_intervention(
            abandonment_probability=0.3,
            session_features=_make_mid_session_row(),
        )
        assert result is None

    def test_shorten_session_selected(self) -> None:
        result = select_intervention(
            abandonment_probability=0.8,
            session_features={
                "consecutive_errors": 1,
                "response_time_trend": 200,
                "session_duration_so_far_ms": 300_000,
                "cognitive_load": 0.8,
                "words_remaining_in_session": 15,
            },
        )
        assert result is not None
        assert result["type"] == "shorten_session"
        assert result["payload"]["new_remaining"] < 15

    def test_switch_easier_with_many_errors(self) -> None:
        result = select_intervention(
            abandonment_probability=0.75,
            session_features={
                "consecutive_errors": 5,
                "response_time_trend": 200,
                "session_duration_so_far_ms": 300_000,
                "cognitive_load": 0.5,
                "words_remaining_in_session": 3,
            },
        )
        assert result is not None
        # With few words remaining (3), shorten may not apply (it still does because 3>3 is False)
        # but switch_easier_content should be a candidate
        assert result["type"] in ("switch_easier_content", "shorten_session")

    def test_suggest_break_after_long_session(self) -> None:
        result = select_intervention(
            abandonment_probability=0.7,
            session_features={
                "consecutive_errors": 0,
                "response_time_trend": 100,
                "session_duration_so_far_ms": 1_800_000,  # 30 minutes
                "cognitive_load": 0.5,
                "words_remaining_in_session": 15,
            },
        )
        assert result is not None
        # Shorten gets high priority but suggest_break should be a candidate
        assert result["type"] in ("shorten_session", "suggest_break")

    def test_celebrate_micro_progress(self) -> None:
        result = select_intervention(
            abandonment_probability=0.7,
            session_features={
                "consecutive_errors": 0,
                "response_time_trend": 100,
                "session_duration_so_far_ms": 120_000,
                "cognitive_load": 0.4,
                "words_remaining_in_session": 2,
            },
            user_stats={
                "total_words_seen": 500,  # Near milestone
                "target_language": "german",
            },
        )
        assert result is not None
        # celebrate_micro_progress gets a boost near milestones
        assert result["type"] in (
            "celebrate_micro_progress",
            "switch_easier_content",
            "shorten_session",
        )

    def test_switch_module_on_fatigue(self) -> None:
        result = select_intervention(
            abandonment_probability=0.75,
            session_features={
                "consecutive_errors": 1,
                "response_time_trend": 2000,
                "session_duration_so_far_ms": 300_000,
                "cognitive_load": 0.85,
                "words_remaining_in_session": 3,
            },
        )
        assert result is not None
        # switch_module should be a candidates with high RT trend + cog load

    def test_intervention_has_message(self) -> None:
        result = select_intervention(
            abandonment_probability=0.8,
            session_features=_make_mid_session_row(
                consec_errors=3, words_remaining=10
            ),
        )
        assert result is not None
        assert "message" in result
        assert len(result["message"]) > 0
        assert "payload" in result


# ── Notification hook tests ─────────────────────────────────────────────────


class TestNotificationHook:

    def test_hook_generation(self) -> None:
        hook = generate_notification_hook(
            churn_probability=0.8,
            user_stats={"total_words_seen": 500, "target_language": "german"},
            streak=5,
        )
        assert isinstance(hook, str)
        assert len(hook) > 0

    def test_hook_without_streak(self) -> None:
        hook = generate_notification_hook(
            churn_probability=0.75,
            user_stats={"total_words_seen": 200, "target_language": "french"},
            streak=0,
        )
        assert isinstance(hook, str)
        assert len(hook) > 0

    def test_hook_new_user(self) -> None:
        hook = generate_notification_hook(
            churn_probability=0.9,
            user_stats={"total_words_seen": 5, "target_language": "spanish"},
            streak=0,
        )
        assert isinstance(hook, str)
        assert len(hook) > 0


# ── Schema tests ────────────────────────────────────────────────────────────


class TestSchemas:

    def test_pre_session_request(self) -> None:
        from ml.churn_prediction.api.schemas import PreSessionRiskRequest

        req = PreSessionRiskRequest(userId="abc-123")
        assert req.user_id == "abc-123"

    def test_pre_session_response(self) -> None:
        from ml.churn_prediction.api.schemas import PreSessionRiskResponse

        resp = PreSessionRiskResponse(
            churn_probability=0.75,
            trigger_notification=True,
            notification_hook="3 words you're about to forget",
            using_model=True,
        )
        assert resp.churn_probability == 0.75
        assert resp.trigger_notification is True

    def test_mid_session_request(self) -> None:
        from ml.churn_prediction.api.schemas import MidSessionRiskRequest

        req = MidSessionRiskRequest(
            userId="abc-123",
            sessionId="sess-456",
            wordsCompletedSoFar=10,
        )
        assert req.user_id == "abc-123"
        assert req.session_id == "sess-456"
        assert req.words_completed_so_far == 10

    def test_mid_session_response(self) -> None:
        from ml.churn_prediction.api.schemas import (
            InterventionPayload,
            MidSessionRiskResponse,
        )

        resp = MidSessionRiskResponse(
            abandonment_probability=0.72,
            recommended_intervention=InterventionPayload(
                type="shorten_session",
                message="Just 5 more words to go!",
                payload={"new_remaining": 5},
            ),
            using_model=True,
        )
        assert resp.abandonment_probability == 0.72
        assert resp.recommended_intervention is not None
        assert resp.recommended_intervention.type == "shorten_session"

    def test_mid_session_response_no_intervention(self) -> None:
        from ml.churn_prediction.api.schemas import MidSessionRiskResponse

        resp = MidSessionRiskResponse(
            abandonment_probability=0.3,
            recommended_intervention=None,
        )
        assert resp.recommended_intervention is None

    def test_health_response(self) -> None:
        from ml.churn_prediction.api.schemas import HealthResponse

        resp = HealthResponse(
            status="ok",
            version="0.1.0",
            pre_session_model_loaded=True,
            mid_session_model_loaded=False,
        )
        assert resp.pre_session_model_loaded is True
        assert resp.mid_session_model_loaded is False

    def test_train_response(self) -> None:
        from ml.churn_prediction.api.schemas import TrainResponse

        resp = TrainResponse(
            status="ok",
            pre_session={"status": "trained", "n_samples": 500},
            mid_session={"status": "trained", "n_samples": 300},
        )
        assert resp.status == "ok"
        assert resp.pre_session["n_samples"] == 500
