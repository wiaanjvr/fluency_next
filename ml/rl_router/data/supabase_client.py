"""
Supabase data-access layer for the RL Module Router.

Fetches user state vectors, session history, vocabulary scores, grammar
mastery, and DKT knowledge states. Also persists routing decisions and
reward observations for training.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
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
        logger.info("Supabase admin client initialised (rl_router)")
    return _client


# ── State assembly queries ──────────────────────────────────────────────────


def fetch_user_event_count(user_id: str) -> int:
    """Count total interaction events for a user."""
    client = get_client()
    resp = (
        client.table("interaction_events")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    return resp.count or 0


def fetch_last_n_modules(user_id: str, n: int = 3) -> list[str]:
    """
    Return the last N distinct module_sources used by the user,
    ordered most-recent first.
    """
    client = get_client()
    resp = (
        client.table("session_summaries")
        .select("module_source")
        .eq("user_id", user_id)
        .order("started_at", desc=True)
        .limit(n)
        .execute()
    )
    return [row["module_source"] for row in (resp.data or [])]


def fetch_vocabulary_scores(user_id: str) -> dict[str, Any]:
    """
    Fetch aggregated vocabulary scores for the user:
    - average production_score
    - average pronunciation_score
    - words with low production/pronunciation scores
    """
    client = get_client()
    resp = (
        client.table("user_words")
        .select(
            "word_id, production_score, pronunciation_score, "
            "next_review, status, tags"
        )
        .eq("user_id", user_id)
        .execute()
    )

    rows = resp.data or []
    if not rows:
        return {
            "avg_production_score": 0.5,
            "avg_pronunciation_score": 0.5,
            "low_production_words": [],
            "low_pronunciation_words": [],
            "due_word_count": 0,
            "total_words": 0,
        }

    now = datetime.now(timezone.utc)
    production_scores = []
    pronunciation_scores = []
    low_production: list[str] = []
    low_pronunciation: list[str] = []
    due_count = 0

    for row in rows:
        prod = (row.get("production_score") or 0) / 100.0  # stored 0-100
        pron = (row.get("pronunciation_score") or 0) / 100.0
        production_scores.append(prod)
        pronunciation_scores.append(pron)

        if prod < 0.4:
            low_production.append(row["word_id"])
        if pron < 0.3:
            low_pronunciation.append(row["word_id"])

        # Check if word is due for review
        next_review = row.get("next_review")
        if next_review:
            try:
                nr = datetime.fromisoformat(next_review.replace("Z", "+00:00"))
                if nr <= now:
                    due_count += 1
            except (ValueError, TypeError):
                pass

    avg_prod = sum(production_scores) / len(production_scores) if production_scores else 0.5
    avg_pron = sum(pronunciation_scores) / len(pronunciation_scores) if pronunciation_scores else 0.5

    return {
        "avg_production_score": round(avg_prod, 4),
        "avg_pronunciation_score": round(avg_pron, 4),
        "low_production_words": low_production[:20],  # cap for payload size
        "low_pronunciation_words": low_pronunciation[:20],
        "due_word_count": due_count,
        "total_words": len(rows),
    }


def fetch_grammar_mastery(user_id: str) -> dict[str, Any]:
    """
    Fetch grammar concept mastery scores from user_lesson_completions
    and user_exercise_attempts. Returns the weakest concept.
    """
    client = get_client()

    # Aggregate exercise attempts per grammar subtopic
    resp = client.rpc(
        "get_grammar_mastery_summary",
        {"p_user_id": user_id},
    ).execute()

    rows = resp.data or []
    if not rows:
        # Fallback: try to get from DKT concept mastery
        return {
            "weakest_concept_tag": None,
            "weakest_concept_score": 1.0,
            "concept_scores": {},
        }

    concept_scores: dict[str, float] = {}
    weakest_tag: str | None = None
    weakest_score = 1.0

    for row in rows:
        tag = row.get("concept_tag") or row.get("grammar_tag", "unknown")
        score = float(row.get("mastery_score", 0.5))
        concept_scores[tag] = score
        if score < weakest_score:
            weakest_score = score
            weakest_tag = tag

    return {
        "weakest_concept_tag": weakest_tag,
        "weakest_concept_score": round(weakest_score, 4),
        "concept_scores": concept_scores,
    }


def fetch_cognitive_load_last_session(user_id: str) -> float:
    """Get the estimated cognitive load from the user's last session."""
    client = get_client()
    resp = (
        client.table("session_summaries")
        .select("estimated_cognitive_load")
        .eq("user_id", user_id)
        .order("started_at", desc=True)
        .limit(1)
        .execute()
    )
    if resp.data:
        return float(resp.data[0].get("estimated_cognitive_load") or 0.5)
    return 0.5


