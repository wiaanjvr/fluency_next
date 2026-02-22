"""
FastAPI routes for the RL Module Router.

Endpoints:
  POST /ml/router/next-activity   — get next activity recommendation
  POST /ml/router/observe-reward  — observe reward for a past decision
  POST /ml/router/train           — trigger model training (admin)
  GET  /ml/router/health          — health check
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from loguru import logger

from ml.shared.prediction_log import log_prediction, timed
from ..config import settings
from ..data.supabase_client import (
    count_total_sessions,
    save_reward_observation,
)
from ..engine.bandit import bandit_model
from ..engine.ppo_agent import ppo_agent
from ..engine.reward import compute_reward_from_db
from ..engine.router import route_next_activity
from .schemas import (
    HealthResponse,
    NextActivityRequest,
    NextActivityResponse,
    ObserveRewardRequest,
    ObserveRewardResponse,
    TrainRequest,
    TrainResponse,
)

router = APIRouter(prefix="/ml/router", tags=["rl-router"])


# ── Auth dependency ─────────────────────────────────────────────────────────


async def verify_api_key(x_api_key: str = Header(default="")) -> None:
    """
    Simple shared-secret auth for service-to-service calls.
    If RL_ROUTER_API_KEY is not configured, authentication is skipped (dev mode).
    """
    expected = settings.server.api_key
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ── Next Activity ───────────────────────────────────────────────────────────


@router.post(
    "/next-activity",
    response_model=NextActivityResponse,
    dependencies=[Depends(verify_api_key)],
)
async def next_activity(req: NextActivityRequest) -> NextActivityResponse:
    """
    Recommend the next learning module for a user.

    Uses cold-start rules for new users, LinUCB contextual bandit for the
    early phase, and PPO once sufficient training data exists.
    """
    try:
        with timed() as t:
            result = route_next_activity(
                user_id=req.user_id,
                last_completed_module=req.last_completed_module,
                available_minutes=req.available_minutes,
            )

        resp = NextActivityResponse(
            recommended_module=result["recommendedModule"],
            target_words=result["targetWords"],
            target_concept=result["targetConcept"],
            reason=result["reason"],
            confidence=result["confidence"],
            algorithm=result["algorithm"],
            decision_id=result["decisionId"],
        )

        log_prediction(
            service="rl_router", endpoint="next-activity",
            user_id=req.user_id,
            inputs={"last_completed_module": req.last_completed_module,
                    "available_minutes": req.available_minutes},
            outputs={"recommended_module": result["recommendedModule"],
                     "algorithm": result["algorithm"],
                     "confidence": result["confidence"]},
            latency_ms=t.latency_ms,
        )

        logger.info(
            f"Routed {req.user_id[:8]}... → {result['recommendedModule']} "
            f"(algo={result['algorithm']}, conf={result['confidence']:.2f})"
        )
        return resp

    except Exception as exc:
        logger.exception("next_activity failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Observe Reward ──────────────────────────────────────────────────────────


@router.post(
    "/observe-reward",
    response_model=ObserveRewardResponse,
    dependencies=[Depends(verify_api_key)],
)
async def observe_reward(req: ObserveRewardRequest) -> ObserveRewardResponse:
    """
    Compute and persist the reward for a previous routing decision.
    Called after a user completes (or abandons) the recommended activity.
    """
    try:
        result = compute_reward_from_db(req.decision_id, req.user_id)

        if result is None:
            return ObserveRewardResponse(
                reward=0.0,
                components={},
                observation_id=None,
            )

        total_reward, components = result

        # Persist the reward
        obs_id = save_reward_observation(
            decision_id=req.decision_id,
            user_id=req.user_id,
            reward=total_reward,
            reward_components=components,
        )

        # Online update for bandit
        _online_update_bandit(req.decision_id, req.user_id, total_reward)

        logger.info(
            f"Reward observed for decision {req.decision_id[:8]}...: "
            f"reward={total_reward:.2f}"
        )

        return ObserveRewardResponse(
            reward=total_reward,
            components=components,
            observation_id=obs_id,
        )

    except Exception as exc:
        logger.exception("observe_reward failed")
        raise HTTPException(status_code=500, detail=str(exc))


def _online_update_bandit(
    decision_id: str, user_id: str, reward: float
) -> None:
    """
    If the bandit is the active algorithm, update it online with
    the observed reward.
    """
    from ..data.supabase_client import get_client
    from ..engine.bandit import ACTIONS
    from ..engine.state_assembler import STATE_DIM

    try:
        client = get_client()
        decision = (
            client.table("routing_decisions")
            .select("recommended_module, state_snapshot, algorithm_used")
            .eq("id", decision_id)
            .single()
            .execute()
        )

        if not decision.data:
            return

        if decision.data.get("algorithm_used") != "linucb":
            return

        module = decision.data["recommended_module"]
        if module not in ACTIONS:
            return

        action_idx = ACTIONS.index(module)

        # Reconstruct state vector from snapshot
        # (approximate — the actual vector isn't stored, only the snapshot)
        # For a more precise update, store the vector in the decision
        import numpy as np

        snapshot = decision.data.get("state_snapshot", {})
        # Use a simplified state vector from the snapshot
        x = np.zeros(STATE_DIM, dtype=np.float32)
        x[9] = snapshot.get("avg_production_score", 0.5)
        x[10] = snapshot.get("avg_pronunciation_score", 0.5)
        x[11] = snapshot.get("weakest_concept_score", 1.0)
        x[12] = snapshot.get("cognitive_load_last_session", 0.5)
        x[14] = min(snapshot.get("days_since_last_session", 0) / 30.0, 1.0)

        bandit_model.update(action_idx, x, reward)

    except Exception as exc:
        logger.debug(f"Online bandit update skipped: {exc}")


# ── Training ────────────────────────────────────────────────────────────────


@router.post(
    "/train",
    response_model=TrainResponse,
    dependencies=[Depends(verify_api_key)],
)
async def train(req: TrainRequest) -> TrainResponse:
    """
    Trigger model training for the bandit or PPO agent.
    """
    from ..training.trainer import train_router_model

    try:
        result = train_router_model(
            algorithm=req.algorithm,
            force=req.force,
        )
        return TrainResponse(
            status=result.get("status", "ok"),
            algorithm=result.get("algorithm", req.algorithm),
            metrics=result.get("metrics"),
        )
    except Exception as exc:
        logger.exception("Training failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Health check ────────────────────────────────────────────────────────────


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Health check endpoint with model status."""
    from .. import __version__

    # Determine active algorithm
    try:
        total_sessions = count_total_sessions()
    except Exception:
        total_sessions = 0

    if ppo_agent.is_loaded and total_sessions >= settings.ppo.min_sessions_for_ppo:
        active_algo = "ppo"
    elif bandit_model.is_loaded:
        active_algo = "linucb"
    else:
        active_algo = "cold_start"

    return HealthResponse(
        status="ok",
        version=__version__,
        bandit_loaded=bandit_model.is_loaded,
        ppo_loaded=ppo_agent.is_loaded,
        active_algorithm=active_algo,
        bandit_stats=bandit_model.stats,
        ppo_stats=ppo_agent.stats,
    )
