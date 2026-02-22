"""
CLI entry-point to start the Complexity Level Predictor server.

Usage:
    python -m ml.complexity_predictor.scripts.serve
    python -m ml.complexity_predictor.scripts.serve --port 8400
"""

from __future__ import annotations

import argparse

import uvicorn

from ..config import settings


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the Complexity Level Predictor API"
    )
    parser.add_argument("--host", default=settings.server.host)
    parser.add_argument("--port", type=int, default=settings.server.port)
    parser.add_argument("--workers", type=int, default=settings.server.workers)
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload (dev)")
    args = parser.parse_args()

    uvicorn.run(
        "ml.complexity_predictor.api.app:app",
        host=args.host,
        port=args.port,
        workers=args.workers,
        reload=args.reload,
        log_level="info",
    )


if __name__ == "__main__":
    main()
