"""
Training pipeline for the Cold Start K-Means clustering model.

Fetches mature user data (500+ events) from Supabase, builds the feature
matrix, fits K-Means, and persists the model + cluster profiles.
"""

from __future__ import annotations

import time
from typing import Any

from loguru import logger

from ..config import settings
from ..data.supabase_client import fetch_mature_users, save_cluster_profiles
from ..model.clustering import cluster_model


def train_cold_start_model(
    min_events: int | None = None,
) -> dict[str, Any]:
    """
    End-to-end training pipeline.

    1. Fetch mature users from Supabase
    2. Train K-Means
    3. Save model artifacts
    4. Persist cluster profiles to DB

    Returns training metadata.
    """
    t0 = time.time()

    if min_events is None:
        min_events = settings.clustering.min_events_for_training

    logger.info(f"Starting cold start training pipeline (min_events={min_events})")

    # 1. Fetch data
    user_rows = fetch_mature_users(min_events=min_events)

    if len(user_rows) < settings.clustering.min_users_for_training:
        logger.warning(
            f"Insufficient mature users: {len(user_rows)} < "
            f"{settings.clustering.min_users_for_training}. Skipping training."
        )
        return {
            "status": "insufficient_data",
            "n_users": len(user_rows),
            "min_required": settings.clustering.min_users_for_training,
        }

    # 2. Train
    result = cluster_model.train(user_rows)

    # 3. Save artifacts to disk
    cluster_model.save()

    # 4. Persist cluster profiles to Supabase
    try:
        db_profiles = []
        for cid, profile in cluster_model._cluster_profiles.items():
            db_profiles.append({
                "cluster_id": int(cid),
                "size": profile["size"],
                "recommended_module_weights": profile["recommended_module_weights"],
                "default_complexity_level": profile["default_complexity_level"],
                "recommended_path": profile["recommended_path"],
                "estimated_vocab_start": profile["estimated_vocab_start"],
                "avg_forgetting_steepness": profile["avg_forgetting_steepness"],
                "avg_session_length_min": profile["avg_session_length_min"],
                "dominant_goals": profile["dominant_goals"],
            })
        save_cluster_profiles(db_profiles)
    except Exception as exc:
        logger.warning(f"Failed to persist cluster profiles to DB: {exc}")

    elapsed = time.time() - t0
    result["training_time_seconds"] = round(elapsed, 2)

    logger.info(
        f"Cold start training complete: {result['n_clusters']} clusters, "
        f"{result['n_users']} users, {elapsed:.1f}s"
    )

    return result