def fetch_days_since_last_session(user_id: str) -> float:
    """Compute days since the user's last session."""
    client = get_client()
    resp = (
        client.table("session_summaries")
        .select("started_at")
        .eq("user_id", user_id)
        .order("started_at", desc=True)
        .limit(1)
        .execute()
    )
    if not resp.data:
        return 30.0  # no history, treat as very lapsed

    now = datetime.now(timezone.utc)
    last_started = datetime.fromisoformat(
        resp.data[0]["started_at"].replace("Z", "+00:00")
    )
    return round((now - last_started).total_seconds() / 86400.0, 2)


def fetch_historical_session_length(user_id: str) -> float:
    """
    Infer available session time from the user's historical session
    lengths at the current time of day. Returns estimated minutes.
    """
    client = get_client()
    now = datetime.now(timezone.utc)
    hour = now.hour

    # Map to time_of_day bucket
    if 5 <= hour < 12:
        time_bucket = "morning"
    elif 12 <= hour < 17:
        time_bucket = "afternoon"
    elif 17 <= hour < 21:
        time_bucket = "evening"
    else:
        time_bucket = "night"

    # Get recent sessions from the same time bucket
    two_months_ago = (now - timedelta(days=60)).isoformat()

    resp = (
        client.table("session_summaries")
        .select("session_duration_ms, started_at")
        .eq("user_id", user_id)
        .gte("started_at", two_months_ago)
        .not_.is_("session_duration_ms", "null")
        .order("started_at", desc=True)
        .limit(20)
        .execute()
    )

    rows = resp.data or []
    if not rows:
        return settings.router.default_session_minutes

    # Filter to matching time bucket
    matching = []
    for row in rows:
        try:
            dt = datetime.fromisoformat(row["started_at"].replace("Z", "+00:00"))
            h = dt.hour
            if time_bucket == "morning" and 5 <= h < 12:
                matching.append(row["session_duration_ms"])
            elif time_bucket == "afternoon" and 12 <= h < 17:
                matching.append(row["session_duration_ms"])
            elif time_bucket == "evening" and 17 <= h < 21:
                matching.append(row["session_duration_ms"])
            elif time_bucket == "night" and (h >= 21 or h < 5):
                matching.append(row["session_duration_ms"])
        except (ValueError, TypeError):
            continue

    if not matching:
        # Fall back to all sessions
        matching = [r["session_duration_ms"] for r in rows if r.get("session_duration_ms")]

    if not matching:
        return settings.router.default_session_minutes

    avg_ms = sum(matching) / len(matching)
    return round(avg_ms / 60_000, 1)  # convert ms → minutes


