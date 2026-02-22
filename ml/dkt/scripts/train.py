"""
CLI entry point: train the DKT model.

Usage:
    python -m ml.dkt.scripts.train [--mode full|finetune] [--days 1]
"""

from __future__ import annotations

import argparse
import sys

from loguru import logger


def main() -> None:
    parser = argparse.ArgumentParser(description="Train or fine-tune the DKT model")
    parser.add_argument(
        "--mode",
        choices=["full", "finetune"],
        default="full",
        help="'full' for weekly retrain, 'finetune' for incremental (default: full)",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=1,
        help="Number of days of recent data for fine-tuning (default: 1)",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=None,
        help="Override max epochs",
    )
    parser.add_argument(
        "--lr",
        type=float,
        default=None,
        help="Override learning rate",
    )
    args = parser.parse_args()

    logger.info(f"DKT training — mode={args.mode}, days={args.days}")

    from ..training.trainer import finetune_dkt, train_dkt

    if args.mode == "finetune":
        result = finetune_dkt(days=args.days)
    else:
        result = train_dkt(max_epochs=args.epochs, learning_rate=args.lr)

    logger.info(f"Training result: {result}")

    if result.get("status") == "no_data":
        logger.error("No training data found. Ensure interaction_events has data.")
        sys.exit(1)


if __name__ == "__main__":
    main()
