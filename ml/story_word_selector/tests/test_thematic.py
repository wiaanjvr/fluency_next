"""
Tests for the thematic embeddings module.
"""

from __future__ import annotations

import numpy as np
import pytest

from ml.story_word_selector.engine.thematic_embeddings import (
    TOPIC_TAXONOMY,
    build_initial_preference_vector,
    compute_thematic_relevance,
    get_all_topic_tags,
    get_thematic_bias_tags,
    get_topic_embedding,
    update_preference_vector,
)
from ml.story_word_selector.config import settings


class TestTopicTaxonomy:
    def test_all_topics_have_correct_dim_embeddings(self):
        dim = settings.scoring.topic_embedding_dim
        for tag, info in TOPIC_TAXONOMY.items():
            assert len(info["embedding"]) == dim, f"Topic {tag} has wrong dim"

    def test_all_topics_have_labels(self):
        for tag, info in TOPIC_TAXONOMY.items():
            assert "label" in info and len(info["label"]) > 0

    def test_get_all_topic_tags(self):
        tags = get_all_topic_tags()
        assert len(tags) == len(TOPIC_TAXONOMY)
        assert "travel" in tags
        assert "food_cooking" in tags


class TestTopicEmbedding:
    def test_known_topic_returns_normalized_vector(self):
        vec = get_topic_embedding("travel")
        assert len(vec) == 16
        assert abs(np.linalg.norm(vec) - 1.0) < 1e-5

    def test_unknown_topic_returns_zeros(self):
        vec = get_topic_embedding("nonexistent_topic")
        assert np.allclose(vec, 0.0)


class TestBuildInitialPreference:
    def test_single_topic(self):
        vec = build_initial_preference_vector(["travel"])
        assert len(vec) == 16
        assert abs(np.linalg.norm(vec) - 1.0) < 1e-5

    def test_multiple_topics(self):
        vec = build_initial_preference_vector(["travel", "food_cooking", "culture_arts"])
        assert len(vec) == 16
        assert abs(np.linalg.norm(vec) - 1.0) < 1e-5

    def test_empty_topics(self):
        vec = build_initial_preference_vector([])
        assert np.allclose(vec, 0.0)

    def test_unknown_topics_ignored(self):
        vec = build_initial_preference_vector(["nonexistent"])
        assert np.allclose(vec, 0.0)


class TestUpdatePreference:
    def test_engagement_shifts_vector(self):
        initial = build_initial_preference_vector(["travel"])
        records = [
            {"topic_tags": ["food_cooking"], "time_on_segment_ms": 60000},
        ]
        updated = update_preference_vector(initial, records)

        # The updated vector should be closer to food_cooking than the initial
        food_vec = get_topic_embedding("food_cooking")
        sim_before = float(np.dot(initial, food_vec))
        sim_after = float(np.dot(updated, food_vec))
        assert sim_after > sim_before

    def test_no_engagement_preserves_vector(self):
        initial = build_initial_preference_vector(["travel"])
        updated = update_preference_vector(initial, [])
        np.testing.assert_array_almost_equal(initial, updated)

    def test_zero_time_ignored(self):
        initial = build_initial_preference_vector(["travel"])
        records = [{"topic_tags": ["food_cooking"], "time_on_segment_ms": 0}]
        updated = update_preference_vector(initial, records)
        np.testing.assert_array_almost_equal(initial, updated)


class TestThematicBiasTags:
    def test_returns_top_k(self):
        vec = build_initial_preference_vector(["travel", "food_cooking"])
        tags = get_thematic_bias_tags(vec, top_k=3)
        assert len(tags) == 3
        # travel and food_cooking should be in top 3
        assert "travel" in tags or "food_cooking" in tags

    def test_zero_vector_returns_empty(self):
        tags = get_thematic_bias_tags(np.zeros(16), top_k=3)
        assert tags == []


class TestRelevanceScoring:
    def test_perfect_match(self):
        """Word tagged with user's preferred topic → high relevance."""
        vec = build_initial_preference_vector(["travel"])
        score = compute_thematic_relevance(vec, ["travel"])
        assert score > 0.8

    def test_no_overlap(self):
        """Word tagged with unrelated topic → lower relevance."""
        vec = build_initial_preference_vector(["travel"])
        score = compute_thematic_relevance(vec, ["technology"])
        # Related via cross-terms but should be lower
        assert score < 0.6

    def test_multiple_word_tags_uses_max(self):
        """If word has multiple tags, max similarity is used."""
        vec = build_initial_preference_vector(["travel"])
        score_single = compute_thematic_relevance(vec, ["travel"])
        score_multi = compute_thematic_relevance(vec, ["technology", "travel"])
        assert score_multi >= score_single - 0.01
