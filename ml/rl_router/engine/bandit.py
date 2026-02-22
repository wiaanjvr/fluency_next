"""
LinUCB Contextual Bandit for module routing.

Implements the LinUCB algorithm (Li et al., 2010) with disjoint linear
models — one per action (module). This is the early-phase algorithm used
when data is sparse (< 10,000 sessions).

Each arm maintains:
  A_a  — (d×d) matrix ≈ Σ(x_t x_t^T) + I
  b_a  — (d,) vector  ≈ Σ(r_t x_t)

At decision time, for each arm a:
  θ_a = A_a^{-1} b_a
  p_a  = θ_a^T x + α √(x^T A_a^{-1} x)

We select the arm with the highest p_a (Upper Confidence Bound).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from loguru import logger

from ..config import settings

ACTIONS = list(settings.router.actions)
NUM_ACTIONS = len(ACTIONS)
FEATURE_DIM = settings.bandit.feature_dim


class LinUCBModel:
    """
    LinUCB contextual bandit with per-arm linear models.
    Thread-safe for inference (numpy operations are atomic at the GIL level).
    """

    def __init__(
        self,
        n_actions: int = NUM_ACTIONS,
        d: int = FEATURE_DIM,
        alpha: float = settings.bandit.alpha,
        decay: float = settings.bandit.decay_rate,
    ) -> None:
        self.n_actions = n_actions
        self.d = d
        self.alpha = alpha
        self.decay = decay

        # Per-arm parameters
        self.A: list[np.ndarray] = [np.eye(d) for _ in range(n_actions)]
        self.b: list[np.ndarray] = [np.zeros(d) for _ in range(n_actions)]
        self.A_inv: list[np.ndarray] = [np.eye(d) for _ in range(n_actions)]

        # Tracking
        self.total_updates = 0
        self.arm_pulls: list[int] = [0] * n_actions

    def predict(self, x: np.ndarray) -> tuple[int, np.ndarray]:
        """
        Select the best action given context vector x.

        Args:
            x: Feature vector of shape (d,)

        Returns:
            (best_action_index, ucb_scores for all actions)
        """
        assert x.shape == (self.d,), f"Expected ({self.d},), got {x.shape}"

        scores = np.zeros(self.n_actions)
        for a in range(self.n_actions):
            theta_a = self.A_inv[a] @ self.b[a]
            mean = theta_a @ x
            # UCB exploration bonus
            exploration = self.alpha * np.sqrt(x @ self.A_inv[a] @ x)
            scores[a] = mean + exploration

        best = int(np.argmax(scores))
        return best, scores

    def predict_with_probs(self, x: np.ndarray) -> tuple[int, np.ndarray]:
        """
        Select the best action and return softmax probabilities.

        Returns:
            (best_action_index, probability distribution over actions)
        """
        best, scores = self.predict(x)
        # Softmax for confidence scores
        exp_scores = np.exp(scores - np.max(scores))  # numerically stable
        probs = exp_scores / exp_scores.sum()
        return best, probs

    def update(self, action: int, x: np.ndarray, reward: float) -> None:
        """
        Update the model with an observed (action, context, reward) tuple.

        Args:
            action: Index of the action taken
            x: Context vector of shape (d,)
            reward: Observed reward signal
        """
        assert 0 <= action < self.n_actions, f"Invalid action {action}"
        assert x.shape == (self.d,), f"Expected ({self.d},), got {x.shape}"

        # Optional decay for non-stationarity
        if self.decay < 1.0:
            self.A[action] = self.decay * self.A[action] + np.outer(x, x)
        else:
            self.A[action] += np.outer(x, x)

        self.b[action] += reward * x

        # Recompute inverse (small matrix, so direct inversion is fine)
        try:
            self.A_inv[action] = np.linalg.inv(self.A[action])
        except np.linalg.LinAlgError:
            # Fallback: add regularisation and retry
            self.A[action] += 0.01 * np.eye(self.d)
            self.A_inv[action] = np.linalg.inv(self.A[action])

        self.total_updates += 1
        self.arm_pulls[action] += 1

    def batch_update(
        self,
        actions: list[int],
        contexts: np.ndarray,
        rewards: list[float],
    ) -> None:
        """
        Batch update from multiple (action, context, reward) tuples.

        Args:
            actions: List of action indices
            contexts: Array of shape (N, d)
            rewards: List of reward values
        """
        for i in range(len(actions)):
            self.update(actions[i], contexts[i], rewards[i])

    def get_confidence(self, action: int, x: np.ndarray) -> float:
        """Return the model's confidence for a specific action-context pair."""
        theta_a = self.A_inv[action] @ self.b[action]
        mean = float(theta_a @ x)
        uncertainty = float(np.sqrt(x @ self.A_inv[action] @ x))
        # Confidence is inversely related to uncertainty
        return max(0.0, min(1.0, 1.0 / (1.0 + uncertainty)))

    def save(self, path: Path | None = None) -> None:
        """Save model parameters to disk."""
        import joblib

        save_path = path or settings.paths.bandit_model_path
        state = {
            "A": self.A,
            "b": self.b,
            "A_inv": self.A_inv,
            "n_actions": self.n_actions,
            "d": self.d,
            "alpha": self.alpha,
            "decay": self.decay,
            "total_updates": self.total_updates,
            "arm_pulls": self.arm_pulls,
        }
        joblib.dump(state, save_path)
        logger.info(f"LinUCB model saved to {save_path} ({self.total_updates} updates)")

    def load(self, path: Path | None = None) -> bool:
        """Load model parameters from disk. Returns True if successful."""
        import joblib

        load_path = path or settings.paths.bandit_model_path
        if not load_path.exists():
            logger.warning(f"No LinUCB model found at {load_path}")
            return False

        try:
            state = joblib.load(load_path)
            self.A = state["A"]
            self.b = state["b"]
            self.A_inv = state["A_inv"]
            self.n_actions = state["n_actions"]
            self.d = state["d"]
            self.alpha = state["alpha"]
            self.decay = state["decay"]
            self.total_updates = state["total_updates"]
            self.arm_pulls = state["arm_pulls"]
            logger.info(
                f"LinUCB model loaded from {load_path} "
                f"({self.total_updates} total updates)"
            )
            return True
        except Exception as exc:
            logger.error(f"Failed to load LinUCB model: {exc}")
            return False

    @property
    def is_loaded(self) -> bool:
        return self.total_updates > 0

    @property
    def stats(self) -> dict[str, Any]:
        return {
            "total_updates": self.total_updates,
            "arm_pulls": dict(zip(ACTIONS, self.arm_pulls)),
            "alpha": self.alpha,
            "feature_dim": self.d,
        }


# Module-level singleton
bandit_model = LinUCBModel()
