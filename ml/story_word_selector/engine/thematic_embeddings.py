"""
Thematic Preference Embedding — 16-dim topic preference vector per user.

Manages:
  1. A canonical set of topic tags with pre-assigned 16-dim embeddings
  2. Per-user preference vector built from:
     - Signup: user selects 3 topic interests → initial vector
     - Ongoing: weighted average update from engagement (time-on-story-segment)
  3. Relevance scoring: cosine similarity between user pref vector and word topic tags
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
from loguru import logger

from ..config import settings

# ── Canonical Topic Taxonomy ────────────────────────────────────────────────
# Each topic has a human-readable label and a fixed 16-dim embedding.
# In production these could be learned; for now we use hand-crafted orthogonal-ish
# vectors so that related topics have higher cosine similarity.

TOPIC_TAXONOMY: dict[str, dict[str, Any]] = {
    "daily_life": {
        "label": "Daily Life & Routines",
        "embedding": [1.0, 0.3, 0.0, 0.0, 0.0, 0.0, 0.0, 0.2, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    },
    "food_cooking": {
        "label": "Food & Cooking",
        "embedding": [0.6, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.3, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    },
    "travel": {
        "label": "Travel & Geography",
        "embedding": [0.2, 0.0, 1.0, 0.3, 0.0, 0.0, 0.0, 0.0, 0.0, 0.2, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    },
    "culture_arts": {
        "label": "Culture & Arts",
        "embedding": [0.0, 0.0, 0.3, 1.0, 0.0, 0.0, 0.2, 0.0, 0.0, 0.0, 0.3, 0.0, 0.0, 0.0, 0.0, 0.0],
    },
    "nature_environment": {
        "label": "Nature & Environment",
        "embedding": [0.0, 0.0, 0.4, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.2, 0.0, 0.0, 0.0, 0.0],
    },
    "sports_health": {
        "label": "Sports & Health",
        "embedding": [0.2, 0.0, 0.0, 0.0, 0.2, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.3, 0.0, 0.0, 0.0],
    },
    "entertainment": {
        "label": "Entertainment & Media",
        "embedding": [0.0, 0.0, 0.0, 0.4, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.2, 0.0, 0.0, 0.3, 0.0, 0.0],
    },
    "family_relationships": {
        "label": "Family & Relationships",
        "embedding": [0.4, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.2, 0.0],
    },
    "work_career": {
        "label": "Work & Career",
        "embedding": [0.3, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.3],
    },
    "technology": {
        "label": "Technology & Science",
        "embedding": [0.0, 0.0, 0.0, 0.0, 0.2, 0.0, 0.2, 0.0, 0.3, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.2],
    },
    "history": {
        "label": "History & Society",
        "embedding": [0.0, 0.0, 0.2, 0.4, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    },
    "animals": {
        "label": "Animals & Pets",
        "embedding": [0.2, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 0.2, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0],
    },
    "shopping_fashion": {
        "label": "Shopping & Fashion",
        "embedding": [0.3, 0.0, 0.0, 0.2, 0.0, 0.0, 0.2, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0],
    },
    "education": {
        "label": "Education & Learning",
        "embedding": [0.0, 0.0, 0.0, 0.2, 0.0, 0.0, 0.0, 0.0, 0.3, 0.2, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0],
    },
    "emotions_personality": {
        "label": "Emotions & Personality",
        "embedding": [0.2, 0.0, 0.0, 0.2, 0.0, 0.0, 0.0, 0.4, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0],
    },
}

# Pre-compute numpy arrays for efficiency
_TOPIC_VECTORS: dict[str, np.ndarray] = {}
_ALL_TOPIC_TAGS = list(TOPIC_TAXONOMY.keys())


def _ensure_vectors() -> None:
    """Lazily build numpy vectors from the taxonomy."""
    if _TOPIC_VECTORS:
        return
    for tag, info in TOPIC_TAXONOMY.items():
        vec = np.array(info["embedding"], dtype=np.float32)
        # L2-normalize
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        _TOPIC_VECTORS[tag] = vec


def get_topic_embedding(tag: str) -> np.ndarray:
    """Return the normalized 16-dim embedding for a topic tag."""
    _ensure_vectors()
    return _TOPIC_VECTORS.get(tag, np.zeros(settings.scoring.topic_embedding_dim, dtype=np.float32))


def get_all_topic_tags() -> list[str]:
    """Return all canonical topic tags."""
    return list(_ALL_TOPIC_TAGS)


# ── User Preference Vector ─────────────────────────────────────────────────


def build_initial_preference_vector(selected_topics: list[str]) -> np.ndarray:
    """
    Build the initial 16-dim preference vector from user's signup topic choices.
    Simple average of the selected topic embeddings.
    """
    _ensure_vectors()
    dim = settings.scoring.topic_embedding_dim

    if not selected_topics:
        return np.zeros(dim, dtype=np.float32)

    vecs = [get_topic_embedding(t) for t in selected_topics if t in _TOPIC_VECTORS]
    if not vecs:
        return np.zeros(dim, dtype=np.float32)

    avg = np.mean(vecs, axis=0).astype(np.float32)
    norm = np.linalg.norm(avg)
    if norm > 0:
        avg = avg / norm
    return avg


def update_preference_vector(
    current_vector: np.ndarray,
    engagement_records: list[dict[str, Any]],
) -> np.ndarray:
    """
    Update the user's preference vector using engagement data.

    Each engagement record has:
      - topic_tags: list[str]  — topics of the story segment
      - time_on_segment_ms: int — proxy for engagement (longer = more interested)

    Uses an EMA-style weighted average:
      new_vector = decay * current + (1 - decay) * engagement_vector
    """
    _ensure_vectors()
    dim = settings.scoring.topic_embedding_dim
    decay = settings.scoring.engagement_decay

    if not engagement_records:
        return current_vector

    # Build a weighted engagement vector
    engagement_vec = np.zeros(dim, dtype=np.float32)
    total_weight = 0.0

    for record in engagement_records:
        tags = record.get("topic_tags") or []
        time_ms = record.get("time_on_segment_ms", 0)
        if not tags or time_ms <= 0:
            continue

        # Weight = log(time_ms) to dampen outliers
        weight = float(np.log1p(time_ms / 1000.0))  # log(1 + seconds)
        for tag in tags:
            if tag in _TOPIC_VECTORS:
                engagement_vec += weight * _TOPIC_VECTORS[tag]
                total_weight += weight

    if total_weight <= 0:
        return current_vector

    engagement_vec = engagement_vec / total_weight

    # EMA update
    updated = decay * current_vector + (1.0 - decay) * engagement_vec
    norm = np.linalg.norm(updated)
    if norm > 0:
        updated = updated / norm

    return updated.astype(np.float32)


# ── Relevance Scoring ──────────────────────────────────────────────────────


def compute_thematic_relevance(
    user_pref_vector: np.ndarray,
    word_tags: list[str],
) -> float:
    """
    Compute thematic relevance score (0..1) for a word given its topic tags
    and the user's preference vector.

    Uses max cosine similarity across the word's tags.
    """
    _ensure_vectors()

    if user_pref_vector is None or np.linalg.norm(user_pref_vector) == 0:
        return 0.5  # neutral if no preferences

    if not word_tags:
        return 0.3  # slight penalty for untagged words

    max_sim = -1.0
    for tag in word_tags:
        tag_vec = _TOPIC_VECTORS.get(tag)
        if tag_vec is not None:
            sim = float(np.dot(user_pref_vector, tag_vec))
            max_sim = max(max_sim, sim)

    if max_sim < 0:
        return 0.3  # no matching tags found

    # Clamp to [0, 1]
    return float(np.clip(max_sim, 0.0, 1.0))


def get_thematic_bias_tags(
    user_pref_vector: np.ndarray,
    top_k: int = 3,
) -> list[str]:
    """
    Return the top-K topic tags most aligned with the user's preference vector.
    Used in the API response as `thematicBias`.
    """
    _ensure_vectors()

    if user_pref_vector is None or np.linalg.norm(user_pref_vector) == 0:
        return []

    similarities: list[tuple[str, float]] = []
    for tag, vec in _TOPIC_VECTORS.items():
        sim = float(np.dot(user_pref_vector, vec))
        similarities.append((tag, sim))

    similarities.sort(key=lambda x: x[1], reverse=True)
    return [tag for tag, _ in similarities[:top_k]]
