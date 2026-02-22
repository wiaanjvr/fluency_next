"""
State Assembler — builds the feature vector for the RL agent.

Collects data from multiple sources (DKT, vocabulary scores, session history,
grammar mastery, cognitive load) and assembles a normalised state vector that
both the LinUCB bandit and the PPO agent can consume.

State space (24 features):
  [0-5]    DKT concept mastery summary (mean, std, min, max, p25, p75)
  [6-8]    Last 3 modules used (one-hot encoded → 3 × binary)
           Actually encoded as module index / num_modules for compactness
  [9]      Average production score on due vocabulary
  [10]     Average pronunciation score
  [11]     Weakest grammar concept mastery score
  [12]     Cognitive load from last session
  [13]     Estimated available time (minutes, normalised)
  [14]     Days since last session (capped & normalised)
  [15]     Due word count (normalised)
  [16]     Total words learned (normalised)
  [17]     Low production word count (normalised)
  [18]     Low pronunciation word count (normalised)
  [19]     Current hour of day (sin-encoded)
  [20]     Current hour of day (cos-encoded)
  [21]     Day of week (sin-encoded)
  [22]     Day of week (cos-encoded)
  [23]     Session completion rate (last 10 sessions)
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import numpy as np
from loguru import logger

from ..config import settings

# Module name → index mapping for encoding
MODULE_INDEX: dict[str, int] = {
    name: i for i, name in enumerate(settings.router.actions)
}
NUM_MODULES = len(settings.router.actions)
STATE_DIM = 24


@dataclass
class UserState:
    """Structured representation of a user's state at a decision point."""

    user_id: str
    event_count: int = 0

    # DKT knowledge
    dkt_mastery: list[float] = field(default_factory=list)

    # Session history
    last_modules: list[str] = field(default_factory=list)
    days_since_last_session: float = 0.0
    estimated_available_minutes: float = 15.0
    session_completion_rate: float = 1.0

    # Vocabulary
    avg_production_score: float = 0.5
    avg_pronunciation_score: float = 0.5
    low_production_words: list[str] = field(default_factory=list)
    low_pronunciation_words: list[str] = field(default_factory=list)
    due_word_count: int = 0
    total_words: int = 0

    # Grammar
    weakest_concept_tag: str | None = None
    weakest_concept_score: float = 1.0
    concept_scores: dict[str, float] = field(default_factory=dict)

    # Cognitive load
    cognitive_load_last_session: float = 0.5

    def to_vector(self) -> np.ndarray:
        """Convert to a flat numpy feature vector of shape (STATE_DIM,)."""
        now = datetime.now(timezone.utc)

        # DKT summary statistics
        mastery = np.array(self.dkt_mastery) if self.dkt_mastery else np.array([0.5])
        dkt_features = [
            float(np.mean(mastery)),
            float(np.std(mastery)),
            float(np.min(mastery)),
            float(np.max(mastery)),
            float(np.percentile(mastery, 25)),
            float(np.percentile(mastery, 75)),
        ]

        # Last 3 modules (normalised index)
        mod_features = []
        for i in range(3):
            if i < len(self.last_modules):
                idx = MODULE_INDEX.get(self.last_modules[i], 0)
                mod_features.append(idx / max(NUM_MODULES - 1, 1))
            else:
                mod_features.append(0.5)  # neutral when unknown

        # Time features (cyclical encoding)
        hour = now.hour + now.minute / 60.0
        hour_sin = math.sin(2 * math.pi * hour / 24.0)
        hour_cos = math.cos(2 * math.pi * hour / 24.0)
        dow = now.weekday()
        dow_sin = math.sin(2 * math.pi * dow / 7.0)
        dow_cos = math.cos(2 * math.pi * dow / 7.0)

        vec = np.array(
            [
                # [0-5] DKT summary
                *dkt_features,
                # [6-8] Last modules
                *mod_features,
                # [9] Production score
                self.avg_production_score,
                # [10] Pronunciation score
                self.avg_pronunciation_score,
                # [11] Weakest grammar mastery
                self.weakest_concept_score,
                # [12] Cognitive load
                self.cognitive_load_last_session,
                # [13] Available time (normalised: cap at 60 min)
                min(self.estimated_available_minutes / 60.0, 1.0),
                # [14] Days since last session (cap at 30, normalise)
                min(self.days_since_last_session / 30.0, 1.0),
                # [15] Due word count (normalised, cap at 200)
                min(self.due_word_count / 200.0, 1.0),
                # [16] Total words (normalised, cap at 2000)
                min(self.total_words / 2000.0, 1.0),
                # [17] Low production words (normalised)
                min(len(self.low_production_words) / 50.0, 1.0),
                # [18] Low pronunciation words (normalised)
                min(len(self.low_pronunciation_words) / 50.0, 1.0),
                # [19-22] Time encoding
                hour_sin,
                hour_cos,
                dow_sin,
                dow_cos,
                # [23] Session completion rate
                self.session_completion_rate,
            ],
            dtype=np.float32,
        )
        assert vec.shape == (STATE_DIM,), f"Expected {STATE_DIM}, got {vec.shape}"
        return vec

    def to_snapshot(self) -> dict[str, Any]:
        """Return a JSON-serialisable snapshot for persistence."""
        return {
            "event_count": self.event_count,
            "avg_production_score": self.avg_production_score,
            "avg_pronunciation_score": self.avg_pronunciation_score,
            "weakest_concept_tag": self.weakest_concept_tag,
            "weakest_concept_score": self.weakest_concept_score,
            "cognitive_load_last_session": self.cognitive_load_last_session,
            "days_since_last_session": self.days_since_last_session,
            "estimated_available_minutes": self.estimated_available_minutes,
            "due_word_count": self.due_word_count,
            "total_words": self.total_words,
            "last_modules": self.last_modules,
            "session_completion_rate": self.session_completion_rate,
        }


