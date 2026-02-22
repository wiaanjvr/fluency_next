"""
Supabase data-access layer for the Cold Start Collaborative Filtering service.

Uses the service-role key (bypasses RLS) for server-to-server access.
"""

from __future__ import annotations

import math
from typing import Any

from loguru import logger
from supabase import Client, create_client

from ..config import settings

_client: Client | None = None


def get_client() -> Client:
    """Lazily initialise and return the Supabase admin client."""
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
        logger.info("Supabase admin client initialised (cold_start)")
    return _client


# ── Mature user data for training ───────────────────────────────────────────


def fetch_mature_users(min_events: int = 500) -> list[dict[str, Any]]:
    """
    Fetch users with >= min_events interaction events, along with their
    profile data and aggregated features.

    Calls the get_cold_start_training_data SQL function.
    """
    client = get_client()
    resp = client.rpc(
        "get_cold_start_training_data",
        {"p_min_events": min_events},
    ).execute()

    rows = resp.data or []
    logger.info(f"Fetched {len(rows)} mature users for clustering (min_events={min_events})")
    return rows


def fetch_user_event_count(user_id: str) -> int:
    """Get the total interaction event count for a user."""
    client = get_client()
    resp = (
        client.table("interaction_events")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    return resp.count or 0


def fetch_user_profile(user_id: str) -> dict[str, Any] | None:
    """Fetch a user's profile for cold start assignment."""
    client = get_client()
    resp = (
        client.table("profiles")
        .select("id, native_language, target_language, proficiency_level")
        .eq("id", user_id)
        .single()
        .execute()
    )
    return resp.data


def fetch_user_goals(user_id: str) -> list[str]:
    """Fetch the learning goals for a user from learner_clusters table."""
    client = get_client()
    resp = (
        client.table("user_learning_goals")
        .select("goal")
        .eq("user_id", user_id)
        .execute()
    )
    if resp.data:
        return [row["goal"] for row in resp.data]
    return []


# ── Cluster assignment persistence ──────────────────────────────────────────


def save_cluster_assignment(
    user_id: str,
    cluster_id: int,
    recommended_path: list[str],
    default_complexity_level: int,
    estimated_vocab_start: str,
    confidence: float,
    assignment_features: dict[str, Any],
) -> str | None:
    """
    Persist a cold start cluster assignment.
    Returns the assignment ID.
    """
    client = get_client()
    resp = (
        client.table("cold_start_assignments")
        .insert({
            "user_id": user_id,
            "cluster_id": cluster_id,
            "recommended_path": recommended_path,
            "default_complexity_level": default_complexity_level,
            "estimated_vocab_start": estimated_vocab_start,
            "confidence": round(confidence, 4),
            "assignment_features": assignment_features,
        })
        .execute()
    )
    if resp.data:
        assignment_id = resp.data[0]["id"]
        logger.info(f"Saved cluster assignment {assignment_id} for user {user_id}")
        return assignment_id
    return None


def get_user_active_assignment(user_id: str) -> dict[str, Any] | None:
    """Get the latest active (not yet graduated) cluster assignment for a user."""
    client = get_client()
    resp = (
        client.table("cold_start_assignments")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if resp.data:
        return resp.data[0]
    return None


def deactivate_assignment(user_id: str) -> None:
    """Mark all assignments for a user as inactive (graduated to personal model)."""
    client = get_client()
    client.table("cold_start_assignments").update(
        {"is_active": False}
    ).eq("user_id", user_id).execute()
    logger.info(f"Deactivated cold start assignments for user {user_id}")


# ── Cluster profiles persistence ────────────────────────────────────────────


def save_cluster_profiles(profiles: list[dict[str, Any]]) -> None:
    """
    Upsert cluster profiles into the database.
    Each profile represents one centroid with its recommended settings.
    """
    client = get_client()
    for profile in profiles:
        client.table("learner_cluster_profiles").upsert(
            profile,
            on_conflict="cluster_id",
        ).execute()
    logger.info(f"Saved {len(profiles)} cluster profiles")


def fetch_cluster_profiles() -> list[dict[str, Any]]:
    """Fetch all cluster profiles from the database."""
    client = get_client()
    resp = (
        client.table("learner_cluster_profiles")
        .select("*")
        .order("cluster_id")
        .execute()
    )
    return resp.data or []
