"""
CLI entry-point to train the Complexity Level Predictor.

Usage:
    python -m ml.complexity_predictor.scripts.train
"""

from __future__ import annotations

import sys

from loguru import logger


def main() -> None:
    logger.info("Complexity Level Predictor — training")

    from ..training.trainer import train_complexity_predictor

    result = train_complexity_predictor()

    logger.info(f"Training result: {result}")

    if result.get("status") in ("insufficient_data", "insufficient_valid_data"):
        logger.error("Not enough training data. Ensure session_summaries has data.")
        sys.exit(1)


if __name__ == "__main__":
    main()
