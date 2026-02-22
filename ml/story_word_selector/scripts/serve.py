"""
CLI entry point: serve the Story Word Selector REST API.

Usage:
    python -m ml.story_word_selector.scripts.serve [--host 0.0.0.0] [--port 8300]
"""

from __future__ import annotations

import argparse

import uvicorn

from ..config import settings


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Start the Story Word Selector REST API server"
    )
    parser.add_argument("--host", default=settings.server.host)
    parser.add_argument("--port", type=int, default=settings.server.port)
    parser.add_argument("--workers", type=int, default=settings.server.workers)
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload (dev)")
    args = parser.parse_args()

    uvicorn.run(
        "ml.story_word_selector.api.app:app",
        host=args.host,
        port=args.port,
        workers=args.workers,
        reload=args.reload,
        log_level="info",
    )


if __name__ == "__main__":
    main()
