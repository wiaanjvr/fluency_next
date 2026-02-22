"""
CLI entry point: serve the DKT REST API.

Usage:
    python -m ml.dkt.scripts.serve [--host 0.0.0.0] [--port 8100]
"""

from __future__ import annotations

import argparse

import uvicorn

from ..config import settings


def main() -> None:
    parser = argparse.ArgumentParser(description="Start the DKT REST API server")
    parser.add_argument("--host", default=settings.server.host)
    parser.add_argument("--port", type=int, default=settings.server.port)
    parser.add_argument("--workers", type=int, default=settings.server.workers)
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload (dev)")
    args = parser.parse_args()

    uvicorn.run(
        "ml.dkt.api.app:app",
        host=args.host,
        port=args.port,
        workers=args.workers,
        reload=args.reload,
        log_level="info",
    )


if __name__ == "__main__":
    main()
