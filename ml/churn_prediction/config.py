"""
Churn Prediction & Engagement Rescue — Configuration.

Reads from environment variables with sensible defaults.
Follows the same pattern as ml.cold_start.config.
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


@dataclass(frozen=True)
class PreSessionConfig:
    """Parameters for the pre-session churn classifier."""

    # ── Thresholds ───────────────────────────────────────────────────────
    churn_threshold: float = 0.7       # Trigger notification above this
    min_training_samples: int = 500    # Minimum labeled rows to train

    # ── Feature engineering ──────────────────────────────────────────────
    lookback_days: int = 90            # Days of history for training data
    time_of_day_buckets: tuple[str, ...] = (
        "morning", "afternoon", "evening", "night"
    )

    # ── Model ────────────────────────────────────────────────────────────
    model_type: str = "logistic_regression"  # or "gradient_boosted_tree"
    random_state: int = 42
    max_iter: int = 1000

    # ── Gradient Boosted Tree params (when model_type = "gradient_boosted_tree")
    n_estimators: int = 200
    max_depth: int = 6
    learning_rate: float = 0.1

    # ── Retraining schedule ──────────────────────────────────────────────
    daily_retrain_hour: int = 3        # 03:00 UTC
    min_users_for_training: int = 30


@dataclass(frozen=True)
class MidSessionConfig:
    """Parameters for the mid-session abandonment classifier."""

    # ── Thresholds ───────────────────────────────────────────────────────
    abandonment_threshold: float = 0.65   # Trigger intervention above this
    check_interval_words: int = 5         # Run model every N words

    # ── Feature engineering ──────────────────────────────────────────────
    min_session_words: int = 5            # Min words for a session to count

    # ── Model ────────────────────────────────────────────────────────────
    model_type: str = "logistic_regression"  # or "gradient_boosted_tree"
    random_state: int = 42
    max_iter: int = 1000

    # ── Gradient Boosted Tree params
    n_estimators: int = 200
    max_depth: int = 6
    learning_rate: float = 0.1

    # ── Training
    min_training_samples: int = 200


@dataclass(frozen=True)
class InterventionConfig:
    """Parameters for rescue intervention logic."""

    # ── Session shortening ───────────────────────────────────────────────
    shorten_factor: float = 0.5           # Reduce remaining words by 50%

    # ── Easy content switch ──────────────────────────────────────────────
    easy_recognition_threshold: float = 0.7  # Only words with score > this

    # ── Break suggestion ─────────────────────────────────────────────────
    break_suggestion_minutes: int = 25    # Suggest break after this duration
    break_duration_minutes: int = 5

    # ── Intervention priority order ──────────────────────────────────────
    priority_order: tuple[str, ...] = (
        "shorten_session",
        "switch_easier_content",
        "switch_module",
        "celebrate_micro_progress",
        "suggest_break",
    )


@dataclass(frozen=True)
class NotificationConfig:
    """Templates for churn rescue notifications."""

    hooks: tuple[str, ...] = (
        "{count} words you're about to forget",
        "Your {streak}-day streak is at risk!",
        "Just 5 minutes to keep your progress",
        "Quick review: {language} words fading from memory",
        "Your brain wants to practice — {count} words ready",
    )


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
    def pre_session_model_path(self) -> Path:
        return self.checkpoints_dir / "pre_session_model.joblib"

    @property
    def pre_session_scaler_path(self) -> Path:
        return self.checkpoints_dir / "pre_session_scaler.joblib"

    @property
    def mid_session_model_path(self) -> Path:
        return self.checkpoints_dir / "mid_session_model.joblib"

    @property
    def mid_session_scaler_path(self) -> Path:
        return self.checkpoints_dir / "mid_session_scaler.joblib"


@dataclass(frozen=True)
class ServerConfig:
    host: str = field(
        default_factory=lambda: os.getenv("CHURN_PREDICTION_HOST", "0.0.0.0")
    )
    port: int = field(
        default_factory=lambda: int(os.getenv("CHURN_PREDICTION_PORT", "8700"))
    )
    workers: int = field(
        default_factory=lambda: int(os.getenv("CHURN_PREDICTION_WORKERS", "1"))
    )
    api_key: str = field(
        default_factory=lambda: os.getenv("CHURN_PREDICTION_API_KEY", "")
    )


@dataclass(frozen=True)
class Settings:
    supabase: SupabaseConfig = field(default_factory=SupabaseConfig)
    pre_session: PreSessionConfig = field(default_factory=PreSessionConfig)
    mid_session: MidSessionConfig = field(default_factory=MidSessionConfig)
    interventions: InterventionConfig = field(default_factory=InterventionConfig)
    notifications: NotificationConfig = field(default_factory=NotificationConfig)
    paths: PathConfig = field(default_factory=PathConfig)
    server: ServerConfig = field(default_factory=ServerConfig)


settings = Settings()
