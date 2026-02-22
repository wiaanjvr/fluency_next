"""
CLI entry-point to start the Cognitive Load Estimator server.

Usage:
    python -m ml.cognitive_load.scripts.serve
    python -m ml.cognitive_load.scripts.serve --port 8200
"""

from __future__ import annotations

import argparse

import uvicorn

from ..config import settings


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Cognitive Load Estimator API")
    parser.add_argument("--host", default=settings.server.host)
    parser.add_argument("--port", type=int, default=settings.server.port)
    parser.add_argument("--workers", type=int, default=settings.server.workers)
    args = parser.parse_args()

    uvicorn.run(
        "ml.cognitive_load.api.app:app",
        host=args.host,
        port=args.port,
        workers=args.workers,
        log_level="info",
    )


if __name__ == "__main__":
    main()
