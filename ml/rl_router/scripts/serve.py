"""
Entry-point script for the RL Module Router service.

Usage:
    python -m ml.rl_router.scripts.serve
    python -m ml.rl_router.scripts.serve --host 0.0.0.0 --port 8800
"""

from __future__ import annotations

import argparse

import uvicorn

from ..config import settings


def main() -> None:
    parser = argparse.ArgumentParser(description="RL Module Router Server")
    parser.add_argument(
        "--host",
        default=settings.server.host,
        help=f"Host to bind to (default: {settings.server.host})",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=settings.server.port,
        help=f"Port to bind to (default: {settings.server.port})",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=settings.server.workers,
        help=f"Number of workers (default: {settings.server.workers})",
    )
    args = parser.parse_args()

    uvicorn.run(
        "ml.rl_router.api.app:app",
        host=args.host,
        port=args.port,
        workers=args.workers,
        log_level="info",
    )


if __name__ == "__main__":
    main()
