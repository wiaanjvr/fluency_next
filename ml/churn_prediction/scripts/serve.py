"""
CLI entry-point to start the Churn Prediction & Engagement Rescue server.

Usage:
    python -m ml.churn_prediction.scripts.serve
    python -m ml.churn_prediction.scripts.serve --port 8700
"""

from __future__ import annotations

import argparse

import uvicorn

from ..config import settings


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the Churn Prediction & Engagement Rescue API"
    )
    parser.add_argument("--host", default=settings.server.host)
    parser.add_argument("--port", type=int, default=settings.server.port)
    parser.add_argument("--workers", type=int, default=settings.server.workers)
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload (dev)")
    args = parser.parse_args()

    uvicorn.run(
        "ml.churn_prediction.api.app:app",
        host=args.host,
        port=args.port,
        workers=args.workers,
        reload=args.reload,
        log_level="info",
    )


if __name__ == "__main__":
    main()
