"""
Integration tests for the Cognitive Load Estimator API routes.

Uses FastAPI's TestClient — no real Supabase connection required.
All DB calls are mocked.
"""

from __future__ import annotations

import contextlib
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from ml.cognitive_load.api.app import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


# ---------------------------------------------------------------------------
# Mock DB calls for init_session
# ---------------------------------------------------------------------------

MOCK_BASELINE = {
    "user_id": "user-123",
    "avg_response_time_ms": 2000.0,
    "total_sessions": 5,
    "last_session_at": None,
}


def _mock_get_user_baseline(user_id: str):
    return MOCK_BASELINE


def _mock_get_module_baselines(user_id: str):
    return {"story_engine": 2500.0, "flashcards": 1800.0}


def _mock_get_difficulty_baselines(user_id: str):
    return {"story_engine": {"new": 4000.0, "known": 1500.0}}


def _mock_update_session_cognitive_load(session_id: str, load: float):
    pass


def _mock_get_session_summary(session_id: str):
    """Return None for unknown sessions (blocks DB reconstruction)."""
    return None


def _mock_get_session_events(session_id: str):
    return []


def _mock_get_word_statuses(user_id: str, word_ids: list):
    return {}


# Decorator stack to mock all DB calls
_all_db_mocks = [
    patch(
        "ml.cognitive_load.api.routes.get_user_baseline",
        side_effect=_mock_get_user_baseline,
    ),
    patch(
        "ml.cognitive_load.api.routes.get_module_baselines",
        side_effect=_mock_get_module_baselines,
    ),
    patch(
        "ml.cognitive_load.api.routes.get_difficulty_bucket_baselines",
        side_effect=_mock_get_difficulty_baselines,
    ),
    patch(
        "ml.cognitive_load.api.routes.update_session_cognitive_load",
        side_effect=_mock_update_session_cognitive_load,
    ),
    patch(
        "ml.cognitive_load.api.routes.get_session_summary",
        side_effect=_mock_get_session_summary,
    ),
    patch(
        "ml.cognitive_load.api.routes.get_session_events",
        side_effect=_mock_get_session_events,
    ),
    patch(
        "ml.cognitive_load.api.routes.get_word_statuses",
        side_effect=_mock_get_word_statuses,
    ),
]


@contextlib.contextmanager
def _apply_all_db_mocks():
    """Apply all DB mocks as a single context manager."""
    with contextlib.ExitStack() as stack:
        for m in _all_db_mocks:
            stack.enter_context(m)
        yield


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestHealthEndpoint:
    def test_health(self, client: TestClient):
        resp = client.get("/ml/cognitive-load/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "cognitive-load-estimator"


class TestFullSessionFlow:
    """End-to-end test: init → record events → query load → end."""

    def test_session_lifecycle(self, client: TestClient):
        with _apply_all_db_mocks():
            session_id = "test-session-001"

            # 1. Init session
            resp = client.post(
                "/ml/cognitive-load/session/init",
                json={
                    "sessionId": session_id,
                    "userId": "user-123",
                    "moduleSource": "story_engine",
                },
            )
            assert resp.status_code == 200
            assert resp.json()["sessionId"] == session_id

            # 2. Record some events
            events = [
                {"sessionId": session_id, "responseTimeMs": 2000, "sequence": 0},
                {"sessionId": session_id, "responseTimeMs": 3000, "sequence": 1},
                {"sessionId": session_id, "responseTimeMs": 4000, "sequence": 2},
                {"sessionId": session_id, "responseTimeMs": 5000, "sequence": 3},
            ]
            for ev in events:
                resp = client.post("/ml/cognitive-load/session/event", json=ev)
                assert resp.status_code == 200

            # 3. Query session load
            resp = client.get(f"/ml/cognitive-load/session/{session_id}")
            assert resp.status_code == 200
            data = resp.json()
            assert data["eventCount"] == 4
            assert 0 <= data["currentLoad"] <= 1.0
            assert data["trend"] in ("increasing", "stable", "decreasing")
            assert data["recommendedAction"] in (
                "continue",
                "simplify",
                "end-session",
            )

            # 4. End session
            resp = client.post(
                "/ml/cognitive-load/session/end",
                json={"sessionId": session_id},
            )
            assert resp.status_code == 200
            result = resp.json()
            assert result["sessionId"] == session_id
            assert result["finalCognitiveLoad"] is not None

            # Session should now be gone (and DB returns None)
            resp = client.get(f"/ml/cognitive-load/session/{session_id}")
            assert resp.status_code == 404


class TestEdgeCases:
    def test_get_nonexistent_session(self, client: TestClient):
        with _apply_all_db_mocks():
            resp = client.get("/ml/cognitive-load/session/nonexistent")
            assert resp.status_code == 404

    def test_record_event_with_no_session(self, client: TestClient):
        resp = client.post(
            "/ml/cognitive-load/session/event",
            json={
                "sessionId": "nonexistent",
                "responseTimeMs": 3000,
                "sequence": 0,
            },
        )
        assert resp.status_code == 200
        assert resp.json()["cognitiveLoad"] is None

    def test_record_event_with_null_rt(self, client: TestClient):
        resp = client.post(
            "/ml/cognitive-load/session/event",
            json={
                "sessionId": "nonexistent",
                "responseTimeMs": None,
                "sequence": 0,
            },
        )
        assert resp.status_code == 200
        assert resp.json()["cognitiveLoad"] is None
