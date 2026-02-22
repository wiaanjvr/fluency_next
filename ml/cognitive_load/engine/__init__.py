"""
Core cognitive load estimation engine.

Maintains per-session state and computes real-time cognitive load scores
from interaction event response times relative to personalised baselines.

Cognitive Load Formula
──────────────────────
  cognitiveLoad = (currentRT - baselineRT) / baselineRT

  Normalised to [0, 1].  Values > 0.5 → high cognitive load.

Baseline Resolution Order
─────────────────────────
  1. Per-module + per-difficulty-bucket baseline
  2. Per-module baseline
  3. Global user baseline (from user_baselines table)
  4. System default (3 000 ms)
"""

from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from threading import Lock
from typing import Any

import numpy as np
from loguru import logger

from ..config import settings

# ---------------------------------------------------------------------------
# Constants / enums
# ---------------------------------------------------------------------------

cfg = settings.cognitive_load


class Trend(str, Enum):
    increasing = "increasing"
    stable = "stable"
    decreasing = "decreasing"


class RecommendedAction(str, Enum):
    continue_ = "continue"
    simplify = "simplify"
    end_session = "end-session"


# ---------------------------------------------------------------------------
# Per-event cognitive load record
# ---------------------------------------------------------------------------

@dataclass
class EventLoad:
    """Single data point in the rolling window."""
    sequence: int
    word_id: str | None
    response_time_ms: float
    baseline_ms: float
    cognitive_load: float  # normalised 0–1
    timestamp: float  # epoch seconds


# ---------------------------------------------------------------------------
# Session tracker
# ---------------------------------------------------------------------------

@dataclass
class SessionState:
    """In-memory state for a single active session."""
    session_id: str
    user_id: str
    module_source: str
    started_at: float = field(default_factory=time.time)

    # Rolling window of event loads
    events: deque[EventLoad] = field(default_factory=lambda: deque(maxlen=500))

    # Baselines (loaded once per session, can be refreshed)
    user_baseline_ms: float = cfg.default_baseline_ms
    module_baselines: dict[str, float] = field(default_factory=dict)
    bucket_baselines: dict[str, dict[str, float]] = field(default_factory=dict)

    # Pre-loaded word statuses (lazy-populated)
    _word_statuses: dict[str, str] = field(default_factory=dict)

    # Consecutive high-load counter
    consecutive_high_load: int = 0


# ---------------------------------------------------------------------------
# Estimator
# ---------------------------------------------------------------------------

