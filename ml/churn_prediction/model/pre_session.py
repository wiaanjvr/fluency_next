"""
Pre-session churn risk predictor.

Binary classifier predicting whether a user will NOT start a session today.
Starts with logistic regression, upgradeable to gradient boosted tree.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
from loguru import logger
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

from ..config import settings

# Feature column order — must match training data extraction
PRE_SESSION_FEATURES = [
    "days_since_last_session",
    "current_streak_days",
    "last_session_cognitive_load",
    "last_session_completion",
    "average_sessions_per_week",
    "day_of_week",
    # One-hot for time_of_day
    "time_morning",
    "time_afternoon",
    "time_evening",
    "time_night",
]


class PreSessionChurnModel:
    """Pre-session churn risk classifier."""

    def __init__(self) -> None:
        self._model: LogisticRegression | Any | None = None
        self._scaler: StandardScaler | None = None
        self._is_loaded: bool = False
        self._model_version: str = "v0.1.0"

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded

    @property
    def model_version(self) -> str:
        return self._model_version

    # ── Feature extraction ──────────────────────────────────────────────

    @staticmethod
    def extract_features(row: dict[str, Any]) -> np.ndarray:
        """
        Convert a feature dict to a numeric vector.

        Expected keys: days_since_last_session, current_streak_days,
        last_session_cognitive_load, last_session_completion,
        average_sessions_per_week, day_of_week, time_of_day
        """
        time_bucket = row.get("time_of_day", "morning")
        return np.array(
            [
                float(row.get("days_since_last_session", 0)),
                float(row.get("current_streak_days", 0)),
                float(row.get("last_session_cognitive_load", 0.5)),
                float(row.get("last_session_completion", False)),
                float(row.get("average_sessions_per_week", 0)),
                float(row.get("day_of_week", 0)),
                float(time_bucket == "morning"),
                float(time_bucket == "afternoon"),
                float(time_bucket == "evening"),
                float(time_bucket == "night"),
            ],
            dtype=np.float64,
        )

    def extract_feature_matrix(
        self, rows: list[dict[str, Any]]
    ) -> tuple[np.ndarray, np.ndarray]:
        """Extract feature matrix X and labels y from training rows."""
        X_list = []
        y_list = []
        for row in rows:
            X_list.append(self.extract_features(row))
            y_list.append(float(row.get("did_not_session_today", False)))

        X = np.vstack(X_list)
        y = np.array(y_list, dtype=np.float64)
        return X, y

    # ── Training ────────────────────────────────────────────────────────

    def train(self, rows: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Train the pre-session churn classifier.

        Returns training metadata (accuracy, n_samples, etc.).
        """
        if len(rows) < settings.pre_session.min_training_samples:
            raise ValueError(
                f"Insufficient training data: {len(rows)} < "
                f"{settings.pre_session.min_training_samples}"
            )

        X, y = self.extract_feature_matrix(rows)

        # Scale features
        self._scaler = StandardScaler()
        X_scaled = self._scaler.fit_transform(X)

        # Create model based on config
        model_type = settings.pre_session.model_type
        if model_type == "gradient_boosted_tree":
            try:
                from sklearn.ensemble import GradientBoostingClassifier

                self._model = GradientBoostingClassifier(
                    n_estimators=settings.pre_session.n_estimators,
                    max_depth=settings.pre_session.max_depth,
                    learning_rate=settings.pre_session.learning_rate,
                    random_state=settings.pre_session.random_state,
                )
            except ImportError:
                logger.warning(
                    "GradientBoostingClassifier not available, "
                    "falling back to LogisticRegression"
                )
                model_type = "logistic_regression"

        if model_type == "logistic_regression":
            self._model = LogisticRegression(
                max_iter=settings.pre_session.max_iter,
                random_state=settings.pre_session.random_state,
                class_weight="balanced",
            )

        self._model.fit(X_scaled, y)
        self._is_loaded = True

        # Evaluate on training set (in-sample, for logging only)
        train_accuracy = self._model.score(X_scaled, y)
        churn_rate = float(y.mean())

        logger.info(
            f"Pre-session model trained: {model_type}, "
            f"n={len(rows)}, accuracy={train_accuracy:.3f}, "
            f"churn_rate={churn_rate:.3f}"
        )

        return {
            "status": "trained",
            "model_type": model_type,
            "n_samples": len(rows),
            "train_accuracy": round(train_accuracy, 4),
            "churn_rate": round(churn_rate, 4),
            "n_features": X.shape[1],
        }

    # ── Prediction ──────────────────────────────────────────────────────

    def predict(self, features: dict[str, Any]) -> float:
        """
        Predict churn probability for a single user.

        Returns float between 0 and 1.
        Falls back to heuristic if model not loaded.
        """
        if not self._is_loaded or self._model is None:
            return self._heuristic_predict(features)

        X = self.extract_features(features).reshape(1, -1)
        X_scaled = self._scaler.transform(X)

        # probability of class 1 (did_not_session_today=True)
        proba = self._model.predict_proba(X_scaled)[0]
        # Class index for True/1.0
        classes = list(self._model.classes_)
        churn_idx = classes.index(1.0) if 1.0 in classes else 1
        return float(proba[churn_idx])

    @staticmethod
    def _heuristic_predict(features: dict[str, Any]) -> float:
        """
        Simple heuristic fallback when no model is trained.
        Uses days_since_last_session and streak as primary signals.
        """
        days_since = float(features.get("days_since_last_session", 1))
        streak = float(features.get("current_streak_days", 0))
        avg_weekly = float(features.get("average_sessions_per_week", 3))

        # Base risk from days since last session
        if days_since <= 1:
            base_risk = 0.15
        elif days_since <= 3:
            base_risk = 0.40
        elif days_since <= 7:
            base_risk = 0.65
        else:
            base_risk = 0.85

        # Streak reduces risk
        streak_bonus = min(streak * 0.02, 0.2)

        # Low weekly average increases risk
        if avg_weekly < 1:
            freq_penalty = 0.15
        elif avg_weekly < 3:
            freq_penalty = 0.05
        else:
            freq_penalty = 0.0

        probability = max(0.0, min(1.0, base_risk - streak_bonus + freq_penalty))
        return round(probability, 4)

    # ── Persistence ─────────────────────────────────────────────────────

    def save(self) -> None:
        """Save model and scaler to disk."""
        if self._model is not None:
            joblib.dump(self._model, settings.paths.pre_session_model_path)
            logger.info(
                f"Pre-session model saved to {settings.paths.pre_session_model_path}"
            )
        if self._scaler is not None:
            joblib.dump(self._scaler, settings.paths.pre_session_scaler_path)
            logger.info(
                f"Pre-session scaler saved to {settings.paths.pre_session_scaler_path}"
            )

    def load(self) -> None:
        """Load model and scaler from disk."""
        model_path = settings.paths.pre_session_model_path
        scaler_path = settings.paths.pre_session_scaler_path

        if not model_path.exists():
            raise FileNotFoundError(f"Pre-session model not found at {model_path}")
        if not scaler_path.exists():
            raise FileNotFoundError(f"Pre-session scaler not found at {scaler_path}")

        self._model = joblib.load(model_path)
        self._scaler = joblib.load(scaler_path)
        self._is_loaded = True
        logger.info("Pre-session churn model loaded from disk")


# Module-level singleton
pre_session_model = PreSessionChurnModel()
