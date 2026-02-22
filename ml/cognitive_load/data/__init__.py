"""
Supabase client for the Cognitive Load Estimator.

Uses the service-role key for server-to-server access (bypasses RLS).
"""

from __future__ import annotations

from supabase import create_client, Client
from loguru import logger

from ..config import settings


_client: Client | None = None


def get_supabase() -> Client:
    """Return a singleton Supabase client."""
    global _client
    if _client is None:
        url = settings.supabase.url
        key = settings.supabase.service_role_key
        if not url or not key:
            raise RuntimeError(
                "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. "
                "Check your .env / .env.local files."
            )
        _client = create_client(url, key)
        logger.info("Supabase client initialised (service-role)")
    return _client
