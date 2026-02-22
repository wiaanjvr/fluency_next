"""
Complexity Level Predictor — Configuration.

Reads from environment variables with sensible defaults.
Follows the same pattern as ml.cognitive_load.config / ml.dkt.config.
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
class ModelConfig:
    """Parameters for the gradient-boosted tree model."""

    # ── Complexity levels ────────────────────────────────────────────────
    min_complexity: int = 1
    max_complexity: int = 5

    # ── Session length recommendations ───────────────────────────────────
    min_word_count: int = 20
    max_word_count: int = 120
    min_duration_minutes: float = 3.0
    max_duration_minutes: float = 25.0

    # ── Training ─────────────────────────────────────────────────────────
    n_estimators: int = 200
    max_depth: int = 6
    learning_rate: float = 0.1
    min_child_weight: int = 5
    subsample: float = 0.8
    colsample_bytree: float = 0.8
    early_stopping_rounds: int = 15
    test_size: float = 0.15

    # ── Feature defaults (when data is missing) ─────────────────────────
    default_cognitive_load: float = 0.3
    default_completion_rate: float = 0.8
    default_p_recall_avg: float = 0.6

    # ── Optimal ranges (used for label generation) ───────────────────────
    optimal_cognitive_load_min: float = 0.25
    optimal_cognitive_load_max: float = 0.50
    optimal_completion_rate_min: float = 0.75

    # ── Retraining schedule ──────────────────────────────────────────────
    weekly_retrain_day: int = 1  # Tuesday
    retrain_hour: int = 4  # 04:00 UTC
    min_sessions_for_training: int = 100


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
    def best_model_path(self) -> Path:
        return self.checkpoints_dir / "complexity_predictor_best.json"

    @property
    def session_length_model_path(self) -> Path:
        return self.checkpoints_dir / "session_length_model_best.json"

    @property
    def feature_stats_path(self) -> Path:
        return self.checkpoints_dir / "feature_stats.json"


@dataclass(frozen=True)
class ServerConfig:
    host: str = field(
        default_factory=lambda: os.getenv("COMPLEXITY_PREDICTOR_HOST", "0.0.0.0")
    )
    port: int = field(
        default_factory=lambda: int(os.getenv("COMPLEXITY_PREDICTOR_PORT", "8400"))
    )
    workers: int = field(
        default_factory=lambda: int(os.getenv("COMPLEXITY_PREDICTOR_WORKERS", "1"))
    )
    api_key: str = field(
        default_factory=lambda: os.getenv("COMPLEXITY_PREDICTOR_API_KEY", "")
    )


@dataclass(frozen=True)
class DKTServiceConfig:
    """Configuration for calling the DKT service to get p_recall."""

    url: str = field(
        default_factory=lambda: os.getenv("DKT_SERVICE_URL", "http://localhost:8100")
    )
    api_key: str = field(
        default_factory=lambda: os.getenv("DKT_API_KEY", "")
    )
    timeout_seconds: float = 5.0


@dataclass(frozen=True)
class Settings:
    supabase: SupabaseConfig = field(default_factory=SupabaseConfig)
    model: ModelConfig = field(default_factory=ModelConfig)
    paths: PathConfig = field(default_factory=PathConfig)
    server: ServerConfig = field(default_factory=ServerConfig)
    dkt: DKTServiceConfig = field(default_factory=DKTServiceConfig)


# Singleton
settings = Settings()
