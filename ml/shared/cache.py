"""
ml.shared.cache — Redis-backed per-user prediction cache.

All ML prediction endpoints cache results for 1 hour keyed by
  ml:pred:<service>:<endpoint>:<user_id>[:<extra_key>]

Usage
-----
from ml.shared.cache import prediction_cache

# Check cache
cached = prediction_cache.get(service="churn", endpoint="pre-session-risk", user_id=user_id)
if cached is not None:
    return cached

# … compute prediction …

# Store result
prediction_cache.set(service="churn", endpoint="pre-session-risk",
                     user_id=user_id, value=result)

# Invalidate all cache keys for a user (GDPR deletion)
prediction_cache.invalidate_user(user_id)
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from loguru import logger

# Walk up to lingua_2.0 .env files
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_PROJECT_ROOT / ".env.local")
load_dotenv(_PROJECT_ROOT / ".env")

# Cache TTL defaults
_DEFAULT_TTL_SECONDS = int(os.getenv("ML_CACHE_TTL_SECONDS", "3600"))  # 1 hour
_REDIS_URL = os.getenv("ML_REDIS_URL", os.getenv("REDIS_URL", "redis://localhost:6379/0"))


class PredictionCache:
    """Thread-safe Redis prediction cache with graceful degradation.
    
    If Redis is unavailable the cache is a no-op — predictions flow through
    normally so the ML services keep working.
    """

    def __init__(self) -> None:
        self._client: Any | None = None
        self._enabled = True
        self._redis_url = _REDIS_URL

    # ── Lazy connection ─────────────────────────────────────────────────

    def _get_client(self) -> Any | None:
        if not self._enabled:
            return None
        if self._client is not None:
            return self._client
        try:
            import redis  # type: ignore[import-untyped]

            self._client = redis.from_url(
                self._redis_url,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
                retry_on_timeout=False,
            )
            # Validate connection
            self._client.ping()
            logger.info(f"ML prediction cache connected to Redis at {self._redis_url}")
        except Exception as exc:
            logger.warning(
                f"ML prediction cache: Redis unavailable ({exc}). "
                "Cache disabled — predictions will not be cached."
            )
            self._enabled = False
            self._client = None
        return self._client

    # ── Key construction ────────────────────────────────────────────────

    @staticmethod
    def _key(service: str, endpoint: str, user_id: str, extra: str = "") -> str:
        """Build a Redis key.

        Pattern: ml:pred:<service>:<endpoint>:<user_id>[:<extra>]
        """
        base = f"ml:pred:{service}:{endpoint}:{user_id}"
        return f"{base}:{extra}" if extra else base

    @staticmethod
    def _scan_pattern(user_id: str) -> str:
        """Glob pattern to find all cache keys for a user."""
        return f"ml:pred:*:*:{user_id}*"

    # ── Public API ──────────────────────────────────────────────────────

    def get(
        self,
        service: str,
        endpoint: str,
        user_id: str,
        extra: str = "",
    ) -> dict[str, Any] | None:
        """Return cached prediction dict or *None* on miss / disabled Redis."""
        client = self._get_client()
        if client is None:
            return None
        key = self._key(service, endpoint, user_id, extra)
        try:
            raw = client.get(key)
            if raw is None:
                return None
            data: dict[str, Any] = json.loads(raw)
            logger.debug(f"Cache HIT  {key}")
            return data
        except Exception as exc:
            logger.warning(f"Cache GET error for {key}: {exc}")
            return None

    def set(
        self,
        service: str,
        endpoint: str,
        user_id: str,
        value: dict[str, Any],
        extra: str = "",
        ttl: int = _DEFAULT_TTL_SECONDS,
    ) -> None:
        """Store *value* in cache, silently failing if Redis is down."""
        client = self._get_client()
        if client is None:
            return
        key = self._key(service, endpoint, user_id, extra)
        try:
            client.setex(key, ttl, json.dumps(value, default=str))
            logger.debug(f"Cache SET  {key} (ttl={ttl}s)")
        except Exception as exc:
            logger.warning(f"Cache SET error for {key}: {exc}")

    def invalidate(
        self,
        service: str,
        endpoint: str,
        user_id: str,
        extra: str = "",
    ) -> None:
        """Delete a single cache entry."""
        client = self._get_client()
        if client is None:
            return
        key = self._key(service, endpoint, user_id, extra)
        try:
            client.delete(key)
            logger.debug(f"Cache DEL  {key}")
        except Exception as exc:
            logger.warning(f"Cache DEL error for {key}: {exc}")

    def invalidate_user(self, user_id: str) -> int:
        """Delete ALL cache keys for *user_id* (GDPR right to erasure).
        
        Returns the number of keys deleted.
        """
        client = self._get_client()
        if client is None:
            return 0
        pattern = self._scan_pattern(user_id)
        deleted = 0
        try:
            cursor = 0
            while True:
                cursor, keys = client.scan(cursor=cursor, match=pattern, count=100)
                if keys:
                    client.delete(*keys)
                    deleted += len(keys)
                if cursor == 0:
                    break
            logger.info(
                f"Cache GDPR purge for user {user_id[:8]}…: "
                f"deleted {deleted} key(s)"
            )
        except Exception as exc:
            logger.warning(f"Cache GDPR purge error for user {user_id}: {exc}")
        return deleted

    def health(self) -> dict[str, Any]:
        """Return cache health status for health-check endpoints."""
        client = self._get_client()
        if client is None:
            return {"redis_connected": False, "redis_url": self._redis_url}
        try:
            client.ping()
            info = client.info("server")
            return {
                "redis_connected": True,
                "redis_url": self._redis_url,
                "redis_version": info.get("redis_version"),
            }
        except Exception as exc:
            return {"redis_connected": False, "error": str(exc)}


# Singleton used across all ML services in-process
prediction_cache = PredictionCache()
