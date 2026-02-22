"""
Feature engineering for the Cold Start Collaborative Filtering system.

Transforms raw user data into the feature vector used by K-Means clustering.

Feature groups:
  1. Native language   — one-hot encoded
  2. Target language   — one-hot encoded
  3. CEFR level        — ordinal (0–6)
  4. Learning goals    — multi-hot (4 dims)
  5. Avg session length (minutes) — standardised
  6. Preferred time of day — one-hot (4 buckets: morning/afternoon/evening/night)
  7. Module preference distribution — 8-dim simplex
  8. Forgetting curve steepness — standardised scalar
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import numpy as np
from loguru import logger
from sklearn.preprocessing import StandardScaler

from ..config import settings


# ── Constants ───────────────────────────────────────────────────────────────

CEFR_ORDINAL: dict[str, int] = {
    level: i for i, level in enumerate(settings.clustering.cefr_levels)
}

GOAL_INDEX: dict[str, int] = {
    goal: i for i, goal in enumerate(settings.clustering.goal_categories)
}

MODULE_INDEX: dict[str, int] = {
    mod: i for i, mod in enumerate(settings.clustering.module_sources)
}

TIME_OF_DAY_BUCKETS = ("morning", "afternoon", "evening", "night")
TIME_BUCKET_INDEX: dict[str, int] = {
    bucket: i for i, bucket in enumerate(TIME_OF_DAY_BUCKETS)
}


# ── Feature column names ───────────────────────────────────────────────────


def get_feature_columns(
    known_native_languages: list[str],
    known_target_languages: list[str],
) -> list[str]:
    """Build the ordered list of feature column names."""
    cols: list[str] = []

    # 1. Native language one-hot
    for lang in sorted(known_native_languages):
        cols.append(f"native_{lang}")

    # 2. Target language one-hot
    for lang in sorted(known_target_languages):
        cols.append(f"target_{lang}")

    # 3. CEFR ordinal
    cols.append("cefr_ordinal")

    # 4. Goals multi-hot
    for goal in settings.clustering.goal_categories:
        cols.append(f"goal_{goal}")

    # 5. Avg session length (minutes)
    cols.append("avg_session_length_min")

    # 6. Preferred time of day one-hot
    for bucket in TIME_OF_DAY_BUCKETS:
        cols.append(f"time_{bucket}")

    # 7. Module preference distribution
    for mod in settings.clustering.module_sources:
        cols.append(f"module_pref_{mod}")

    # 8. Forgetting curve steepness
    cols.append("forgetting_steepness")

    return cols


# ── Feature extraction (full user — for training) ──────────────────────────


def extract_user_features(
    user_row: dict[str, Any],
    feature_columns: list[str],
) -> np.ndarray:
    """
    Convert a mature user's aggregated row into a numeric feature vector.

    Expected keys in user_row (from the SQL function):
      - native_language: str
      - target_language: str
      - proficiency_level: str (CEFR)
      - goals: list[str]
      - avg_session_length_ms: float
      - preferred_time_of_day: str
      - module_distribution: dict[str, float]  (module -> fraction)
      - forgetting_steepness: float | None
    """
    n = len(feature_columns)
    vec = np.zeros(n, dtype=np.float64)

    col_idx = {col: i for i, col in enumerate(feature_columns)}

    # 1. Native language
    native_key = f"native_{user_row.get('native_language', '')}"
    if native_key in col_idx:
        vec[col_idx[native_key]] = 1.0

    # 2. Target language
    target_key = f"target_{user_row.get('target_language', '')}"
    if target_key in col_idx:
        vec[col_idx[target_key]] = 1.0

    # 3. CEFR ordinal
    cefr = user_row.get("proficiency_level", "A1")
    vec[col_idx["cefr_ordinal"]] = CEFR_ORDINAL.get(cefr, 1)

    # 4. Goals multi-hot
    goals = user_row.get("goals") or []
    if isinstance(goals, str):
        goals = [goals]
    for goal in goals:
        goal_key = f"goal_{goal}"
        if goal_key in col_idx:
            vec[col_idx[goal_key]] = 1.0

    # 5. Avg session length (convert ms → minutes)
    avg_ms = user_row.get("avg_session_length_ms", 0) or 0
    vec[col_idx["avg_session_length_min"]] = avg_ms / 60_000.0

    # 6. Preferred time of day
    tod = user_row.get("preferred_time_of_day", "")
    time_key = f"time_{tod}"
    if time_key in col_idx:
        vec[col_idx[time_key]] = 1.0

    # 7. Module preference distribution
    module_dist = user_row.get("module_distribution") or {}
    if isinstance(module_dist, str):
        import json as _json
        module_dist = _json.loads(module_dist)
    for mod, frac in module_dist.items():
        mod_key = f"module_pref_{mod}"
        if mod_key in col_idx:
            vec[col_idx[mod_key]] = float(frac)

    # 8. Forgetting curve steepness
    steepness = user_row.get("forgetting_steepness")
    if steepness is not None and not math.isnan(steepness):
        vec[col_idx["forgetting_steepness"]] = float(steepness)

    return vec


# ── Feature extraction (signup-only — for cold start assignment) ────────────


def extract_signup_features(
    native_language: str,
    target_language: str,
    cefr_level: str,
    goals: list[str],
    feature_columns: list[str],
) -> np.ndarray:
    """
    Build a partial feature vector from signup info only.

    Missing features (session length, time of day, module prefs, forgetting
    steepness) are left as zeros — the scaler will normalise them to the
    training mean, which acts as a reasonable default.
    """
    n = len(feature_columns)
    vec = np.zeros(n, dtype=np.float64)

    col_idx = {col: i for i, col in enumerate(feature_columns)}

    # 1. Native language
    native_key = f"native_{native_language}"
    if native_key in col_idx:
        vec[col_idx[native_key]] = 1.0

    # 2. Target language
    target_key = f"target_{target_language}"
    if target_key in col_idx:
        vec[col_idx[target_key]] = 1.0

    # 3. CEFR ordinal
    vec[col_idx["cefr_ordinal"]] = CEFR_ORDINAL.get(cefr_level, 1)

    # 4. Goals multi-hot
    for goal in goals:
        goal_key = f"goal_{goal}"
        if goal_key in col_idx:
            vec[col_idx[goal_key]] = 1.0

    return vec


# ── Scaler utilities ────────────────────────────────────────────────────────


def fit_scaler(feature_matrix: np.ndarray) -> StandardScaler:
    """Fit a StandardScaler on the training feature matrix."""
    scaler = StandardScaler()
    scaler.fit(feature_matrix)
    return scaler


def save_feature_columns(columns: list[str], path: Path) -> None:
    """Persist feature column names for inference."""
    path.write_text(json.dumps(columns, indent=2))
    logger.info(f"Saved {len(columns)} feature columns to {path}")


def load_feature_columns(path: Path) -> list[str]:
    """Load feature column names."""
    return json.loads(path.read_text())
