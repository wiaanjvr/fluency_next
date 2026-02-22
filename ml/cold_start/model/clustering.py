"""
K-Means clustering model for learner segmentation.

Clusters mature users (500+ events) into k=20 groups based on:
  - Language pair
  - CEFR level
  - Learning goals
  - Session behaviour
  - Module preferences
  - Forgetting curve steepness

Each cluster produces a profile with recommended module weights and
default complexity level.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from loguru import logger
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from ..config import settings
from .feature_engineering import (
    extract_signup_features,
    extract_user_features,
    fit_scaler,
    get_feature_columns,
    load_feature_columns,
    save_feature_columns,
)


class LearnerClusterModel:
    """
    K-Means learner clustering for cold start recommendations.

    Lifecycle:
      1. train()  — fit on mature user data
      2. save()   — persist model + scaler + profiles
      3. load()   — restore from disk
      4. assign() — predict cluster for new user signup features
    """

    def __init__(self) -> None:
        self._kmeans: KMeans | None = None
        self._scaler: StandardScaler | None = None
        self._feature_columns: list[str] = []
        self._cluster_profiles: dict[int, dict[str, Any]] = {}
        self._is_loaded: bool = False

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded

    @property
    def n_clusters(self) -> int:
        return settings.clustering.n_clusters

    # ── Training ────────────────────────────────────────────────────────

    def train(self, user_rows: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Fit K-Means on mature user feature vectors.

        Args:
            user_rows: List of dicts from the get_cold_start_training_data RPC.

        Returns:
            Training metadata (n_users, n_clusters, inertia, etc.).
        """
        if len(user_rows) < settings.clustering.min_users_for_training:
            raise ValueError(
                f"Need at least {settings.clustering.min_users_for_training} "
                f"mature users, got {len(user_rows)}"
            )

        # Discover language set from training data
        native_languages = sorted(set(
            r.get("native_language", "unknown") for r in user_rows
        ))
        target_languages = sorted(set(
            r.get("target_language", "unknown") for r in user_rows
        ))

        self._feature_columns = get_feature_columns(native_languages, target_languages)
        n_features = len(self._feature_columns)

        logger.info(
            f"Training K-Means: {len(user_rows)} users, {n_features} features, "
            f"k={settings.clustering.n_clusters}"
        )

        # Build feature matrix
        X = np.zeros((len(user_rows), n_features), dtype=np.float64)
        for i, row in enumerate(user_rows):
            X[i] = extract_user_features(row, self._feature_columns)

        # Fit scaler
        self._scaler = fit_scaler(X)
        X_scaled = self._scaler.transform(X)

        # Fit K-Means
        k = min(settings.clustering.n_clusters, len(user_rows))
        self._kmeans = KMeans(
            n_clusters=k,
            random_state=settings.clustering.random_state,
            max_iter=settings.clustering.max_iter,
            n_init=settings.clustering.n_init,
        )
        labels = self._kmeans.fit_predict(X_scaled)

        # Build cluster profiles
        self._cluster_profiles = self._build_profiles(user_rows, labels, k)

        self._is_loaded = True

        return {
            "status": "trained",
            "n_users": len(user_rows),
            "n_features": n_features,
            "n_clusters": k,
            "inertia": float(self._kmeans.inertia_),
            "cluster_sizes": {
                int(cid): int(count)
                for cid, count in zip(*np.unique(labels, return_counts=True))
            },
        }

    def _build_profiles(
        self,
        user_rows: list[dict[str, Any]],
        labels: np.ndarray,
        k: int,
    ) -> dict[int, dict[str, Any]]:
        """
        For each cluster, compute the recommended module weights, default
        complexity level, and estimated vocab frequency band.
        """
        profiles: dict[int, dict[str, Any]] = {}

        for cluster_id in range(k):
            mask = labels == cluster_id
            cluster_users = [
                user_rows[i] for i in range(len(user_rows)) if mask[i]
            ]

            if not cluster_users:
                continue

            # Module weight distribution (average across cluster)
            module_weights = self._avg_module_distribution(cluster_users)

            # Average CEFR → default complexity
            avg_cefr = np.mean([
                self._cefr_to_complexity(u.get("proficiency_level", "A1"))
                for u in cluster_users
            ])
            default_complexity = max(1, min(5, int(round(avg_cefr))))

            # Recommended module sequence (sorted by weight desc)
            module_sequence = sorted(
                module_weights.keys(),
                key=lambda m: module_weights[m],
                reverse=True,
            )

            # Estimated vocab start frequency band from avg CEFR
            vocab_band = self._cefr_to_frequency_band(
                self._avg_cefr_level(cluster_users)
            )

            # Average forgetting steepness
            steepness_vals = [
                u.get("forgetting_steepness", 0.0)
                for u in cluster_users
                if u.get("forgetting_steepness") is not None
            ]
            avg_steepness = float(np.mean(steepness_vals)) if steepness_vals else 0.0

            profiles[cluster_id] = {
                "cluster_id": cluster_id,
                "size": int(mask.sum()),
                "recommended_module_weights": module_weights,
                "default_complexity_level": default_complexity,
                "recommended_path": module_sequence,
                "estimated_vocab_start": vocab_band,
                "avg_forgetting_steepness": round(avg_steepness, 4),
                "avg_session_length_min": round(float(np.mean([
                    (u.get("avg_session_length_ms", 0) or 0) / 60_000.0
                    for u in cluster_users
                ])), 1),
                "dominant_goals": self._dominant_goals(cluster_users),
            }

        return profiles

    @staticmethod
    def _avg_module_distribution(
        users: list[dict[str, Any]],
    ) -> dict[str, float]:
        """Average the module distribution across users in a cluster."""
        all_mods: dict[str, list[float]] = {}
        for u in users:
            dist = u.get("module_distribution") or {}
            if isinstance(dist, str):
                dist = json.loads(dist)
            for mod, frac in dist.items():
                all_mods.setdefault(mod, []).append(float(frac))

        # Compute mean per module, normalise to sum to 1
        result: dict[str, float] = {}
        for mod in settings.clustering.module_sources:
            vals = all_mods.get(mod, [0.0])
            result[mod] = float(np.mean(vals))

        total = sum(result.values())
        if total > 0:
            result = {k: round(v / total, 4) for k, v in result.items()}

        return result

    @staticmethod
    def _cefr_to_complexity(cefr: str) -> float:
        """Map CEFR level to a 1–5 complexity scale."""
        mapping = {"A0": 1, "A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 5}
        return mapping.get(cefr, 2)

    @staticmethod
    def _avg_cefr_level(users: list[dict[str, Any]]) -> str:
        """Find the median CEFR level in a cluster."""
        levels = sorted(settings.clustering.cefr_levels)
        ordinals = [
            levels.index(u.get("proficiency_level", "A1"))
            if u.get("proficiency_level", "A1") in levels
            else 1
            for u in users
        ]
        median_idx = int(np.median(ordinals))
        return levels[min(median_idx, len(levels) - 1)]

    @staticmethod
    def _cefr_to_frequency_band(cefr: str) -> str:
        """Map CEFR level to estimated starting vocabulary frequency band."""
        bands = {
            "A0": "top_500",
            "A1": "top_500",
            "A2": "top_1000",
            "B1": "top_2000",
            "B2": "top_3000",
            "C1": "top_5000",
            "C2": "top_8000",
        }
        return bands.get(cefr, "top_1000")

    @staticmethod
    def _dominant_goals(users: list[dict[str, Any]]) -> list[str]:
        """Find the most common goals in a cluster."""
        goal_counts: dict[str, int] = {}
        for u in users:
            goals = u.get("goals") or []
            if isinstance(goals, str):
                goals = [goals]
            for g in goals:
                goal_counts[g] = goal_counts.get(g, 0) + 1

        if not goal_counts:
            return ["conversational"]

        # Return goals that appear in > 25% of users
        threshold = len(users) * 0.25
        dominant = [g for g, c in goal_counts.items() if c >= threshold]
        return dominant or [max(goal_counts, key=goal_counts.get)]  # type: ignore[arg-type]

    # ── Assignment ──────────────────────────────────────────────────────

    def assign(
        self,
        native_language: str,
        target_language: str,
        cefr_level: str,
        goals: list[str],
    ) -> dict[str, Any]:
        """
        Assign a new user to the nearest cluster centroid using signup
        features only.

        Returns cluster profile with recommendations.
        """
        if not self._is_loaded:
            raise RuntimeError("Model not loaded. Call load() or train() first.")

        assert self._kmeans is not None
        assert self._scaler is not None

        # Build partial feature vector
        vec = extract_signup_features(
            native_language=native_language,
            target_language=target_language,
            cefr_level=cefr_level,
            goals=goals,
            feature_columns=self._feature_columns,
        )

        # Scale and predict
        vec_scaled = self._scaler.transform(vec.reshape(1, -1))
        cluster_id = int(self._kmeans.predict(vec_scaled)[0])

        # Compute distance to centroid (for confidence)
        centroid = self._kmeans.cluster_centers_[cluster_id]
        distance = float(np.linalg.norm(vec_scaled[0] - centroid))

        # Convert distance to confidence (exponential decay)
        # Closer to centroid = higher confidence
        confidence = float(math.exp(-0.1 * distance))

        profile = self._cluster_profiles.get(cluster_id, {})

        return {
            "cluster_id": cluster_id,
            "recommended_path": profile.get("recommended_path", list(settings.clustering.module_sources[:4])),
            "default_complexity_level": profile.get("default_complexity_level", self._cefr_to_complexity(cefr_level)),
            "estimated_vocab_start": profile.get("estimated_vocab_start", self._cefr_to_frequency_band(cefr_level)),
            "recommended_module_weights": profile.get("recommended_module_weights", {}),
            "confidence": round(confidence, 4),
            "cluster_size": profile.get("size", 0),
            "avg_forgetting_steepness": profile.get("avg_forgetting_steepness", 0.0),
        }

    # ── Persistence ─────────────────────────────────────────────────────

    def save(self) -> None:
        """Persist model, scaler, profiles, and feature columns to disk."""
        paths = settings.paths

        if self._kmeans is not None:
            joblib.dump(self._kmeans, paths.kmeans_model_path)
            logger.info(f"Saved K-Means model to {paths.kmeans_model_path}")

        if self._scaler is not None:
            joblib.dump(self._scaler, paths.scaler_path)
            logger.info(f"Saved scaler to {paths.scaler_path}")

        if self._cluster_profiles:
            # Ensure all keys are strings for JSON serialisation
            serialisable = {
                str(k): v for k, v in self._cluster_profiles.items()
            }
            paths.cluster_profiles_path.write_text(
                json.dumps(serialisable, indent=2)
            )
            logger.info(f"Saved {len(serialisable)} cluster profiles")

        if self._feature_columns:
            save_feature_columns(self._feature_columns, paths.feature_columns_path)

    def load(self) -> None:
        """Load model, scaler, profiles, and feature columns from disk."""
        paths = settings.paths

        if not paths.kmeans_model_path.exists():
            raise FileNotFoundError(
                f"K-Means model not found at {paths.kmeans_model_path}. "
                "Train the model first via POST /ml/coldstart/train."
            )

        self._kmeans = joblib.load(paths.kmeans_model_path)
        logger.info(f"Loaded K-Means model from {paths.kmeans_model_path}")

        self._scaler = joblib.load(paths.scaler_path)
        logger.info(f"Loaded scaler from {paths.scaler_path}")

        raw = json.loads(paths.cluster_profiles_path.read_text())
        self._cluster_profiles = {int(k): v for k, v in raw.items()}
        logger.info(f"Loaded {len(self._cluster_profiles)} cluster profiles")

        self._feature_columns = load_feature_columns(paths.feature_columns_path)
        logger.info(f"Loaded {len(self._feature_columns)} feature columns")

        self._is_loaded = True


# ── Heuristic fallback (no trained model) ───────────────────────────────

def heuristic_assignment(
    cefr_level: str,
    goals: list[str],
) -> dict:
    """
    CEFR-based heuristic when no trained model is available.
    Provides reasonable defaults based on declared proficiency and goals.
    """
    complexity = int(LearnerClusterModel._cefr_to_complexity(cefr_level))
    vocab_band = LearnerClusterModel._cefr_to_frequency_band(cefr_level)

    # Goal-based module ordering
    goal_module_map = {
        "conversational": ["conversation", "listening", "story", "flashcard"],
        "formal": ["grammar_drill", "sentence_build", "story", "flashcard"],
        "travel": ["conversation", "pronunciation", "flashcard", "listening"],
        "business": ["grammar_drill", "sentence_build", "conversation", "story"],
    }

    # Merge module sequences from all goals, preserving order
    seen: set[str] = set()
    path: list[str] = []
    for goal in goals:
        for mod in goal_module_map.get(goal, []):
            if mod not in seen:
                seen.add(mod)
                path.append(mod)

    # Add remaining modules
    for mod in settings.clustering.module_sources:
        if mod not in seen:
            path.append(mod)

    return {
        "cluster_id": -1,  # Sentinel: no cluster assigned
        "recommended_path": path,
        "default_complexity_level": complexity,
        "estimated_vocab_start": vocab_band,
        "recommended_module_weights": {},
        "confidence": 0.0,
    }


# Singleton
cluster_model = LearnerClusterModel()
