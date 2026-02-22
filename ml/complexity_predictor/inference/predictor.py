"""
Complexity Level Predictor — Inference Engine.

Loads trained XGBoost models and provides the high-level function:
  - ``predict_session_plan(user_id)`` → complexity, word count, duration, confidence

Falls back to sensible heuristic defaults when the model is not yet trained.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx
import numpy as np
from loguru import logger

from ..config import settings
from ..data.feature_engineering import (
    FEATURE_NAMES,
    extract_features,
    features_to_dict,
)
from ..data.supabase_client import (
    get_user_session_features,
    save_session_plan,
)

try:
    import xgboost as xgb
except ImportError:
    xgb = None


class ComplexityPredictor:
    """
    Stateful inference wrapper for the complexity level predictor.

    Loads the XGBoost models once and serves predictions on demand.
    Includes a heuristic fallback for when the model is not yet trained.
    """

    def __init__(self) -> None:
        self._cx_model = None  # xgb.Booster for complexity
        self._wc_model = None  # xgb.Booster for word count
        self._feature_stats: dict[str, Any] | None = None

    # ── Model loading ───────────────────────────────────────────────────

    def load(self, cx_path: Path | None = None, wc_path: Path | None = None) -> None:
        """Load both models from disk."""
        if xgb is None:
            raise RuntimeError("XGBoost not installed")

        paths = settings.paths
        cx = cx_path or paths.best_model_path
        wc = wc_path or paths.session_length_model_path

        if not cx.exists():
            raise FileNotFoundError(f"No complexity model at {cx}")
        if not wc.exists():
            raise FileNotFoundError(f"No session length model at {wc}")

        self._cx_model = xgb.Booster()
        self._cx_model.load_model(str(cx))

        self._wc_model = xgb.Booster()
        self._wc_model.load_model(str(wc))

        # Load feature stats if available
        if paths.feature_stats_path.exists():
            self._feature_stats = json.loads(paths.feature_stats_path.read_text())

        logger.info(f"Complexity predictor models loaded from {cx.parent}")

    @property
    def is_loaded(self) -> bool:
        return self._cx_model is not None and self._wc_model is not None

    # ── DKT integration ─────────────────────────────────────────────────

    @staticmethod
    def _fetch_p_recall_avg(user_id: str) -> float | None:
        """
        Call the DKT service to get the average p_recall across due words.
        Returns None if the service is unavailable.
        """
        dkt_cfg = settings.dkt
        try:
            resp = httpx.post(
                f"{dkt_cfg.url}/ml/dkt/knowledge-state",
                json={"userId": user_id},
                headers={
                    "Content-Type": "application/json",
                    "X-Api-Key": dkt_cfg.api_key,
                },
                timeout=dkt_cfg.timeout_seconds,
            )
            if resp.status_code != 200:
                logger.debug(f"DKT service returned {resp.status_code}")
                return None

            data = resp.json()
            word_states = data.get("wordStates", [])
            if not word_states:
                return None

            p_recalls = [ws.get("pRecall", 0.5) for ws in word_states]
            return float(np.mean(p_recalls))

        except (httpx.RequestError, httpx.TimeoutException) as exc:
            logger.debug(f"DKT service unavailable: {exc}")
            return None

    # ── Main prediction ─────────────────────────────────────────────────

    def predict_session_plan(self, user_id: str) -> dict[str, Any]:
        """
        Predict the optimal session plan for a user.

        Returns:
            {
                "complexityLevel": int (1-5),
                "recommendedWordCount": int,
                "recommendedDurationMinutes": float,
                "confidence": float (0-1),
                "usingModel": bool,
                "features": dict,
                "planId": str | None
            }
        """
        cfg = settings.model

        # ── 1. Fetch user features from DB ─────────────────────────────
        db_features = get_user_session_features(user_id)
        if db_features is None:
            # Brand new user — use heuristic defaults
            logger.debug(f"No session data for user {user_id} — using heuristic")
            return self._heuristic_fallback(user_id, reason="new_user")

        # ── 2. Fetch p_recall from DKT ─────────────────────────────────
        p_recall_avg = self._fetch_p_recall_avg(user_id)

        # ── 3. Build feature vector ────────────────────────────────────
        features = extract_features(db_features, p_recall_avg)
        feature_dict = features_to_dict(features)

        # ── 4. Predict with models or fallback ─────────────────────────
        if not self.is_loaded:
            logger.debug("Model not loaded — using heuristic fallback")
            result = self._heuristic_prediction(features, feature_dict)
            result["usingModel"] = False
        else:
            result = self._model_prediction(features, feature_dict)
            result["usingModel"] = True

        # ── 5. Save the plan for audit / future training ───────────────
        try:
            plan_id = save_session_plan(
                user_id=user_id,
                complexity_level=result["complexityLevel"],
                word_count=result["recommendedWordCount"],
                duration_minutes=result["recommendedDurationMinutes"],
                confidence=result["confidence"],
                input_features=feature_dict,
                model_version="v0.1.0" if result["usingModel"] else "heuristic",
            )
            result["planId"] = plan_id
        except Exception as exc:
            logger.warning(f"Failed to save session plan: {exc}")
            result["planId"] = None

        return result

    # ── Model-based prediction ──────────────────────────────────────────

    def _model_prediction(
        self, features: np.ndarray, feature_dict: dict[str, float]
    ) -> dict[str, Any]:
        """Run the XGBoost models for prediction."""
        cfg = settings.model

        dmatrix = xgb.DMatrix(
            features.reshape(1, -1), feature_names=FEATURE_NAMES
        )

        # Complexity: softprob → pick argmax + compute confidence
        cx_probs = self._cx_model.predict(dmatrix)[0]  # [5]
        cx_pred = int(cx_probs.argmax()) + 1  # back to 1-indexed
        cx_confidence = float(cx_probs.max())

        # Word count
        wc_pred = float(self._wc_model.predict(dmatrix)[0])
        wc_pred = int(np.clip(wc_pred, cfg.min_word_count, cfg.max_word_count))

        # Duration: derive from word count (approx 2-3 words per minute
        # of reading time, adjusted by complexity)
        words_per_minute = max(2.0, 5.0 - (cx_pred - 1) * 0.5)
        dur_pred = wc_pred / words_per_minute
        dur_pred = float(np.clip(dur_pred, cfg.min_duration_minutes, cfg.max_duration_minutes))

        return {
            "complexityLevel": cx_pred,
            "recommendedWordCount": wc_pred,
            "recommendedDurationMinutes": round(dur_pred, 1),
            "confidence": round(cx_confidence, 4),
            "features": feature_dict,
        }

    # ── Heuristic fallback ──────────────────────────────────────────────

    def _heuristic_prediction(
        self, features: np.ndarray, feature_dict: dict[str, float]
    ) -> dict[str, Any]:
        """
        Rule-based prediction when the model is not available.

        Uses simple rules based on the feature values:
          - High p_recall + high streak → higher complexity
          - High cognitive load last session → lower complexity
          - Long break → lower complexity
        """
        cfg = settings.model

        p_recall = feature_dict.get("p_recall_avg", cfg.default_p_recall_avg)
        last_cog = feature_dict.get("last_session_cognitive_load", cfg.default_cognitive_load)
        last_comp = feature_dict.get("last_session_completion_rate", cfg.default_completion_rate)
        streak = feature_dict.get("current_streak_days", 0)
        days_since = feature_dict.get("days_since_last_session", 0.7)

        # Start at level 2 (moderate)
        complexity = 2.0

        # Adjust for p_recall (higher recall → can handle more complexity)
        if p_recall > 0.8:
            complexity += 1.0
        elif p_recall > 0.6:
            complexity += 0.5
        elif p_recall < 0.4:
            complexity -= 0.5

        # Adjust for last session cognitive load
        if last_cog > 0.6:
            complexity -= 1.0
        elif last_cog > 0.5:
            complexity -= 0.5
        elif last_cog < 0.2:
            complexity += 0.5

        # Adjust for streak (consistent practice → confidence boost)
        if streak > 7:
            complexity += 0.5
        elif streak > 14:
            complexity += 1.0

        # Adjust for break length (long break → simpler)
        if days_since > 3.0:
            complexity -= 0.5
        elif days_since > 7.0:
            complexity -= 1.0

        # Clamp to valid range
        complexity_level = int(np.clip(round(complexity), cfg.min_complexity, cfg.max_complexity))

        # Word count: base 50, adjust by complexity
        wc = int(np.clip(30 + complexity_level * 12, cfg.min_word_count, cfg.max_word_count))

        # Duration
        words_per_minute = max(2.0, 5.0 - (complexity_level - 1) * 0.5)
        dur = float(np.clip(wc / words_per_minute, cfg.min_duration_minutes, cfg.max_duration_minutes))

        return {
            "complexityLevel": complexity_level,
            "recommendedWordCount": wc,
            "recommendedDurationMinutes": round(dur, 1),
            "confidence": 0.3,  # low confidence for heuristic
            "features": feature_dict,
        }

    def _heuristic_fallback(
        self, user_id: str, reason: str = "no_data"
    ) -> dict[str, Any]:
        """Absolute fallback for brand-new users with no data at all."""
        return {
            "complexityLevel": 1,
            "recommendedWordCount": 40,
            "recommendedDurationMinutes": 8.0,
            "confidence": 0.2,
            "usingModel": False,
            "features": {},
            "planId": None,
            "reason": reason,
        }


# ── Module-level singleton ──────────────────────────────────────────────────

predictor = ComplexityPredictor()
