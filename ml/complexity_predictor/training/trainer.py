"""
Complexity Level Predictor — Training Pipeline.

Trains two XGBoost models:
  1. Complexity classifier   → predicts optimal complexity level (1-5)
  2. Session length regressor → predicts word count & duration

Training signal: historical sessions labelled with actual cognitive load and
completion rate. The "optimal" complexity is the one that maximises completion
while keeping cognitive load in the sweet spot (0.25-0.50).

Usage:
    from ml.complexity_predictor.training.trainer import train_complexity_predictor
    result = train_complexity_predictor()
"""

from __future__ import annotations

import json
import time
from collections import defaultdict
from typing import Any

import numpy as np
from loguru import logger
from sklearn.model_selection import GroupShuffleSplit

from ..config import settings
from ..data.feature_engineering import (
    FEATURE_NAMES,
    extract_training_features,
)
from ..data.supabase_client import fetch_labelled_sessions

try:
    import xgboost as xgb
except ImportError:
    xgb = None
    logger.warning("XGBoost not installed — training will fail. Install with: pip install xgboost")


# ── Label generation ────────────────────────────────────────────────────────


def _compute_optimal_complexity(
    rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    For each session, compute the "optimal" complexity label.

    Strategy:
      - If the session was in the sweet spot (moderate load, high completion),
        the used complexity is optimal → label = actual complexity.
      - If load was too high → optimal = actual - 1 (simplify)
      - If load was too low AND completion was high → optimal = actual + 1
      - Clamp to [1, 5]
    """
    cfg = settings.model
    labelled = []

    for row in rows:
        actual_cog = row.get("actual_cognitive_load", 0.5)
        actual_comp = row.get("actual_completion_rate", 0.5)
        actual_complexity = row.get("complexity_level", 1)
        is_optimal = row.get("is_optimal", False)

        if is_optimal:
            optimal = actual_complexity
        elif actual_cog > cfg.optimal_cognitive_load_max:
            # Overloaded → should have been simpler
            optimal = max(cfg.min_complexity, actual_complexity - 1)
        elif (
            actual_cog < cfg.optimal_cognitive_load_min
            and actual_comp >= cfg.optimal_completion_rate_min
        ):
            # Too easy and completing well → bump up
            optimal = min(cfg.max_complexity, actual_complexity + 1)
        else:
            # Everything else: keep as-is
            optimal = actual_complexity

        row["optimal_complexity"] = optimal
        labelled.append(row)

    return labelled


def _compute_optimal_session_length(
    rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    For each row, set the target word count and duration based on
    whether the session was "good" (completed, moderate load).
    """
    for row in rows:
        if row.get("is_optimal"):
            # The actual lengths were fine
            row["optimal_word_count"] = row["word_count"]
            row["optimal_duration_minutes"] = row["duration_minutes"]
        else:
            actual_cog = row.get("actual_cognitive_load", 0.5)
            wc = row["word_count"]
            dur = row["duration_minutes"]

            if actual_cog > settings.model.optimal_cognitive_load_max:
                # Overloaded → recommend shorter
                row["optimal_word_count"] = max(
                    settings.model.min_word_count, int(wc * 0.75)
                )
                row["optimal_duration_minutes"] = max(
                    settings.model.min_duration_minutes, dur * 0.75
                )
            elif actual_cog < settings.model.optimal_cognitive_load_min:
                # Under-loaded → recommend longer
                row["optimal_word_count"] = min(
                    settings.model.max_word_count, int(wc * 1.25)
                )
                row["optimal_duration_minutes"] = min(
                    settings.model.max_duration_minutes, dur * 1.25
                )
            else:
                row["optimal_word_count"] = wc
                row["optimal_duration_minutes"] = dur

    return rows


# ── Training ────────────────────────────────────────────────────────────────


def train_complexity_predictor() -> dict[str, Any]:
    """
    Full training run.

    Steps:
      1. Fetch labelled sessions from Supabase
      2. Extract features & compute optimal labels
      3. Train/val split by user
      4. Train XGBoost classifier for complexity level
      5. Train XGBoost regressor for word count & duration
      6. Save checkpoints

    Returns dict with training metrics.
    """
    if xgb is None:
        raise RuntimeError("XGBoost is required for training. Install with: pip install xgboost")

    cfg = settings.model
    paths = settings.paths
    t0 = time.time()

    # ── 1. Fetch data ──────────────────────────────────────────────────
    logger.info("Fetching labelled sessions from Supabase...")
    raw_sessions = fetch_labelled_sessions(
        min_sessions=cfg.min_sessions_for_training,
    )

    if len(raw_sessions) < cfg.min_sessions_for_training:
        logger.warning(
            f"Not enough data: {len(raw_sessions)} sessions "
            f"(need {cfg.min_sessions_for_training}). Aborting."
        )
        return {"status": "insufficient_data", "session_count": len(raw_sessions)}

    # ── 2. Feature extraction ──────────────────────────────────────────
    logger.info("Extracting features...")
    processed = []
    for row in raw_sessions:
        result = extract_training_features(row)
        if result is not None:
            result["user_id"] = row.get("user_id", "unknown")
            processed.append(result)

    if len(processed) < 50:
        logger.warning(f"Only {len(processed)} valid samples after extraction")
        return {"status": "insufficient_valid_data", "valid_count": len(processed)}

    # ── 3. Compute optimal labels ──────────────────────────────────────
    processed = _compute_optimal_complexity(processed)
    processed = _compute_optimal_session_length(processed)

    # ── 4. Build arrays ────────────────────────────────────────────────
    X = np.stack([p["features"] for p in processed])
    y_complexity = np.array([p["optimal_complexity"] for p in processed], dtype=np.int32)
    y_word_count = np.array([p["optimal_word_count"] for p in processed], dtype=np.float32)
    y_duration = np.array([p["optimal_duration_minutes"] for p in processed], dtype=np.float32)
    user_ids = np.array([p["user_id"] for p in processed])

    logger.info(
        f"Dataset: {X.shape[0]} samples, {X.shape[1]} features, "
        f"complexity distribution: {dict(zip(*np.unique(y_complexity, return_counts=True)))}"
    )

    # ── 5. Train/val split by user ─────────────────────────────────────
    unique_users = np.unique(user_ids)
    if len(unique_users) < 3:
        logger.warning("< 3 unique users — using all data for training (no validation)")
        train_idx = np.arange(len(X))
        val_idx = np.array([], dtype=np.int64)
    else:
        gss = GroupShuffleSplit(n_splits=1, test_size=cfg.test_size, random_state=42)
        train_idx, val_idx = next(gss.split(X, groups=user_ids))

    X_train, X_val = X[train_idx], X[val_idx] if len(val_idx) > 0 else X[train_idx]
    y_cx_train = y_complexity[train_idx]
    y_cx_val = y_complexity[val_idx] if len(val_idx) > 0 else y_complexity[train_idx]
    y_wc_train = y_word_count[train_idx]
    y_wc_val = y_word_count[val_idx] if len(val_idx) > 0 else y_word_count[train_idx]
    y_dur_train = y_duration[train_idx]
    y_dur_val = y_duration[val_idx] if len(val_idx) > 0 else y_duration[train_idx]

    logger.info(
        f"Split: {len(train_idx)} train, {len(val_idx)} val "
        f"({len(np.unique(user_ids[train_idx]))} / "
        f"{len(np.unique(user_ids[val_idx])) if len(val_idx) > 0 else 0} users)"
    )

    # ── 6. Train complexity classifier ─────────────────────────────────
    logger.info("Training complexity level classifier...")

    # XGBoost uses 0-indexed classes for multi:softmax
    y_cx_train_0 = y_cx_train - 1  # [0, 4]
    y_cx_val_0 = y_cx_val - 1

    dtrain_cx = xgb.DMatrix(X_train, label=y_cx_train_0, feature_names=FEATURE_NAMES)
    dval_cx = xgb.DMatrix(X_val, label=y_cx_val_0, feature_names=FEATURE_NAMES)

    cx_params = {
        "objective": "multi:softprob",
        "num_class": 5,
        "max_depth": cfg.max_depth,
        "learning_rate": cfg.learning_rate,
        "min_child_weight": cfg.min_child_weight,
        "subsample": cfg.subsample,
        "colsample_bytree": cfg.colsample_bytree,
        "eval_metric": "mlogloss",
        "seed": 42,
        "verbosity": 1,
    }

    evals_cx = [(dtrain_cx, "train")]
    if len(val_idx) > 0:
        evals_cx.append((dval_cx, "val"))

    cx_model = xgb.train(
        cx_params,
        dtrain_cx,
        num_boost_round=cfg.n_estimators,
        evals=evals_cx,
        early_stopping_rounds=cfg.early_stopping_rounds if len(val_idx) > 0 else None,
        verbose_eval=10,
    )

    cx_model.save_model(str(paths.best_model_path))
    logger.info(f"Complexity model saved → {paths.best_model_path}")

    # ── 7. Train session-length regressor (multi-output) ───────────────
    logger.info("Training session length regressor...")

    # Combine word count and duration into one target by training two models
    # We use a single XGBoost regressor for word count; duration is derived
    dtrain_wc = xgb.DMatrix(X_train, label=y_wc_train, feature_names=FEATURE_NAMES)
    dval_wc = xgb.DMatrix(X_val, label=y_wc_val, feature_names=FEATURE_NAMES)

    wc_params = {
        "objective": "reg:squarederror",
        "max_depth": cfg.max_depth,
        "learning_rate": cfg.learning_rate,
        "min_child_weight": cfg.min_child_weight,
        "subsample": cfg.subsample,
        "colsample_bytree": cfg.colsample_bytree,
        "eval_metric": "rmse",
        "seed": 42,
        "verbosity": 1,
    }

    evals_wc = [(dtrain_wc, "train")]
    if len(val_idx) > 0:
        evals_wc.append((dval_wc, "val"))

    wc_model = xgb.train(
        wc_params,
        dtrain_wc,
        num_boost_round=cfg.n_estimators,
        evals=evals_wc,
        early_stopping_rounds=cfg.early_stopping_rounds if len(val_idx) > 0 else None,
        verbose_eval=10,
    )

    wc_model.save_model(str(paths.session_length_model_path))
    logger.info(f"Session length model saved → {paths.session_length_model_path}")

    # ── 8. Compute & save feature stats ────────────────────────────────
    feature_stats = {
        "means": X_train.mean(axis=0).tolist(),
        "stds": X_train.std(axis=0).tolist(),
        "mins": X_train.min(axis=0).tolist(),
        "maxs": X_train.max(axis=0).tolist(),
        "feature_names": FEATURE_NAMES,
    }
    paths.feature_stats_path.write_text(json.dumps(feature_stats, indent=2))

    # ── 9. Evaluation ──────────────────────────────────────────────────
    metrics: dict[str, Any] = {
        "status": "completed",
        "total_samples": len(X),
        "train_samples": len(train_idx),
        "val_samples": len(val_idx),
    }

    if len(val_idx) > 0:
        # Complexity accuracy
        cx_pred_probs = cx_model.predict(dval_cx)
        cx_pred = cx_pred_probs.argmax(axis=1) + 1
        cx_accuracy = (cx_pred == y_cx_val).mean()
        cx_within_1 = (np.abs(cx_pred - y_cx_val) <= 1).mean()
        metrics["complexity_accuracy"] = float(round(cx_accuracy, 4))
        metrics["complexity_within_1"] = float(round(cx_within_1, 4))

        # Word count RMSE
        wc_pred = wc_model.predict(dval_wc)
        wc_rmse = float(np.sqrt(((wc_pred - y_wc_val) ** 2).mean()))
        metrics["word_count_rmse"] = round(wc_rmse, 2)

    # Feature importances
    cx_importance = cx_model.get_score(importance_type="gain")
    metrics["feature_importance"] = cx_importance

    elapsed = time.time() - t0
    metrics["training_time_seconds"] = round(elapsed, 1)

    logger.info(
        f"Training completed in {elapsed:.1f}s — "
        f"complexity accuracy: {metrics.get('complexity_accuracy', 'N/A')}, "
        f"within-1: {metrics.get('complexity_within_1', 'N/A')}, "
        f"wc_rmse: {metrics.get('word_count_rmse', 'N/A')}"
    )

    return metrics
