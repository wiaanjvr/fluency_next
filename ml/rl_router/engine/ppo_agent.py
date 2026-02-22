"""
PPO (Proximal Policy Optimization) agent for module routing.

This is the advanced RL algorithm that replaces LinUCB once
sufficient training data is available (10,000+ session records).

Architecture:
  - Shared feature extractor (MLP)
  - Policy head (actor): outputs action logits → categorical distribution
  - Value head (critic): outputs state value estimate

Training uses the clipped PPO objective with GAE for advantage estimation.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from loguru import logger

from ..config import settings

ACTIONS = list(settings.router.actions)
NUM_ACTIONS = len(ACTIONS)

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torch.distributions import Categorical

    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning(
        "PyTorch not installed — PPO agent will not be available. "
        "Install with: pip install torch"
    )


# ── Network Definition ──────────────────────────────────────────────────────


if TORCH_AVAILABLE:

    class ActorCritic(nn.Module):
        """Shared-backbone actor-critic network for PPO."""

        def __init__(
            self,
            state_dim: int,
            n_actions: int,
            hidden_dim: int = settings.ppo.hidden_dim,
            num_layers: int = settings.ppo.num_layers,
            dropout: float = settings.ppo.dropout,
        ) -> None:
            super().__init__()
            self.state_dim = state_dim
            self.n_actions = n_actions

            # Shared feature extractor
            layers: list[nn.Module] = []
            in_dim = state_dim
            for _ in range(num_layers):
                layers.extend([
                    nn.Linear(in_dim, hidden_dim),
                    nn.LayerNorm(hidden_dim),
                    nn.ReLU(),
                    nn.Dropout(dropout),
                ])
                in_dim = hidden_dim
            self.backbone = nn.Sequential(*layers)

            # Policy head (actor)
            self.policy_head = nn.Linear(hidden_dim, n_actions)

            # Value head (critic)
            self.value_head = nn.Linear(hidden_dim, 1)

        def forward(
            self, x: torch.Tensor
        ) -> tuple[torch.Tensor, torch.Tensor]:
            """
            Forward pass.

            Args:
                x: State tensor of shape (batch, state_dim)

            Returns:
                (action_logits, state_values) both of shape (batch, ...)
            """
            features = self.backbone(x)
            logits = self.policy_head(features)
            values = self.value_head(features).squeeze(-1)
            return logits, values

        def get_action(
            self, x: torch.Tensor, deterministic: bool = False
        ) -> tuple[int, float, float]:
            """
            Select an action from the policy.

            Returns:
                (action_index, log_prob, state_value)
            """
            logits, value = self.forward(x.unsqueeze(0))
            dist = Categorical(logits=logits)
            if deterministic:
                action = logits.argmax(dim=-1)
            else:
                action = dist.sample()
            log_prob = dist.log_prob(action)
            return int(action.item()), float(log_prob.item()), float(value.item())

        def evaluate_actions(
            self, states: torch.Tensor, actions: torch.Tensor
        ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
            """
            Evaluate previously taken actions. Used during PPO update.

            Returns:
                (log_probs, state_values, entropy)
            """
            logits, values = self.forward(states)
            dist = Categorical(logits=logits)
            log_probs = dist.log_prob(actions)
            entropy = dist.entropy()
            return log_probs, values, entropy


# ── Rollout Buffer ──────────────────────────────────────────────────────────


class RolloutBuffer:
    """Stores transitions for PPO training."""

    def __init__(self, capacity: int = settings.ppo.buffer_size) -> None:
        self.capacity = capacity
        self.states: list[np.ndarray] = []
        self.actions: list[int] = []
        self.rewards: list[float] = []
        self.log_probs: list[float] = []
        self.values: list[float] = []
        self.dones: list[bool] = []

    def add(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        log_prob: float,
        value: float,
        done: bool = True,
    ) -> None:
        self.states.append(state)
        self.actions.append(action)
        self.rewards.append(reward)
        self.log_probs.append(log_prob)
        self.values.append(value)
        self.dones.append(done)

        # Trim if over capacity
        if len(self.states) > self.capacity:
            excess = len(self.states) - self.capacity
            self.states = self.states[excess:]
            self.actions = self.actions[excess:]
            self.rewards = self.rewards[excess:]
            self.log_probs = self.log_probs[excess:]
            self.values = self.values[excess:]
            self.dones = self.dones[excess:]

    def compute_gae(
        self,
        gamma: float = settings.ppo.gamma,
        gae_lambda: float = settings.ppo.gae_lambda,
    ) -> tuple[np.ndarray, np.ndarray]:
        """
        Compute Generalized Advantage Estimation (GAE).

        Returns:
            (advantages, returns) both of shape (N,)
        """
        n = len(self.rewards)
        advantages = np.zeros(n, dtype=np.float32)
        returns = np.zeros(n, dtype=np.float32)

        last_gae = 0.0
        last_value = 0.0  # terminal state value

        for t in reversed(range(n)):
            if t == n - 1 or self.dones[t]:
                next_value = 0.0
            else:
                next_value = self.values[t + 1]

            delta = self.rewards[t] + gamma * next_value - self.values[t]
            last_gae = delta + gamma * gae_lambda * (
                0.0 if self.dones[t] else last_gae
            )
            advantages[t] = last_gae
            returns[t] = advantages[t] + self.values[t]

        return advantages, returns

    def clear(self) -> None:
        self.states.clear()
        self.actions.clear()
        self.rewards.clear()
        self.log_probs.clear()
        self.values.clear()
        self.dones.clear()

    def __len__(self) -> int:
        return len(self.states)


# ── PPO Agent ───────────────────────────────────────────────────────────────


class PPOAgent:
    """
    PPO agent for module routing. Manages the actor-critic network,
    rollout buffer, and training loop.
    """

    def __init__(
        self,
        state_dim: int = settings.bandit.feature_dim,
        n_actions: int = NUM_ACTIONS,
    ) -> None:
        self.state_dim = state_dim
        self.n_actions = n_actions
        self._is_loaded = False
        self.training_steps = 0

        if TORCH_AVAILABLE:
            self.device = torch.device(
                "cuda" if torch.cuda.is_available() else "cpu"
            )
            self.network = ActorCritic(state_dim, n_actions).to(self.device)
            self.optimizer = torch.optim.Adam(
                self.network.parameters(),
                lr=settings.ppo.learning_rate,
            )
            self.buffer = RolloutBuffer()
        else:
            self.device = None
            self.network = None
            self.optimizer = None
            self.buffer = RolloutBuffer()

    def predict(
        self, x: np.ndarray, deterministic: bool = True
    ) -> tuple[int, np.ndarray]:
        """
        Select the best action given a state vector.

        Returns:
            (action_index, action_probabilities)
        """
        if not TORCH_AVAILABLE or self.network is None:
            raise RuntimeError("PyTorch not available for PPO inference")

        self.network.eval()
        with torch.no_grad():
            state_t = torch.FloatTensor(x).to(self.device)
            logits, _ = self.network(state_t.unsqueeze(0))
            probs = torch.softmax(logits, dim=-1).cpu().numpy().flatten()

            if deterministic:
                action = int(np.argmax(probs))
            else:
                action = int(np.random.choice(self.n_actions, p=probs))

        return action, probs

    def predict_with_value(
        self, x: np.ndarray
    ) -> tuple[int, float, float, np.ndarray]:
        """
        Select action and return log_prob + value estimate.

        Returns:
            (action_index, log_prob, value, probabilities)
        """
        if not TORCH_AVAILABLE or self.network is None:
            raise RuntimeError("PyTorch not available for PPO inference")

        self.network.eval()
        with torch.no_grad():
            state_t = torch.FloatTensor(x).to(self.device)
            action, log_prob, value = self.network.get_action(
                state_t, deterministic=False
            )
            logits, _ = self.network(state_t.unsqueeze(0))
            probs = torch.softmax(logits, dim=-1).cpu().numpy().flatten()

        return action, log_prob, value, probs

    def store_transition(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        log_prob: float,
        value: float,
        done: bool = True,
    ) -> None:
        """Add a transition to the rollout buffer."""
        self.buffer.add(state, action, reward, log_prob, value, done)

    def train_step(self) -> dict[str, float]:
        """
        Perform a PPO update using the rollout buffer.

        Returns:
            Training metrics dict.
        """
        if not TORCH_AVAILABLE or self.network is None:
            raise RuntimeError("PyTorch not available for PPO training")

        if len(self.buffer) < settings.ppo.batch_size:
            logger.warning(
                f"Not enough data for PPO update "
                f"({len(self.buffer)}/{settings.ppo.batch_size})"
            )
            return {"status": "insufficient_data"}

        cfg = settings.ppo
        self.network.train()

        # Compute advantages
        advantages, returns = self.buffer.compute_gae(cfg.gamma, cfg.gae_lambda)

        # Convert to tensors
        states_t = torch.FloatTensor(np.array(self.buffer.states)).to(self.device)
        actions_t = torch.LongTensor(self.buffer.actions).to(self.device)
        old_log_probs_t = torch.FloatTensor(self.buffer.log_probs).to(self.device)
        advantages_t = torch.FloatTensor(advantages).to(self.device)
        returns_t = torch.FloatTensor(returns).to(self.device)

        # Normalise advantages
        advantages_t = (advantages_t - advantages_t.mean()) / (
            advantages_t.std() + 1e-8
        )

        # PPO epochs
        total_policy_loss = 0.0
        total_value_loss = 0.0
        total_entropy = 0.0
        n_updates = 0

        n = len(self.buffer)
        for epoch in range(cfg.epochs_per_update):
            # Mini-batch sampling
            indices = np.random.permutation(n)
            for start in range(0, n, cfg.batch_size):
                end = min(start + cfg.batch_size, n)
                idx = indices[start:end]

                batch_states = states_t[idx]
                batch_actions = actions_t[idx]
                batch_old_log_probs = old_log_probs_t[idx]
                batch_advantages = advantages_t[idx]
                batch_returns = returns_t[idx]

                # Evaluate actions under current policy
                log_probs, values, entropy = self.network.evaluate_actions(
                    batch_states, batch_actions
                )

                # PPO clipped objective
                ratio = torch.exp(log_probs - batch_old_log_probs)
                surr1 = ratio * batch_advantages
                surr2 = (
                    torch.clamp(ratio, 1.0 - cfg.clip_epsilon, 1.0 + cfg.clip_epsilon)
                    * batch_advantages
                )
                policy_loss = -torch.min(surr1, surr2).mean()

                # Value loss
                value_loss = F.mse_loss(values, batch_returns)

                # Entropy bonus
                entropy_loss = -entropy.mean()

                # Total loss
                loss = (
                    policy_loss
                    + cfg.value_coef * value_loss
                    + cfg.entropy_coef * entropy_loss
                )

                self.optimizer.zero_grad()
                loss.backward()
                if cfg.max_grad_norm > 0:
                    torch.nn.utils.clip_grad_norm_(
                        self.network.parameters(), cfg.max_grad_norm
                    )
                self.optimizer.step()

                total_policy_loss += policy_loss.item()
                total_value_loss += value_loss.item()
                total_entropy += entropy.mean().item()
                n_updates += 1

        self.training_steps += 1

        metrics = {
            "policy_loss": total_policy_loss / max(n_updates, 1),
            "value_loss": total_value_loss / max(n_updates, 1),
            "entropy": total_entropy / max(n_updates, 1),
            "buffer_size": n,
            "n_updates": n_updates,
            "training_step": self.training_steps,
        }

        logger.info(
            f"PPO update: policy_loss={metrics['policy_loss']:.4f}, "
            f"value_loss={metrics['value_loss']:.4f}, "
            f"entropy={metrics['entropy']:.4f}"
        )

        # Clear buffer after update
        self.buffer.clear()
        return metrics

    def save(self, path: Path | None = None) -> None:
        """Save model to disk."""
        if not TORCH_AVAILABLE or self.network is None:
            return

        save_path = path or settings.paths.ppo_model_path
        torch.save(
            {
                "network_state_dict": self.network.state_dict(),
                "optimizer_state_dict": self.optimizer.state_dict(),
                "training_steps": self.training_steps,
                "state_dim": self.state_dim,
                "n_actions": self.n_actions,
            },
            save_path,
        )
        logger.info(f"PPO model saved to {save_path} (step {self.training_steps})")

    def load(self, path: Path | None = None) -> bool:
        """Load model from disk. Returns True if successful."""
        if not TORCH_AVAILABLE:
            return False

        load_path = path or settings.paths.ppo_model_path
        if not load_path.exists():
            logger.warning(f"No PPO model found at {load_path}")
            return False

        try:
            checkpoint = torch.load(load_path, map_location=self.device, weights_only=False)
            self.network = ActorCritic(
                checkpoint["state_dim"], checkpoint["n_actions"]
            ).to(self.device)
            self.network.load_state_dict(checkpoint["network_state_dict"])
            self.optimizer = torch.optim.Adam(
                self.network.parameters(), lr=settings.ppo.learning_rate
            )
            self.optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
            self.training_steps = checkpoint["training_steps"]
            self._is_loaded = True
            logger.info(
                f"PPO model loaded from {load_path} (step {self.training_steps})"
            )
            return True
        except Exception as exc:
            logger.error(f"Failed to load PPO model: {exc}")
            return False

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded and TORCH_AVAILABLE

    @property
    def stats(self) -> dict[str, Any]:
        return {
            "training_steps": self.training_steps,
            "buffer_size": len(self.buffer),
            "torch_available": TORCH_AVAILABLE,
            "device": str(self.device) if self.device else None,
            "is_loaded": self.is_loaded,
        }


# Module-level singleton
ppo_agent = PPOAgent()