def assemble_state(
    user_id: str,
    available_minutes: float | None = None,
) -> UserState:
    """
    Assemble the full user state by querying all data sources.
    This is the main entry-point for state construction.
    """
    from ..data.supabase_client import (
        fetch_cognitive_load_last_session,
        fetch_days_since_last_session,
        fetch_dkt_knowledge_state,
        fetch_grammar_mastery,
        fetch_historical_session_length,
        fetch_last_n_modules,
        fetch_user_event_count,
        fetch_vocabulary_scores,
    )

    logger.debug(f"Assembling state for user {user_id[:8]}...")

    event_count = fetch_user_event_count(user_id)
    last_modules = fetch_last_n_modules(user_id, n=3)
    vocab = fetch_vocabulary_scores(user_id)
    grammar = fetch_grammar_mastery(user_id)
    cog_load = fetch_cognitive_load_last_session(user_id)
    days_since = fetch_days_since_last_session(user_id)

    # Use provided time or infer from history
    if available_minutes is not None:
        est_minutes = available_minutes
    else:
        est_minutes = fetch_historical_session_length(user_id)

    # DKT knowledge state
    dkt_raw = fetch_dkt_knowledge_state(user_id)
    dkt_mastery = [row.get("p_recall", 0.5) for row in dkt_raw] if dkt_raw else [0.5]

    # Session completion rate from last 10 sessions
    from ..data.supabase_client import get_client

    client = get_client()
    completion_resp = (
        client.table("session_summaries")
        .select("completed_session")
        .eq("user_id", user_id)
        .order("started_at", desc=True)
        .limit(10)
        .execute()
    )
    completions = completion_resp.data or []
    if completions:
        completion_rate = sum(
            1 for r in completions if r.get("completed_session")
        ) / len(completions)
    else:
        completion_rate = 1.0

    state = UserState(
        user_id=user_id,
        event_count=event_count,
        dkt_mastery=dkt_mastery,
        last_modules=last_modules,
        days_since_last_session=days_since,
        estimated_available_minutes=est_minutes,
        session_completion_rate=completion_rate,
        avg_production_score=vocab["avg_production_score"],
        avg_pronunciation_score=vocab["avg_pronunciation_score"],
        low_production_words=vocab["low_production_words"],
        low_pronunciation_words=vocab["low_pronunciation_words"],
        due_word_count=vocab["due_word_count"],
        total_words=vocab["total_words"],
        weakest_concept_tag=grammar["weakest_concept_tag"],
        weakest_concept_score=grammar["weakest_concept_score"],
        concept_scores=grammar["concept_scores"],
        cognitive_load_last_session=cog_load,
    )

    logger.debug(
        f"State assembled: events={event_count}, "
        f"prod={state.avg_production_score:.2f}, "
        f"pron={state.avg_pronunciation_score:.2f}, "
        f"cog={cog_load:.2f}, days_since={days_since:.1f}"
    )
    return state
