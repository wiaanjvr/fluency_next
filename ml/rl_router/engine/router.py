"""
Module Router — the main routing logic.

Orchestrates the routing decision by:
1. Assembling the user state
2. Checking if we should use cold-start, bandit, or PPO
3. Running the appropriate algorithm
4. Selecting target words/concepts for the recommended module
5. Persisting the decision
"""

from __future__ import annotations

from typing import Any

import numpy as np
from loguru import logger

from ..config import settings
from ..data.supabase_client import count_total_sessions, save_routing_decision
from .bandit import ACTIONS, bandit_model
from .cold_start import cold_start_recommend
from .ppo_agent import ppo_agent
from .state_assembler import UserState, assemble_state


def route_next_activity(
    user_id: str,
    last_completed_module: str | None = None,
    available_minutes: float | None = None,
) -> dict[str, Any]:
    """
    Main entry-point: decide what the user should do next.

    Args:
        user_id: The user's UUID.
        last_completed_module: The module the user just completed (optional).
        available_minutes: How many minutes the user has (optional).

    Returns:
        {
            "recommendedModule": str,
            "targetWords": list[str],
            "targetConcept": str | None,
            "reason": str,
            "confidence": float,
            "algorithm": str,
            "decisionId": str | None,
        }
    """
    # 1. Assemble user state
    state = assemble_state(user_id, available_minutes)

    # 2. Decide which algorithm to use
    algorithm: str
    if state.event_count < settings.cold_start.min_events:
        algorithm = "cold_start"
    elif _should_use_ppo():
        algorithm = "ppo"
    else:
        algorithm = "linucb"

    logger.info(
        f"Routing [{user_id[:8]}]: algorithm={algorithm}, "
        f"events={state.event_count}"
    )

    # 3. Run the appropriate algorithm
    if algorithm == "cold_start":
        result = _run_cold_start(state)
    elif algorithm == "ppo":
        result = _run_ppo(state)
    else:
        result = _run_bandit(state)

    # 4. Enrich with target words/concept
    result = _enrich_targets(result, state)

    # 5. Apply time constraint
    result = _apply_time_constraint(result, state)

    # 6. Persist the decision
    decision_id = save_routing_decision(
        user_id=user_id,
        recommended_module=result["module"],
        target_word_ids=result["target_words"],
        target_concept=result["target_concept"],
        reason=result["reason"],
        confidence=result["confidence"],
        state_snapshot=state.to_snapshot(),
        algorithm_used=algorithm,
    )

    return {
        "recommendedModule": result["module"],
        "targetWords": result["target_words"],
        "targetConcept": result["target_concept"],
        "reason": result["reason"],
        "confidence": round(result["confidence"], 4),
        "algorithm": algorithm,
        "decisionId": decision_id,
    }


# ── Algorithm runners ───────────────────────────────────────────────────────


def _run_cold_start(state: UserState) -> dict:
    """Use rule-based fallback."""
    return cold_start_recommend(state)


def _run_bandit(state: UserState) -> dict:
    """Use LinUCB contextual bandit."""
    x = state.to_vector()
    action_idx, probs = bandit_model.predict_with_probs(x)
    action_name = ACTIONS[action_idx]
    confidence = float(probs[action_idx])

    reason = _build_bandit_reason(action_name, state, probs)

    return {
        "module": action_name,
        "target_words": [],
        "target_concept": None,
        "reason": reason,
        "confidence": confidence,
    }


def _run_ppo(state: UserState) -> dict:
    """Use PPO reinforcement learning agent."""
    x = state.to_vector()
    action_idx, probs = ppo_agent.predict(x, deterministic=True)
    action_name = ACTIONS[action_idx]
    confidence = float(probs[action_idx])

    reason = _build_ppo_reason(action_name, state, probs)

    return {
        "module": action_name,
        "target_words": [],
        "target_concept": None,
        "reason": reason,
        "confidence": confidence,
    }


def _should_use_ppo() -> bool:
    """Check if we have enough data and a trained PPO model to use it."""
    if not ppo_agent.is_loaded:
        return False
    try:
        total = count_total_sessions()
        return total >= settings.ppo.min_sessions_for_ppo
    except Exception:
        return False


# ── Target enrichment ───────────────────────────────────────────────────────


