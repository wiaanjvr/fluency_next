"""
Tests for the scoring function.
"""

from __future__ import annotations

import numpy as np
import pytest

from ml.story_word_selector.engine.scoring import (
    ScoredWord,
    _compute_forget_risk,
    _compute_module_variety_bonus,
    _compute_production_gap,
    _compute_recency_penalty,
    score_candidate_words,
)
from ml.story_word_selector.engine.thematic_embeddings import (
    compute_thematic_relevance,
    get_topic_embedding,
)


# ── Helpers ─────────────────────────────────────────────────────────────────

def _make_word(
    word_id: str = "w1",
    status: str = "learning",
    next_review: str = "2026-02-20T00:00:00Z",
    ease_factor: float = 2.5,
    production_score: float = 30.0,
    frequency_rank: int = 100,
    tags: list[str] | None = None,
) -> dict:
    return {
        "id": word_id,
        "word": f"word_{word_id}",
        "lemma": f"lemma_{word_id}",
        "status": status,
        "next_review": next_review,
        "ease_factor": ease_factor,
        "production_score": production_score,
        "frequency_rank": frequency_rank,
        "tags": tags or [],
    }


# ── Forget risk ─────────────────────────────────────────────────────────────


class TestForgetRisk:
    def test_uses_dkt_when_available(self):
        dkt = {"w1": 0.75}
        result = _compute_forget_risk("w1", dkt, _make_word())
        assert result == 0.75

    def test_fallback_overdue_word(self):
        """Word 7 days overdue → ~0.5 risk."""
        w = _make_word(next_review="2026-02-15T00:00:00Z")
        result = _compute_forget_risk("w1", {}, w)
        assert 0.3 < result < 0.8

    def test_fallback_future_word(self):
        """Word not yet due → 0 risk."""
        w = _make_word(next_review="2026-12-01T00:00:00Z")
        result = _compute_forget_risk("w1", {}, w)
        assert result == 0.0

    def test_fallback_no_review_date(self):
        w = _make_word(next_review=None)
        result = _compute_forget_risk("w1", {}, w)
        assert result == 0.5


# ── Recency penalty ─────────────────────────────────────────────────────────


class TestRecencyPenalty:
    def test_not_in_recent_sessions(self):
        sessions = [{"w2", "w3"}, {"w4", "w5"}]
        result = _compute_recency_penalty("w1", sessions)
        assert result == 1.0  # no penalty

    def test_in_most_recent_session(self):
        sessions = [{"w1", "w2"}, {"w3", "w4"}]
        result = _compute_recency_penalty("w1", sessions)
        assert result == 0.0  # maximum penalty

    def test_in_second_recent_session(self):
        sessions = [{"w2", "w3"}, {"w1", "w4"}]
        result = _compute_recency_penalty("w1", sessions)
        assert result == 0.5

    def test_empty_sessions(self):
        result = _compute_recency_penalty("w1", [])
        assert result == 1.0


# ── Production gap ──────────────────────────────────────────────────────────


class TestProductionGap:
    def test_large_gap(self):
        """High ease (good recognition) + low production → large gap."""
        w = _make_word(ease_factor=3.0, production_score=10.0)
        result = _compute_production_gap(w)
        assert result > 0.7

    def test_no_gap(self):
        """Recognition matches production → no gap."""
        w = _make_word(ease_factor=1.3, production_score=0.0)
        result = _compute_production_gap(w)
        assert result == pytest.approx(0.0, abs=0.01)

    def test_medium_gap(self):
        w = _make_word(ease_factor=2.5, production_score=40.0)
        result = _compute_production_gap(w)
        assert 0.1 < result < 0.5


# ── Module variety ──────────────────────────────────────────────────────────


class TestModuleVariety:
    def test_not_in_story_mode(self):
        result = _compute_module_variety_bonus("w1", {"w2", "w3"})
        assert result == 1.0

    def test_in_story_mode(self):
        result = _compute_module_variety_bonus("w1", {"w1", "w2"})
        assert result == 0.0


# ── Full scoring ────────────────────────────────────────────────────────────


class TestScoreCandidateWords:
    def test_sorts_by_score_descending(self):
        words = [
            _make_word("w1", production_score=80.0),   # low gap → lower score
            _make_word("w2", production_score=10.0),   # high gap → higher score
        ]
        dkt = {"w1": 0.1, "w2": 0.9}

        scored = score_candidate_words(
            user_words=words,
            dkt_forget_map=dkt,
            recent_sessions=[],
            story_mode_recent_words=set(),
            user_pref_vector=None,
            word_tags_map={},
        )

        assert len(scored) == 2
        assert scored[0].word_id == "w2"  # higher forget + higher gap
        assert scored[1].word_id == "w1"
        assert scored[0].total_score > scored[1].total_score

    def test_empty_words(self):
        scored = score_candidate_words(
            user_words=[],
            dkt_forget_map={},
            recent_sessions=[],
            story_mode_recent_words=set(),
            user_pref_vector=None,
            word_tags_map={},
        )
        assert scored == []

    def test_dkt_absent_uses_fallback(self):
        """When DKT map is empty, scoring still works via heuristic fallback."""
        words = [_make_word("w1")]
        scored = score_candidate_words(
            user_words=words,
            dkt_forget_map={},
            recent_sessions=[],
            story_mode_recent_words=set(),
            user_pref_vector=None,
            word_tags_map={},
        )
        assert len(scored) == 1
        assert scored[0].total_score > 0


# ── Thematic relevance ─────────────────────────────────────────────────────


class TestThematicRelevance:
    def test_matching_topic(self):
        vec = get_topic_embedding("travel")
        score = compute_thematic_relevance(vec, ["travel"])
        assert score > 0.8

    def test_unrelated_topic(self):
        vec = get_topic_embedding("travel")
        score = compute_thematic_relevance(vec, ["sports_health"])
        assert score < 0.5

    def test_no_tags(self):
        vec = get_topic_embedding("travel")
        score = compute_thematic_relevance(vec, [])
        assert score == 0.3

    def test_no_preferences(self):
        score = compute_thematic_relevance(np.zeros(16), ["travel"])
        assert score == 0.5
