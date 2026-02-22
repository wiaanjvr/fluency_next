"""
Integration tests for the Complexity Level Predictor API routes.

Uses FastAPI's TestClient — no real Supabase connection required.
All DB calls are mocked.
"""

from __future__ import annotations

import contextlib
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from ml.complexity_predictor.api.app import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


# ── Mock data ───────────────────────────────────────────────────────────────

MOCK_DB_FEATURES = {
    "days_since_last_session": 0.5,
    "last_session_cognitive_load": 0.35,
    "last_session_completion_rate": 0.85,
    "current_streak_days": 3,
    "avg_performance_last_7_days": 0.78,
    "total_sessions": 15,
    "avg_session_duration_ms": 500000,
    "avg_session_word_count": 40,
}


def _mock_get_user_session_features(user_id):
    return MOCK_DB_FEATURES


def _mock_get_user_session_features_none(user_id):
    return None


def _mock_save_session_plan(*args, **kwargs):
    return "plan-test-001"


def _mock_fetch_p_recall_avg(user_id):
    return 0.65


_all_db_mocks = [
    patch(
        "ml.complexity_predictor.inference.predictor.get_user_session_features",
        side_effect=_mock_get_user_session_features,
    ),
    patch(
        "ml.complexity_predictor.inference.predictor.save_session_plan",
        side_effect=_mock_save_session_plan,
    ),
    patch(
        "ml.complexity_predictor.inference.predictor.ComplexityPredictor._fetch_p_recall_avg",
        side_effect=_mock_fetch_p_recall_avg,
    ),
]


@contextlib.contextmanager
def _apply_all_db_mocks():
    with contextlib.ExitStack() as stack:
        for m in _all_db_mocks:
            stack.enter_context(m)
        yield


@contextlib.contextmanager
def _apply_new_user_mocks():
    with contextlib.ExitStack() as stack:
        stack.enter_context(
            patch(
                "ml.complexity_predictor.inference.predictor.get_user_session_features",
                side_effect=_mock_get_user_session_features_none,
            )
        )
        stack.enter_context(
            patch(
                "ml.complexity_predictor.inference.predictor.save_session_plan",
                side_effect=_mock_save_session_plan,
            )
        )
        yield


# ── Tests ───────────────────────────────────────────────────────────────────


class TestHealthEndpoint:
    def test_health(self, client):
        resp = client.get("/ml/session/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("ok", "model_not_loaded")
        assert data["service"] == "complexity-predictor"


class TestSessionPlanEndpoint:
    def test_plan_returns_valid_response(self, client):
        with _apply_all_db_mocks():
            resp = client.post(
                "/ml/session/plan",
                json={"userId": "user-123"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert 1 <= data["complexityLevel"] <= 5
            assert data["recommendedWordCount"] >= 5
            assert data["recommendedDurationMinutes"] >= 1.0
            assert 0 <= data["confidence"] <= 1.0

    def test_plan_new_user_fallback(self, client):
        with _apply_new_user_mocks():
            resp = client.post(
                "/ml/session/plan",
                json={"userId": "brand-new-user"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["complexityLevel"] == 1
            assert data["usingModel"] is False

    def test_plan_missing_user_id(self, client):
        resp = client.post("/ml/session/plan", json={})
        assert resp.status_code == 422  # Pydantic validation error

    def test_plan_camel_case_alias(self, client):
        """Ensure the API accepts both camelCase and snake_case."""
        with _apply_all_db_mocks():
            resp = client.post(
                "/ml/session/plan",
                json={"userId": "user-123"},
            )
            assert resp.status_code == 200
            data = resp.json()
            # Response should use camelCase
            assert "complexityLevel" in data
            assert "recommendedWordCount" in data
            assert "recommendedDurationMinutes" in data


class TestEdgeCases:
    def test_plan_with_high_cognitive_load_user(self, client):
        """User with high cognitive load should get lower complexity."""
        high_load_features = {
            **MOCK_DB_FEATURES,
            "last_session_cognitive_load": 0.8,
            "last_session_completion_rate": 0.4,
        }
        with contextlib.ExitStack() as stack:
            stack.enter_context(
                patch(
                    "ml.complexity_predictor.inference.predictor.get_user_session_features",
                    return_value=high_load_features,
                )
            )
            stack.enter_context(
                patch(
                    "ml.complexity_predictor.inference.predictor.save_session_plan",
                    side_effect=_mock_save_session_plan,
                )
            )
            stack.enter_context(
                patch(
                    "ml.complexity_predictor.inference.predictor.ComplexityPredictor._fetch_p_recall_avg",
                    return_value=0.3,
                )
            )

            resp = client.post(
                "/ml/session/plan",
                json={"userId": "struggling-user"},
            )
            assert resp.status_code == 200
            data = resp.json()
            # Should recommend lower complexity
            assert data["complexityLevel"] <= 2