def _enrich_targets(result: dict, state: UserState) -> dict:
    """
    Add target word IDs and concept tags based on the recommended module
    and the user's current state.
    """
    module = result["module"]
    max_words = settings.router.max_target_words

    if module == "anki_drill":
        # Target words that are due for review or have low recall
        if state.low_production_words:
            result["target_words"] = state.low_production_words[:max_words]
        result["reason"] += (
            f" Targeting {len(result['target_words'])} words for flashcard review."
        )

    elif module == "cloze_practice":
        # Words with moderate production (need contextual reinforcement)
        result["target_words"] = state.low_production_words[:max_words]
        result["reason"] += (
            f" {len(result['target_words'])} words selected for cloze fill-in practice."
        )

    elif module == "conjugation_drill":
        result["target_words"] = state.low_production_words[:max_words]
        if state.weakest_concept_tag:
            result["target_concept"] = state.weakest_concept_tag
        result["reason"] += (
            f" Targeting weakest grammar concept"
            + (f" '{state.weakest_concept_tag}'" if state.weakest_concept_tag else "")
            + "."
        )

    elif module == "pronunciation_session":
        result["target_words"] = state.low_pronunciation_words[:max_words]
        result["reason"] += (
            f" {len(result['target_words'])} words need pronunciation improvement."
        )

    elif module == "grammar_lesson":
        if state.weakest_concept_tag:
            result["target_concept"] = state.weakest_concept_tag
        result["reason"] += (
            f" Focus on weakest concept"
            + (f" '{state.weakest_concept_tag}'" if state.weakest_concept_tag else "")
            + f" (mastery: {state.weakest_concept_score:.0%})."
        )

    elif module == "rest":
        result["reason"] += (
            f" Cognitive load: {state.cognitive_load_last_session:.0%}. "
            f"Take a break and return refreshed."
        )

    # story_engine doesn't need specific targets (the story generator handles it)
    return result


# ── Time constraints ────────────────────────────────────────────────────────


def _apply_time_constraint(result: dict, state: UserState) -> dict:
    """
    Adjust recommendations based on available time.
    Very short sessions → prefer quick drills.
    Very long sessions → story engine is fine.
    """
    minutes = state.estimated_available_minutes
    module = result["module"]

    # If user has < 5 minutes, avoid story engine (needs more time)
    if minutes < 5 and module == "story_engine":
        # Switch to a quick drill
        if state.low_production_words:
            result["module"] = "anki_drill"
            result["reason"] = (
                f"Only ~{minutes:.0f} minutes available — switching to quick "
                f"flashcard drill instead of story mode."
            )
        elif state.low_pronunciation_words:
            result["module"] = "pronunciation_session"
            result["reason"] = (
                f"Only ~{minutes:.0f} minutes available — quick pronunciation "
                f"practice."
            )
        else:
            result["module"] = "rest"
            result["reason"] = (
                f"Only ~{minutes:.0f} minutes and all scores are healthy — "
                f"take a short break."
            )

    # If module is rest but user has lots of time, suggest it gently
    if module == "rest" and minutes > 30:
        result["reason"] += (
            " You have plenty of time if you'd prefer to continue studying."
        )

    return result


# ── Reason builders ─────────────────────────────────────────────────────────


def _build_bandit_reason(
    action: str, state: UserState, probs: np.ndarray
) -> str:
    """Build a human-readable reason string for a bandit recommendation."""
    top_3_idx = np.argsort(probs)[::-1][:3]
    alternatives = [
        f"{ACTIONS[i]} ({probs[i]:.0%})" for i in top_3_idx if ACTIONS[i] != action
    ][:2]

    base = f"LinUCB selected '{action}' (confidence: {probs[np.where(np.array(ACTIONS) == action)[0][0]]:.0%})."
    if alternatives:
        base += f" Alternatives: {', '.join(alternatives)}."
    return base


def _build_ppo_reason(
    action: str, state: UserState, probs: np.ndarray
) -> str:
    """Build a human-readable reason string for a PPO recommendation."""
    action_idx = ACTIONS.index(action)
    confidence = probs[action_idx]

    top_3_idx = np.argsort(probs)[::-1][:3]
    alternatives = [
        f"{ACTIONS[i]} ({probs[i]:.0%})" for i in top_3_idx if ACTIONS[i] != action
    ][:2]

    base = f"PPO agent selected '{action}' (confidence: {confidence:.0%})."
    if alternatives:
        base += f" Alternatives: {', '.join(alternatives)}."
    return base
