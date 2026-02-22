"""
Training pipeline for the RL Module Router.

Supports:
  - LinUCB batch retraining from historical decision + reward data
  - PPO training from rollout buffer
  - Scheduled retraining via APScheduler
"""

from __future__ import annotations

from typing import Any

import numpy as np
from loguru import logger

from ..config import settings
from ..data.supabase_client import count_total_sessions, fetch_training_data
from ..engine.bandit import ACTIONS, bandit_model
from ..engine.ppo_agent import TORCH_AVAILABLE, ppo_agent
from ..engine.state_assembler import STATE_DIM


def train_router_model(
    algorithm: str = "bandit",
    force: bool = False,
) -> dict[str, Any]:
    """
    Train the routing model from historical data.

    Args:
        algorithm: "bandit", "ppo", or "both"
        force: Force retraining even if a recent model exists

    Returns:
        Status dict with training metrics.
    """
    if algorithm in ("bandit", "both"):
        bandit_result = _train_bandit(force)
    else:
        bandit_result = None

    if algorithm in ("ppo", "both"):
        ppo_result = _train_ppo(force)
    else:
        ppo_result = None

    return {
        "status": "ok",
        "algorithm": algorithm,
        "metrics": {
            "bandit": bandit_result,
            "ppo": ppo_result,
        },
    }


def _train_bandit(force: bool = False) -> dict[str, Any]:
    """
    Retrain LinUCB from historical routing decisions + rewards.
    """
    logger.info("Training LinUCB bandit model...")

    # Fetch training data
    rows = fetch_training_data(min_rows=50, lookback_days=90)
    if not rows:
        logger.warning("No training data available for bandit")
        return {"status": "no_data", "samples": 0}

    # Parse into (action, state_vector, reward) tuples
    actions: list[int] = []
    contexts: list[np.ndarray] = []
    rewards: list[float] = []

    for row in rows:
        module = row.get("recommended_module", "")
        if module not in ACTIONS:
            continue

        action_idx = ACTIONS.index(module)
        snapshot = row.get("state_snapshot", {})

        # Reconstruct approximate state vector from snapshot
        x = _snapshot_to_vector(snapshot)

        # Extract reward from joined data
        reward_data = row.get("routing_rewards")
        if isinstance(reward_data, list) and reward_data:
            reward = float(reward_data[0].get("reward", 0.0))
        elif isinstance(reward_data, dict):
            reward = float(reward_data.get("reward", 0.0))
        else:
            continue

        actions.append(action_idx)
        contexts.append(x)
        rewards.append(reward)

    if not actions:
        logger.warning("No valid training samples after filtering")
        return {"status": "no_valid_samples", "samples": 0}

    logger.info(f"Training bandit with {len(actions)} samples")

    # Reset the bandit and retrain from scratch
    from ..engine.bandit import LinUCBModel

    fresh_model = LinUCBModel()
    contexts_arr = np.array(contexts)
    fresh_model.batch_update(actions, contexts_arr, rewards)

    # Replace global singleton
    bandit_model.A = fresh_model.A
    bandit_model.b = fresh_model.b
    bandit_model.A_inv = fresh_model.A_inv
    bandit_model.total_updates = fresh_model.total_updates
    bandit_model.arm_pulls = fresh_model.arm_pulls

    # Save
    bandit_model.save()

    metrics = {
        "status": "ok",
        "samples": len(actions),
        "total_updates": bandit_model.total_updates,
        "arm_distribution": dict(zip(ACTIONS, bandit_model.arm_pulls)),
        "avg_reward": round(float(np.mean(rewards)), 4),
    }
    logger.info(f"Bandit training complete: {metrics}")
    return metrics