def fetch_dkt_knowledge_state(user_id: str) -> list[dict[str, float]]:
    """
    Fetch the DKT concept mastery scores for the user.
    Calls the DKT service's knowledge-state endpoint if available,
    otherwise falls back to a SQL-based approximation.
    """
    client = get_client()

    # Try fetching from the DKT cached results table if it exists
    try:
        resp = client.rpc(
            "get_dkt_concept_mastery",
            {"p_user_id": user_id},
        ).execute()
        if resp.data:
            return resp.data
    except Exception:
        pass

    # Fallback: approximate from interaction_events
    thirty_days_ago = (
        datetime.now(timezone.utc) - timedelta(days=30)
    ).isoformat()

    resp = (
        client.table("interaction_events")
        .select("word_id, correct")
        .eq("user_id", user_id)
        .gte("created_at", thirty_days_ago)
        .order("created_at", desc=True)
        .limit(500)
        .execute()
    )

    events = resp.data or []
    if not events:
        return []

    # Aggregate per-word recall
    word_stats: dict[str, dict[str, int]] = {}
    for e in events:
        wid = e.get("word_id")
        if not wid:
            continue
        if wid not in word_stats:
            word_stats[wid] = {"correct": 0, "total": 0}
        word_stats[wid]["total"] += 1
        if e.get("correct"):
            word_stats[wid]["correct"] += 1

    return [
        {
            "word_id": wid,
            "p_recall": round(s["correct"] / s["total"], 4) if s["total"] else 0.5,
        }
        for wid, s in word_stats.items()
    ]


# ── Routing decision persistence ────────────────────────────────────────────


def save_routing_decision(
    user_id: str,
    recommended_module: str,
    target_word_ids: list[str],
    target_concept: str | None,
    reason: str,
    confidence: float,
    state_snapshot: dict[str, Any],
    algorithm_used: str,
) -> str | None:
    """Persist a routing decision to the routing_decisions table."""
    client = get_client()
    try:
        resp = (
            client.table("routing_decisions")
            .insert(
                {
                    "user_id": user_id,
                    "recommended_module": recommended_module,
                    "target_word_ids": target_word_ids,
                    "target_concept": target_concept,
                    "reason": reason,
                    "confidence": confidence,
                    "state_snapshot": state_snapshot,
                    "algorithm_used": algorithm_used,
                }
            )
            .execute()
        )
        if resp.data:
            return resp.data[0].get("id")
    except Exception as exc:
        logger.warning(f"Failed to save routing decision: {exc}")
    return None


def save_reward_observation(
    decision_id: str,
    user_id: str,
    reward: float,
    reward_components: dict[str, float],
) -> str | None:
    """Persist a computed reward for a previous routing decision."""
    client = get_client()
    try:
        resp = (
            client.table("routing_rewards")
            .insert(
                {
                    "decision_id": decision_id,
                    "user_id": user_id,
                    "reward": reward,
                    "reward_components": reward_components,
                }
            )
            .execute()
        )
        if resp.data:
            return resp.data[0].get("id")
    except Exception as exc:
        logger.warning(f"Failed to save reward observation: {exc}")
    return None


def fetch_recent_decisions(
    user_id: str,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """Fetch recent routing decisions for a user (for reward computation)."""
    client = get_client()
    resp = (
        client.table("routing_decisions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return resp.data or []


def fetch_training_data(
    min_rows: int = 1000,
    lookback_days: int = 90,
) -> list[dict[str, Any]]:
    """
    Fetch completed routing decisions with their observed rewards
    for model training. Returns joined decision + reward rows.
    """
    client = get_client()
    cutoff = (
        datetime.now(timezone.utc) - timedelta(days=lookback_days)
    ).isoformat()

    resp = (
        client.table("routing_decisions")
        .select(
            "*, routing_rewards(reward, reward_components)"
        )
        .gte("created_at", cutoff)
        .not_.is_("routing_rewards", "null")
        .order("created_at", desc=False)
        .execute()
    )

    rows = resp.data or []
    logger.info(
        f"Fetched {len(rows)} routing training samples "
        f"(lookback={lookback_days} days, min_rows={min_rows})"
    )
    return rows


def count_total_sessions() -> int:
    """Count total session records across all users (for PPO upgrade check)."""
    client = get_client()
    resp = (
        client.table("session_summaries")
        .select("id", count="exact")
        .execute()
    )
    return resp.count or 0
