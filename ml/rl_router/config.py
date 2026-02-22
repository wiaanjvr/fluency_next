"""
RL Module Router — Configuration.

Reads from environment variables with sensible defaults.
Follows the same pattern as ml.churn_prediction.config.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

# Walk up to find the lingua_2.0 .env files
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_PROJECT_ROOT / ".env.local")
load_dotenv(_PROJECT_ROOT / ".env")


@dataclass(frozen=True)
class SupabaseConfig:
    url: str = field(default_factory=lambda: os.getenv("NEXT_PUBLIC_SUPABASE_URL", ""))
    service_role_key: str = field(
        default_factory=lambda: os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    )


# ── Module Router domain config ─────────────────────────────────────────────


@dataclass(frozen=True)
class BanditConfig:
    """LinUCB contextual bandit parameters (early-phase algorithm)."""

    alpha: float = 1.5                  # exploration parameter
    feature_dim: int = 24               # state vector dimension
    min_events_for_bandit: int = 50     # below this → rule-based fallback
    decay_rate: float = 0.999           # per-step matrix decay for non-stationarity


@dataclass(frozen=True)
class PPOConfig:
    """PPO reinforcement learning parameters (advanced algorithm)."""

    # ── When to upgrade from bandit ──────────────────────────────────────
    min_sessions_for_ppo: int = 10_000

    # ── Network architecture ─────────────────────────────────────────────
    hidden_dim: int = 128
    num_layers: int = 2
    dropout: float = 0.1

    # ── PPO hyperparameters ──────────────────────────────────────────────
    learning_rate: float = 3e-4
    gamma: float = 0.99                 # discount factor
    gae_lambda: float = 0.95           # GAE lambda
    clip_epsilon: float = 0.2          # PPO clip range
    entropy_coef: float = 0.01         # entropy bonus
    value_coef: float = 0.5            # value loss weight
    max_grad_norm: float = 0.5         # gradient clipping

    # ── Training ─────────────────────────────────────────────────────────
    batch_size: int = 64
    epochs_per_update: int = 4
    buffer_size: int = 2048            # rollout buffer size
    max_epochs: int = 50
    patience: int = 8


@dataclass(frozen=True)
class RewardConfig:
    """Reward function weights."""

    recall_improvement: float = 2.0
    production_improvement: float = 1.5
    session_completed: float = 1.0
    pronunciation_improvement: float = 0.5
    session_abandoned: float = -1.0
    monotony_penalty: float = -0.5
    monotony_window: int = 3            # penalize same module N times in a row


@dataclass(frozen=True)
class ColdStartConfig:
    """Rule-based fallback thresholds for users with < 50 events."""

    min_events: int = 50
    production_score_threshold: float = 0.4
    pronunciation_score_threshold: float = 0.3
    grammar_mastery_threshold: float = 0.3
    default_module: str = "story_engine"


@dataclass(frozen=True)
class RouterConfig:
    """General routing parameters."""

    # All valid actions the router can recommend
    actions: tuple[str, ...] = (
        "story_engine",
        "anki_drill",
        "cloze_practice",
        "conjugation_drill",
        "pronunciation_session",
        "grammar_lesson",
        "rest",
    )

    # Maximum target words to include in a recommendation
    max_target_words: int = 20
    # Default session length estimate in minutes
    default_session_minutes: int = 15
    # Minimum confidence to report (below this, add explanation)
    min_confidence: float = 0.3


@dataclass(frozen=True)
class PathConfig:
    base_dir: Path = field(
        default_factory=lambda: Path(__file__).resolve().parent
    )

    @property
    def checkpoints_dir(self) -> Path:
        d = self.base_dir / "checkpoints"
        d.mkdir(parents=True, exist_ok=True)
        return d

    @property
    def logs_dir(self) -> Path:
        d = self.base_dir / "logs"
        d.mkdir(parents=True, exist_ok=True)
        return d

    @property
    def bandit_model_path(self) -> Path:
        return self.checkpoints_dir / "linucb_model.joblib"

    @property
    def ppo_model_path(self) -> Path:
        return self.checkpoints_dir / "ppo_model.pt"

    @property
    def reward_log_path(self) -> Path:
        return self.logs_dir / "reward_history.jsonl"


@dataclass(frozen=True)
class ServerConfig:
    host: str = field(
        default_factory=lambda: os.getenv("RL_ROUTER_HOST", "0.0.0.0")
    )
    port: int = field(
        default_factory=lambda: int(os.getenv("RL_ROUTER_PORT", "8800"))
    )
    workers: int = field(
        default_factory=lambda: int(os.getenv("RL_ROUTER_WORKERS", "1"))
    )
    api_key: str = field(
        default_factory=lambda: os.getenv("RL_ROUTER_API_KEY", "")
    )


@dataclass(frozen=True)
class Settings:
    supabase: SupabaseConfig = field(default_factory=SupabaseConfig)
    bandit: BanditConfig = field(default_factory=BanditConfig)
    ppo: PPOConfig = field(default_factory=PPOConfig)
    reward: RewardConfig = field(default_factory=RewardConfig)
    cold_start: ColdStartConfig = field(default_factory=ColdStartConfig)
    router: RouterConfig = field(default_factory=RouterConfig)
    paths: PathConfig = field(default_factory=PathConfig)
    server: ServerConfig = field(default_factory=ServerConfig)


settings = Settings()
