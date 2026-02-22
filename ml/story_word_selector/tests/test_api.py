"""
Tests for the API endpoints (using FastAPI TestClient).
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from ml.story_word_selector.api.app import app
from ml.story_word_selector.engine.selector import WordSelectionResult


@pytest.fixture
def client():
    return TestClient(app)


class TestHealthEndpoint:
    def test_health_returns_200(self, client: TestClient):
        resp = client.get("/ml/story/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert "version" in data


class TestTopicsEndpoint:
    def test_list_topics(self, client: TestClient):
        resp = client.get("/ml/story/topics")
        assert resp.status_code == 200
        data = resp.json()
        assert "topics" in data
        assert len(data["topics"]) > 10
        tags = {t["tag"] for t in data["topics"]}
        assert "travel" in tags
        assert "food_cooking" in tags


class TestSelectWordsEndpoint:
    @patch("ml.story_word_selector.api.routes.select_story_words")
    async def test_select_words_success(self, mock_select, client: TestClient):
        mock_select.return_value = WordSelectionResult(
            due_words=["w1", "w2"],
            known_fill_words=["w3", "w4", "w5"],
            thematic_bias=["travel", "food_cooking"],
            debug_info={
                "total_user_words": 100,
                "due_pool_size": 10,
                "known_pool_size": 90,
                "dkt_coverage": 80,
                "max_due_allowed": 5,
                "selected_due_count": 2,
                "selected_known_count": 3,
                "known_percentage": 60.0,
            },
        )

        resp = client.post(
            "/ml/story/select-words",
            json={
                "userId": "test-user-id",
                "targetWordCount": 50,
                "storyComplexityLevel": 2,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["dueWords"] == ["w1", "w2"]
        assert data["knownFillWords"] == ["w3", "w4", "w5"]
        assert "travel" in data["thematicBias"]

    def test_select_words_validation_error(self, client: TestClient):
        """targetWordCount < 5 should fail validation."""
        resp = client.post(
            "/ml/story/select-words",
            json={
                "userId": "test-user-id",
                "targetWordCount": 2,  # below minimum
            },
        )
        assert resp.status_code == 422


class TestInitPreferencesEndpoint:
    @patch("ml.story_word_selector.api.routes.upsert_topic_preferences")
    def test_init_preferences(self, mock_upsert, client: TestClient):
        mock_upsert.return_value = None

        resp = client.post(
            "/ml/story/init-preferences",
            json={
                "userId": "test-user-id",
                "selectedTopics": ["travel", "food_cooking", "culture_arts"],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert len(data["preferenceVector"]) == 16
        assert data["selectedTopics"] == ["travel", "food_cooking", "culture_arts"]
