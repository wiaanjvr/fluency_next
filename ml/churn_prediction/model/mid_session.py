"""
Mid-session abandonment risk predictor.

Binary classifier predicting whether a user will quit before completing
the current session. Runs every 5 words during a session.
"""

from __future__ import annotations

from typing import Any

import joblib
import numpy as np
from loguru import logger
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

from ..config import settings

# Feature column order — must match training data extraction
MID_SESSION_FEATURES = [
    "consecutive_errors",
    "response_time_trend",
    "session_duration_so_far_ms",
    "cognitive_load",
    "words_remaining_in_session",
]


class MidSessionAbandonmentModel:
    """Mid-session abandonment risk classifier."""

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

        Expected keys: consecutive_errors, response_time_trend,
        session_duration_so_far_ms, cognitive_load, words_remaining_in_session
        """
        return np.array(
            [
                float(row.get("consecutive_errors", 0)),
                float(row.get("response_time_trend", 0)),
                float(row.get("session_duration_so_far_ms", 0)),
                float(row.get("cognitive_load", 0.5)),
                float(row.get("words_remaining_in_session", 10)),
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
            y_list.append(float(row.get("abandoned_session", False)))

        X = np.vstack(X_list)
        y = np.array(y_list, dtype=np.float64)
        return X, y

    # ── Training ────────────────────────────────────────────────────────

    def train(self, rows: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Train the mid-session abandonment classifier.

        Returns training metadata.
        """
        if len(rows) < settings.mid_session.min_training_samples:
            raise ValueError(
                f"Insufficient training data: {len(rows)} < "
                f"{settings.mid_session.min_training_samples}"
            )

        X, y = self.extract_feature_matrix(rows)

        # Scale features
        self._scaler = StandardScaler()
        X_scaled = self._scaler.fit_transform(X)

        # Create model based on config
        model_type = settings.mid_session.model_type
        if model_type == "gradient_boosted_tree":
            try:
                from sklearn.ensemble import GradientBoostingClassifier

                self._model = GradientBoostingClassifier(
                    n_estimators=settings.mid_session.n_estimators,
                    max_depth=settings.mid_session.max_depth,
                    learning_rate=settings.mid_session.learning_rate,
                    random_state=settings.mid_session.random_state,
                )
            except ImportError:
                logger.warning(
                    "GradientBoostingClassifier not available, "
                    "falling back to LogisticRegression"
                )
                model_type = "logistic_regression"

        if model_type == "logistic_regression":
            self._model = LogisticRegression(
                max_iter=settings.mid_session.max_iter,
                random_state=settings.mid_session.random_state,
                class_weight="balanced",
            )

        self._model.fit(X_scaled, y)
        self._is_loaded = True

        train_accuracy = self._model.score(X_scaled, y)
        abandonment_rate = float(y.mean())

        logger.info(
            f"Mid-session model trained: {model_type}, "
            f"n={len(rows)}, accuracy={train_accuracy:.3f}, "
            f"abandonment_rate={abandonment_rate:.3f}"
        )

        return {
            "status": "trained",
            "model_type": model_type,
            "n_samples": len(rows),
            "train_accuracy": round(train_accuracy, 4),
            "abandonment_rate": round(abandonment_rate, 4),
            "n_features": X.shape[1],
        }

    # ── Prediction ──────────────────────────────────────────────────────

    def predict(self, features: dict[str, Any]) -> float:
        """
        Predict abandonment probability for current session state.

        Returns float between 0 and 1.
        Falls back to heuristic if model not loaded.
        """
        if not self._is_loaded or self._model is None:
            return self._heuristic_predict(features)

        X = self.extract_features(features).reshape(1, -1)
        X_scaled = self._scaler.transform(X)

        proba = self._model.predict_proba(X_scaled)[0]
        classes = list(self._model.classes_)
        abandon_idx = classes.index(1.0) if 1.0 in classes else 1
        return float(proba[abandon_idx])

    @staticmethod
    def _heuristic_predict(features: dict[str, Any]) -> float:
        """
        Simple heuristic fallback when no model is trained.
        Uses consecutive errors and response time trend.
        """
        consec_errors = int(features.get("consecutive_errors", 0))
        rt_trend = float(features.get("response_time_trend", 0))
        duration_ms = float(features.get("session_duration_so_far_ms", 0))
        cog_load = float(features.get("cognitive_load", 0.5))
        words_remaining = int(features.get("words_remaining_in_session", 10))

        # Base risk from consecutive errors
        if consec_errors >= 5:
            base_risk = 0.75
        elif consec_errors >= 3:
            base_risk = 0.50
        elif consec_errors >= 1:
            base_risk = 0.25
        else:
            base_risk = 0.10

        # Rising response times = fatigue → increase risk
        if rt_trend > 2000:
            rt_penalty = 0.20
        elif rt_trend > 1000:
            rt_penalty = 0.10
        elif rt_trend > 500:
            rt_penalty = 0.05
        else:
            rt_penalty = 0.0

        # High cognitive load increases risk
        cog_penalty = max(0, (cog_load - 0.6)) * 0.3

        # Long sessions increase risk
        duration_min = duration_ms / 60_000
        if duration_min > 30:
            time_penalty = 0.15
        elif duration_min > 20:
            time_penalty = 0.08
        else:
            time_penalty = 0.0

        # Few words remaining reduces risk (almost done!)
        if words_remaining <= 3:
            completion_bonus = 0.15
        elif words_remaining <= 5:
            completion_bonus = 0.08
        else:
            completion_bonus = 0.0

        probability = max(
            0.0,
            min(
                1.0,
                base_risk + rt_penalty + cog_penalty + time_penalty - completion_bonus,
            ),
        )
        return round(probability, 4)

    # ── Persistence ─────────────────────────────────────────────────────

    def save(self) -> None:
        """Save model and scaler to disk."""
        if self._model is not None:
            joblib.dump(self._model, settings.paths.mid_session_model_path)
            logger.info(
                f"Mid-session model saved to {settings.paths.mid_session_model_path}"
            )
        if self._scaler is not None:
            joblib.dump(self._scaler, settings.paths.mid_session_scaler_path)
            logger.info(
                f"Mid-session scaler saved to {settings.paths.mid_session_scaler_path}"
            )

    def load(self) -> None:
        """Load model and scaler from disk."""
        model_path = settings.paths.mid_session_model_path
        scaler_path = settings.paths.mid_session_scaler_path

        if not model_path.exists():
            raise FileNotFoundError(f"Mid-session model not found at {model_path}")
        if not scaler_path.exists():
            raise FileNotFoundError(f"Mid-session scaler not found at {scaler_path}")

        self._model = joblib.load(model_path)
        self._scaler = joblib.load(scaler_path)
        self._is_loaded = True
        logger.info("Mid-session abandonment model loaded from disk")


# Module-level singleton
mid_session_model = MidSessionAbandonmentModel()
