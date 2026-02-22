"""
Reward Calculator for the RL Module Router.

Computes the reward signal for a routing decision by comparing the
user's state before and after following the recommendation.

Reward function:
  +2.0  if p_recall improvement on targeted words (measured at next DKT update)
  +1.5  if productionScore increases on targeted words
  +1.0  if session completed (not abandoned)
  +0.5  if pronunciationScore improves
  -1.0  if session abandoned (cognitiveLoad too high)
  -0.5  if same module recommended 3 times in a row (penalize monotony)
"""

from __future__ import annotations

from typing import Any

from loguru import logger

from ..config import settings


def compute_reward(
    decision: dict[str, Any],
    pre_state: dict[str, Any],
    post_state: dict[str, Any],
    session_completed: bool,
    last_n_modules: list[str],
) -> tuple[float, dict[str, float]]:
    """
    Compute the total reward and component breakdown for a routing decision.

    Args:
        decision: The routing decision record (from routing_decisions table).
        pre_state: State snapshot at the time of recommendation.
        post_state: State snapshot after the user's session.
        session_completed: Whether the user completed the recommended session.
        last_n_modules: The last N modules recommended (including current).

    Returns:
        (total_reward, component_dict) where component_dict has keys
        for each reward signal.
    """
    cfg = settings.reward
    components: dict[str, float] = {}
    total = 0.0

    recommended_module = decision.get("recommended_module", "")
    target_word_ids = decision.get("target_word_ids", [])

    # ── +2.0: p_recall improvement ──────────────────────────────────────
    recall_before = pre_state.get("avg_recall", 0.5)
    recall_after = post_state.get("avg_recall", 0.5)
    if recall_after > recall_before:
        recall_reward = cfg.recall_improvement
        components["recall_improvement"] = recall_reward
        total += recall_reward
    else:
        components["recall_improvement"] = 0.0

    # ── +1.5: production score increase ─────────────────────────────────
    prod_before = pre_state.get("avg_production_score", 0.5)
    prod_after = post_state.get("avg_production_score", 0.5)
    if prod_after > prod_before:
        prod_reward = cfg.production_improvement
        components["production_improvement"] = prod_reward
        total += prod_reward
    else:
        components["production_improvement"] = 0.0

    # ── +1.0: session completed ─────────────────────────────────────────
    if session_completed:
        components["session_completed"] = cfg.session_completed
        total += cfg.session_completed
    else:
        components["session_completed"] = 0.0

    # ── +0.5: pronunciation improvement ─────────────────────────────────
    pron_before = pre_state.get("avg_pronunciation_score", 0.5)
    pron_after = post_state.get("avg_pronunciation_score", 0.5)
    if pron_after > pron_before:
        pron_reward = cfg.pronunciation_improvement
        components["pronunciation_improvement"] = pron_reward
        total += pron_reward
    else:
        components["pronunciation_improvement"] = 0.0

    # ── -1.0: session abandoned ─────────────────────────────────────────
    if not session_completed:
        cog_load = post_state.get("cognitive_load_last_session", 0.5)
        if cog_load > 0.7:
            abandon_penalty = cfg.session_abandoned
            components["session_abandoned"] = abandon_penalty
            total += abandon_penalty
        else:
            components["session_abandoned"] = 0.0
    else:
        components["session_abandoned"] = 0.0

    # ── -0.5: monotony penalty ──────────────────────────────────────────
    window = cfg.monotony_window
    if len(last_n_modules) >= window:
        recent = last_n_modules[-window:]
        if len(set(recent)) == 1 and recent[0] == recommended_module:
            monotony = cfg.monotony_penalty
            components["monotony_penalty"] = monotony
            total += monotony
        else:
            components["monotony_penalty"] = 0.0
    else:
        components["monotony_penalty"] = 0.0

    logger.debug(
        f"Reward computed: total={total:.2f}, components={components}"
    )
    return round(total, 4), components


def compute_reward_from_db(
    decision_id: str,
    user_id: str,
) -> tuple[float, dict[str, float]] | None:
    """
    Compute the reward for a historical routing decision by fetching
    pre/post states from the database.

    Returns None if insufficient data to compute a reward.
    """
    from ..data.supabase_client import (
        fetch_last_n_modules,
        fetch_recent_decisions,
        get_client,
    )

    client = get_client()

    # Fetch the decision
    decision_resp = (
        client.table("routing_decisions")
        .select("*")
        .eq("id", decision_id)
        .single()
        .execute()
    )
    if not decision_resp.data:
        logger.warning(f"Decision {decision_id} not found")
        return None

    decision = decision_resp.data
    pre_state = decision.get("state_snapshot", {})

    # Check if there was a session after this decision
    from datetime import datetime, timezone

    decision_time = decision.get("created_at", "")
    sessions_after = (
        client.table("session_summaries")
        .select("completed_session, estimated_cognitive_load, ended_at")
        .eq("user_id", user_id)
        .gt("started_at", decision_time)
        .order("started_at", desc=False)
        .limit(1)
        .execute()
    )

    if not sessions_after.data:
        return None  # No session followed — can't compute reward yet

    session = sessions_after.data[0]
    session_completed = session.get("completed_session", False)

    # Build approximate post-state
    from ..data.supabase_client import fetch_vocabulary_scores

    post_vocab = fetch_vocabulary_scores(user_id)
    post_state = {
        "avg_production_score": post_vocab["avg_production_score"],
        "avg_pronunciation_score": post_vocab["avg_pronunciation_score"],
        "cognitive_load_last_session": session.get("estimated_cognitive_load", 0.5),
    }

    # Approximate recall from DKT (use current as post-state)
    from ..data.supabase_client import fetch_dkt_knowledge_state

    dkt = fetch_dkt_knowledge_state(user_id)
    if dkt:
        post_state["avg_recall"] = sum(
            r.get("p_recall", 0.5) for r in dkt
        ) / len(dkt)
    else:
        post_state["avg_recall"] = 0.5

    # Get modules for monotony check
    last_modules = fetch_last_n_modules(user_id, n=settings.reward.monotony_window)

    return compute_reward(
        decision=decision,
        pre_state=pre_state,
        post_state=post_state,
        session_completed=session_completed,
        last_n_modules=last_modules,
    )
