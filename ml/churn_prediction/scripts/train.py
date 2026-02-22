"""
CLI entry-point to trigger churn model training.

Usage:
    python -m ml.churn_prediction.scripts.train
    python -m ml.churn_prediction.scripts.train --model pre_session
    python -m ml.churn_prediction.scripts.train --model mid_session
"""

from __future__ import annotations

import argparse
import json

from loguru import logger

from ..training.trainer import train_churn_models


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train the Churn Prediction classifiers"
    )
    parser.add_argument(
        "--model",
        type=str,
        default="both",
        choices=["both", "pre_session", "mid_session"],
        help="Which model to train (default: both)",
    )
    args = parser.parse_args()

    result = train_churn_models(
        train_pre_session=(args.model in ("both", "pre_session")),
        train_mid_session=(args.model in ("both", "mid_session")),
    )
    logger.info(f"Training result:\n{json.dumps(result, indent=2)}")


if __name__ == "__main__":
    main()