class CognitiveLoadEstimator:
    """
    Thread-safe, in-memory cognitive load tracker for all active sessions.

    The Next.js backend calls:
      1. init_session()  — on session start
      2. record_event()  — after each interaction event is logged
      3. get_session_load() — polled by the story engine / UI
      4. end_session()   — on session end (flushes to DB)
    """

    def __init__(self) -> None:
        self._sessions: dict[str, SessionState] = {}
        self._lock = Lock()

    # ── Session lifecycle ────────────────────────────────────────────────

    def init_session(
        self,
        session_id: str,
        user_id: str,
        module_source: str,
        *,
        user_baseline_ms: float = cfg.default_baseline_ms,
        module_baselines: dict[str, float] | None = None,
        bucket_baselines: dict[str, dict[str, float]] | None = None,
    ) -> None:
        """Register a new session for tracking."""
        with self._lock:
            self._sessions[session_id] = SessionState(
                session_id=session_id,
                user_id=user_id,
                module_source=module_source,
                user_baseline_ms=user_baseline_ms,
                module_baselines=module_baselines or {},
                bucket_baselines=bucket_baselines or {},
            )
        logger.info(
            f"Session {session_id} initialised (module={module_source}, "
            f"baseline={user_baseline_ms:.0f}ms)"
        )

    def end_session(self, session_id: str) -> float | None:
        """
        Remove session from memory and return final avg cognitive load.
        Returns None if session not found.
        """
        with self._lock:
            state = self._sessions.pop(session_id, None)
        if state is None:
            return None
        if not state.events:
            return 0.0
        avg_load = float(np.mean([e.cognitive_load for e in state.events]))
        logger.info(
            f"Session {session_id} ended — avg cognitive load: {avg_load:.3f} "
            f"({len(state.events)} events)"
        )
        return round(avg_load, 4)

    def has_session(self, session_id: str) -> bool:
        return session_id in self._sessions

    # ── Event recording ──────────────────────────────────────────────────

    def record_event(
        self,
        session_id: str,
        *,
        word_id: str | None = None,
        word_status: str | None = None,
        response_time_ms: float | None = None,
        sequence: int = 0,
    ) -> float | None:
        """
        Record a new interaction event and return its cognitive load score.

        Returns None if response_time is missing or session not tracked.
        """
        if response_time_ms is None or response_time_ms <= 0:
            return None

        with self._lock:
            state = self._sessions.get(session_id)
            if state is None:
                return None

            # Resolve the best baseline for this event
            baseline = self._resolve_baseline(state, word_status)

            # Compute cognitive load
            raw_load = (response_time_ms - baseline) / baseline if baseline > 0 else 0.0
            # Clamp to [0, 1]
            cog_load = float(np.clip(raw_load, 0.0, 1.0))

            event = EventLoad(
                sequence=sequence,
                word_id=word_id,
                response_time_ms=response_time_ms,
                baseline_ms=baseline,
                cognitive_load=cog_load,
                timestamp=time.time(),
            )
            state.events.append(event)

            # Track consecutive high-load events
            if cog_load > cfg.simplify_threshold:
                state.consecutive_high_load += 1
            else:
                state.consecutive_high_load = 0

        return cog_load

    # ── Query ────────────────────────────────────────────────────────────

    def get_session_load(self, session_id: str) -> dict[str, Any] | None:
        """
        Compute the current session-level cognitive load snapshot.

        Returns:
            {
                "currentLoad": float,       # 0.0 – 1.0
                "trend": "increasing" | "stable" | "decreasing",
                "recommendedAction": "continue" | "simplify" | "end-session",
                "eventCount": int,
                "consecutiveHighLoad": int,
                "avgLoad": float,
                "recentLoads": list[float],  # last N loads
            }
        """
        with self._lock:
            state = self._sessions.get(session_id)
            if state is None:
                return None

            if not state.events:
                return {
                    "currentLoad": 0.0,
                    "trend": Trend.stable.value,
                    "recommendedAction": RecommendedAction.continue_.value,
                    "eventCount": 0,
                    "consecutiveHighLoad": 0,
                    "avgLoad": 0.0,
                    "recentLoads": [],
                }

            loads = [e.cognitive_load for e in state.events]
            current_load = loads[-1]

            # Rolling average
            avg_load = float(np.mean(loads))

            # Trend from recent window
            window = loads[-cfg.trend_window_size:]
            trend = self._compute_trend(window)

            # Recommended action
            action = self._recommend_action(
                current_load, avg_load, state.consecutive_high_load
            )

            return {
                "currentLoad": round(current_load, 4),
                "trend": trend.value,
                "recommendedAction": action.value,
                "eventCount": len(state.events),
                "consecutiveHighLoad": state.consecutive_high_load,
                "avgLoad": round(avg_load, 4),
                "recentLoads": [round(l, 4) for l in window],
            }

    # ── Internal helpers ─────────────────────────────────────────────────

    @staticmethod
    def _resolve_baseline(state: SessionState, word_status: str | None) -> float:
        """
        Pick the most specific baseline available.

        Priority:
          1. module + difficulty bucket
          2. module only
          3. global user baseline
        """
        mod = state.module_source

        # 1. Module + bucket
        if word_status and mod in state.bucket_baselines:
            bucket_val = state.bucket_baselines[mod].get(word_status)
            if bucket_val is not None and bucket_val > 0:
                return bucket_val

        # 2. Module only
        mod_val = state.module_baselines.get(mod)
        if mod_val is not None and mod_val > 0:
            return mod_val

        # 3. Global user baseline
        return state.user_baseline_ms

    @staticmethod
    def _compute_trend(window: list[float]) -> Trend:
        """Compute trend from a window of load values using linear regression slope."""
        if len(window) < 3:
            return Trend.stable

        x = np.arange(len(window), dtype=np.float64)
        y = np.array(window, dtype=np.float64)

        # Simple linear regression slope
        x_mean = x.mean()
        y_mean = y.mean()
        denom = ((x - x_mean) ** 2).sum()
        if denom == 0:
            return Trend.stable
        slope = ((x - x_mean) * (y - y_mean)).sum() / denom

        if slope > cfg.trend_increase_delta:
            return Trend.increasing
        elif slope < cfg.trend_decrease_delta:
            return Trend.decreasing
        return Trend.stable

    @staticmethod
    def _recommend_action(
        current_load: float,
        avg_load: float,
        consecutive_high: int,
    ) -> RecommendedAction:
        """Determine the recommended action based on load state."""
        # Highest priority: very high load → suggest a break
        if current_load > cfg.break_threshold:
            return RecommendedAction.end_session

        # High load for consecutive words → simplify
        if (
            current_load > cfg.simplify_threshold
            and consecutive_high >= cfg.consecutive_high_load_words
        ):
            return RecommendedAction.simplify

        # Moderate sustained load → simplify
        if avg_load > cfg.simplify_threshold:
            return RecommendedAction.simplify

        return RecommendedAction.continue_


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

estimator = CognitiveLoadEstimator()
