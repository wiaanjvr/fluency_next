"""
Training pipeline for the Churn Prediction models.

Fetches labelled data from Supabase via SQL functions, trains both
the pre-session and mid-session classifiers, and persists artifacts.
"""

from __future__ import annotations

import time
from typing import Any

from loguru import logger

from ..config import settings
from ..data.supabase_client import (
    fetch_mid_session_training_data,
    fetch_pre_session_training_data,
)
from ..model.mid_session import mid_session_model
from ..model.pre_session import pre_session_model


def train_churn_models(
    train_pre_session: bool = True,
    train_mid_session: bool = True,
) -> dict[str, Any]:
    """
    End-to-end training pipeline for churn prediction models.

    1. Fetch labelled data from Supabase
    2. Train classifier(s)
    3. Save model artifacts to disk

    Returns training metadata for each model.
    """
    t0 = time.time()
    result: dict[str, Any] = {"status": "ok"}

    # ── Pre-session model ───────────────────────────────────────────────
    if train_pre_session:
        logger.info("Training pre-session churn model...")
        try:
            rows = fetch_pre_session_training_data(
                lookback_days=settings.pre_session.lookback_days
            )

            if len(rows) < settings.pre_session.min_training_samples:
                logger.warning(
                    f"Insufficient pre-session data: {len(rows)} < "
                    f"{settings.pre_session.min_training_samples}. Skipping."
                )
                result["pre_session"] = {
                    "status": "insufficient_data",
                    "n_samples": len(rows),
                    "min_required": settings.pre_session.min_training_samples,
                }
            else:
                train_result = pre_session_model.train(rows)
                pre_session_model.save()
                result["pre_session"] = train_result
                logger.info(
                    f"Pre-session model trained: {train_result['n_samples']} samples, "
                    f"accuracy={train_result['train_accuracy']:.3f}"
                )
        except Exception as exc:
            logger.exception(f"Pre-session training failed: {exc}")
            result["pre_session"] = {"status": "error", "error": str(exc)}

    # ── Mid-session model ───────────────────────────────────────────────
    if train_mid_session:
        logger.info("Training mid-session abandonment model...")
        try:
            rows = fetch_mid_session_training_data(
                min_session_words=settings.mid_session.min_session_words
            )

            if len(rows) < settings.mid_session.min_training_samples:
                logger.warning(
                    f"Insufficient mid-session data: {len(rows)} < "
                    f"{settings.mid_session.min_training_samples}. Skipping."
                )
                result["mid_session"] = {
                    "status": "insufficient_data",
                    "n_samples": len(rows),
                    "min_required": settings.mid_session.min_training_samples,
                }
            else:
                train_result = mid_session_model.train(rows)
                mid_session_model.save()
                result["mid_session"] = train_result
                logger.info(
                    f"Mid-session model trained: {train_result['n_samples']} samples, "
                    f"accuracy={train_result['train_accuracy']:.3f}"
                )
        except Exception as exc:
            logger.exception(f"Mid-session training failed: {exc}")
            result["mid_session"] = {"status": "error", "error": str(exc)}

    elapsed = time.time() - t0
    result["training_time_seconds"] = round(elapsed, 2)

    logger.info(f"Churn model training complete in {elapsed:.1f}s")
    return result