def _train_ppo(force: bool = False) -> dict[str, Any]:
    """
    Train PPO agent from historical data.
    Requires PyTorch and >= 10,000 session records.
    """
    if not TORCH_AVAILABLE:
        return {"status": "torch_not_available"}

    total_sessions = count_total_sessions()
    if total_sessions < settings.ppo.min_sessions_for_ppo and not force:
        logger.info(
            f"Not enough sessions for PPO training "
            f"({total_sessions}/{settings.ppo.min_sessions_for_ppo})"
        )
        return {
            "status": "insufficient_data",
            "total_sessions": total_sessions,
            "required": settings.ppo.min_sessions_for_ppo,
        }

    logger.info(f"Training PPO agent ({total_sessions} sessions)...")

    # Fetch training data
    rows = fetch_training_data(min_rows=1000, lookback_days=180)
    if len(rows) < settings.ppo.batch_size:
        return {"status": "no_data", "samples": len(rows)}

    # Load into the rollout buffer
    import torch

    ppo_agent.buffer.clear()
    loaded = 0

    for row in rows:
        module = row.get("recommended_module", "")
        if module not in ACTIONS:
            continue

        action_idx = ACTIONS.index(module)
        snapshot = row.get("state_snapshot", {})
        x = _snapshot_to_vector(snapshot)

        reward_data = row.get("routing_rewards")
        if isinstance(reward_data, list) and reward_data:
            reward = float(reward_data[0].get("reward", 0.0))
        elif isinstance(reward_data, dict):
            reward = float(reward_data.get("reward", 0.0))
        else:
            continue

        # For historical data, we estimate log_prob and value
        state_t = torch.FloatTensor(x)
        try:
            with torch.no_grad():
                logits, value = ppo_agent.network(state_t.unsqueeze(0))
                dist = torch.distributions.Categorical(logits=logits)
                action_t = torch.tensor([action_idx])
                log_prob = float(dist.log_prob(action_t).item())
                val = float(value.item())
        except Exception:
            log_prob = 0.0
            val = 0.0

        ppo_agent.buffer.add(x, action_idx, reward, log_prob, val, done=True)
        loaded += 1

    if loaded < settings.ppo.batch_size:
        return {"status": "insufficient_valid_samples", "loaded": loaded}

    logger.info(f"PPO buffer loaded with {loaded} transitions")

    # Run multiple training epochs
    all_metrics: list[dict] = []
    for epoch in range(min(settings.ppo.max_epochs, 5)):
        # Re-fill buffer for next epoch (the buffer is cleared after each step)
        if epoch > 0:
            # Re-load data
            ppo_agent.buffer.clear()
            for row in rows:
                module = row.get("recommended_module", "")
                if module not in ACTIONS:
                    continue
                action_idx = ACTIONS.index(module)
                snapshot = row.get("state_snapshot", {})
                x = _snapshot_to_vector(snapshot)
                reward_data = row.get("routing_rewards")
                if isinstance(reward_data, list) and reward_data:
                    reward = float(reward_data[0].get("reward", 0.0))
                elif isinstance(reward_data, dict):
                    reward = float(reward_data.get("reward", 0.0))
                else:
                    continue
                with torch.no_grad():
                    state_t = torch.FloatTensor(x)
                    logits, value = ppo_agent.network(state_t.unsqueeze(0))
                    dist = torch.distributions.Categorical(logits=logits)
                    log_prob = float(dist.log_prob(torch.tensor([action_idx])).item())
                    val = float(value.item())
                ppo_agent.buffer.add(x, action_idx, reward, log_prob, val, done=True)

        metrics = ppo_agent.train_step()
        all_metrics.append(metrics)

    # Save
    ppo_agent.save()

    final_metrics = all_metrics[-1] if all_metrics else {}
    result = {
        "status": "ok",
        "samples": loaded,
        "epochs": len(all_metrics),
        "final_metrics": final_metrics,
    }
    logger.info(f"PPO training complete: {result}")
    return result


def _snapshot_to_vector(snapshot: dict[str, Any]) -> np.ndarray:
    """
    Reconstruct an approximate state vector from a saved state snapshot.
    Not all features are stored in the snapshot, so we fill missing ones
    with neutral defaults.
    """
    from ..engine.state_assembler import MODULE_INDEX, NUM_MODULES

    x = np.full(STATE_DIM, 0.5, dtype=np.float32)

    # Fill known features from snapshot
    x[9] = snapshot.get("avg_production_score", 0.5)
    x[10] = snapshot.get("avg_pronunciation_score", 0.5)
    x[11] = snapshot.get("weakest_concept_score", 1.0)
    x[12] = snapshot.get("cognitive_load_last_session", 0.5)
    x[13] = min(snapshot.get("estimated_available_minutes", 15) / 60.0, 1.0)
    x[14] = min(snapshot.get("days_since_last_session", 0) / 30.0, 1.0)
    x[15] = min(snapshot.get("due_word_count", 0) / 200.0, 1.0)
    x[16] = min(snapshot.get("total_words", 0) / 2000.0, 1.0)
    x[23] = snapshot.get("session_completion_rate", 1.0)

    # Encode last modules
    last_mods = snapshot.get("last_modules", [])
    for i in range(min(3, len(last_mods))):
        idx = MODULE_INDEX.get(last_mods[i], 0)
        x[6 + i] = idx / max(NUM_MODULES - 1, 1)

    return x
