"""
CLI entry-point to trigger a cold start model training run.

Usage:
    python -m ml.cold_start.scripts.train
    python -m ml.cold_start.scripts.train --min-events 300
"""

from __future__ import annotations

import argparse
import json

from loguru import logger

from ..training.trainer import train_cold_start_model


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train the Cold Start K-Means clustering model"
    )
    parser.add_argument(
        "--min-events",
        type=int,
        default=None,
        help="Minimum events to qualify as a mature user (default: from config)",
    )
    args = parser.parse_args()

    result = train_cold_start_model(min_events=args.min_events)
    logger.info(f"Training result:\n{json.dumps(result, indent=2)}")


if __name__ == "__main__":
    main()
