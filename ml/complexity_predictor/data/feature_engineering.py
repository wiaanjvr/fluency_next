"""
Feature engineering for the Complexity Level Predictor.

Converts raw DB data and DKT p_recall into the feature vector consumed
by the XGBoost model.

Feature Vector (8 features)
───────────────────────────
  0. time_of_day       (0-3: morning/afternoon/evening/night)
  1. day_of_week       (0-6: Mon-Sun)
  2. days_since_last_session  (log1p-scaled)
  3. last_session_cognitive_load  (0-1)
  4. last_session_completion_rate (0-1)
  5. current_streak_days  (log1p-scaled)
  6. avg_performance_last_7_days  (0-1)
  7. p_recall_avg      (0-1, average across due words from DKT)
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

import numpy as np
from loguru import logger

from ..config import settings

# ── Constants ───────────────────────────────────────────────────────────────

FEATURE_NAMES = [
    "time_of_day",
    "day_of_week",
    "days_since_last_session",
    "last_session_cognitive_load",
    "last_session_completion_rate",
    "current_streak_days",
    "avg_performance_last_7_days",
    "p_recall_avg",
]

NUM_FEATURES = len(FEATURE_NAMES)

TIME_OF_DAY_MAP = {"morning": 0, "afternoon": 1, "evening": 2, "night": 3}


def _get_time_of_day_idx(hour: int | None = None) -> int:
    """Map current hour to time_of_day index."""
    if hour is None:
        hour = datetime.now(timezone.utc).hour
    if 6 <= hour < 12:
        return 0  # morning
    elif 12 <= hour < 17:
        return 1  # afternoon
    elif 17 <= hour < 21:
        return 2  # evening
    else:
        return 3  # night


def _log1p_scale(x: float | None, default: float = 0.0) -> float:
    """Log1p scaling for days/streak values."""
    if x is None:
        return default
    return math.log1p(max(0.0, x))


def extract_features(
    db_features: dict[str, Any],
    p_recall_avg: float | None = None,
    *,
    time_of_day: str | None = None,
    day_of_week: int | None = None,
) -> np.ndarray:
    """
    Build the 8-dimensional feature vector from DB features and DKT output.

    Parameters
    ----------
    db_features : dict
        Output of get_user_session_features RPC.
    p_recall_avg : float, optional
        Average p_recall across due words from the DKT service.
    time_of_day : str, optional
        Override for time of day (morning/afternoon/evening/night).
    day_of_week : int, optional
        Override for day of week (0=Mon, 6=Sun).

    Returns
    -------
    np.ndarray of shape (8,) with float32 values.
    """
    cfg = settings.model
    now = datetime.now(timezone.utc)

    # Time features
    if time_of_day is not None:
        tod_idx = TIME_OF_DAY_MAP.get(time_of_day, _get_time_of_day_idx(now.hour))
    else:
        tod_idx = _get_time_of_day_idx(now.hour)

    if day_of_week is not None:
        dow = day_of_week
    else:
        dow = now.weekday()  # 0=Monday, 6=Sunday

    # DB features
    days_since = db_features.get("days_since_last_session")
    last_cog_load = db_features.get("last_session_cognitive_load", cfg.default_cognitive_load)
    last_completion = db_features.get("last_session_completion_rate", cfg.default_completion_rate)
    streak = db_features.get("current_streak_days", 0)
    avg_perf_7d = db_features.get("avg_performance_last_7_days", cfg.default_completion_rate)

    # DKT feature
    p_recall = p_recall_avg if p_recall_avg is not None else cfg.default_p_recall_avg

    features = np.array(
        [
            float(tod_idx),
            float(dow),
            _log1p_scale(days_since, default=_log1p_scale(1.0)),
            float(np.clip(last_cog_load or cfg.default_cognitive_load, 0.0, 1.0)),
            float(np.clip(last_completion or cfg.default_completion_rate, 0.0, 1.0)),
            _log1p_scale(streak, default=0.0),
            float(np.clip(avg_perf_7d or cfg.default_completion_rate, 0.0, 1.0)),
            float(np.clip(p_recall, 0.0, 1.0)),
        ],
        dtype=np.float32,
    )

    return features


def features_to_dict(features: np.ndarray) -> dict[str, float]:
    """Convert a feature vector back to a named dict (for logging / audit)."""
    return {name: float(features[i]) for i, name in enumerate(FEATURE_NAMES)}


# ── Training data feature extraction ────────────────────────────────────────


def extract_training_features(row: dict[str, Any]) -> dict[str, Any] | None:
    """
    Convert a labelled session row (from get_labelled_sessions) into a
    feature dict + labels for the training pipeline.

    Returns None if the row is invalid / has missing required fields.
    """
    complexity = row.get("story_complexity_level")
    if complexity is None or complexity < 1:
        return None

    tod_str = row.get("time_of_day", "morning")
    tod_idx = TIME_OF_DAY_MAP.get(tod_str, 0)
    dow = row.get("day_of_week", 0)

    days_since = row.get("days_since_last_session")
    last_cog = row.get("last_session_cognitive_load", 0.3)
    last_comp = row.get("last_session_completion_rate", 0.5)
    streak = row.get("current_streak_days", 0)
    avg_perf = row.get("avg_performance_last_7_days", 0.5)

    # For training, p_recall is not directly available in historical data;
    # we approximate it from actual_completion_rate
    p_recall_proxy = row.get("actual_completion_rate", 0.6)

    features = np.array(
        [
            float(tod_idx),
            float(dow),
            _log1p_scale(days_since, default=_log1p_scale(1.0)),
            float(np.clip(last_cog or 0.3, 0.0, 1.0)),
            float(np.clip(last_comp or 0.5, 0.0, 1.0)),
            _log1p_scale(streak, default=0.0),
            float(np.clip(avg_perf or 0.5, 0.0, 1.0)),
            float(np.clip(p_recall_proxy, 0.0, 1.0)),
        ],
        dtype=np.float32,
    )

    # Labels
    actual_cog = row.get("actual_cognitive_load", 0.5)
    actual_comp = row.get("actual_completion_rate", 0.5)
    word_count = row.get("session_word_count", 30)
    duration_ms = row.get("session_duration_ms")
    duration_min = (duration_ms / 60000.0) if duration_ms else 10.0

    return {
        "features": features,
        "complexity_level": int(np.clip(complexity, 1, 5)),
        "word_count": int(word_count) if word_count else 30,
        "duration_minutes": float(duration_min),
        "actual_cognitive_load": float(actual_cog),
        "actual_completion_rate": float(actual_comp),
        # Compute the quality label: 1 if session was in the "sweet spot"
        "is_optimal": (
            settings.model.optimal_cognitive_load_min
            <= (actual_cog or 0)
            <= settings.model.optimal_cognitive_load_max
            and (actual_comp or 0) >= settings.model.optimal_completion_rate_min
        ),
    }
