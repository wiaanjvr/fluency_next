"""
Collaborative Filtering for Cold Start — Configuration.

Reads from environment variables with sensible defaults.
Follows the same pattern as ml.complexity_predictor.config / ml.dkt.config.
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
class ClusteringConfig:
    """Parameters for the K-Means clustering model."""

    # ── Cluster count ────────────────────────────────────────────────────
    n_clusters: int = 20

    # ── User thresholds ──────────────────────────────────────────────────
    min_events_for_training: int = 500  # Only cluster users with 500+ events
    cold_start_threshold: int = 50     # Users with < 50 events get cold start

    # ── Feature weights (for normalisation) ──────────────────────────────
    # Categorical features are one-hot, these control continuous scaling
    cefr_levels: tuple[str, ...] = ("A0", "A1", "A2", "B1", "B2", "C1", "C2")
    goal_categories: tuple[str, ...] = (
        "conversational", "formal", "travel", "business"
    )

    # ── Module sources (must match ModuleSource enum) ────────────────────
    module_sources: tuple[str, ...] = (
        "flashcard", "sentence_build", "listening", "story",
        "conversation", "grammar_drill", "pronunciation", "placement_test",
    )

    # ── Retraining schedule ──────────────────────────────────────────────
    weekly_retrain_day: int = 2  # Wednesday
    retrain_hour: int = 5        # 05:00 UTC
    min_users_for_training: int = 50  # Need at least 50 mature users

    # ── Model stability ──────────────────────────────────────────────────
    random_state: int = 42
    max_iter: int = 300
    n_init: int = 10


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
    def kmeans_model_path(self) -> Path:
        return self.checkpoints_dir / "kmeans_model.joblib"

    @property
    def scaler_path(self) -> Path:
        return self.checkpoints_dir / "feature_scaler.joblib"

    @property
    def cluster_profiles_path(self) -> Path:
        return self.checkpoints_dir / "cluster_profiles.json"

    @property
    def feature_columns_path(self) -> Path:
        return self.checkpoints_dir / "feature_columns.json"


@dataclass(frozen=True)
class ServerConfig:
    host: str = field(
        default_factory=lambda: os.getenv("COLD_START_HOST", "0.0.0.0")
    )
    port: int = field(
        default_factory=lambda: int(os.getenv("COLD_START_PORT", "8600"))
    )
    workers: int = field(
        default_factory=lambda: int(os.getenv("COLD_START_WORKERS", "1"))
    )
    api_key: str = field(
        default_factory=lambda: os.getenv("COLD_START_API_KEY", "")
    )


@dataclass(frozen=True)
class DKTServiceConfig:
    """Configuration for calling the DKT service to derive forgetting curve."""

    url: str = field(
        default_factory=lambda: os.getenv("DKT_SERVICE_URL", "http://localhost:8100")
    )
    api_key: str = field(
        default_factory=lambda: os.getenv("DKT_API_KEY", "")
    )
    timeout_seconds: float = 10.0


@dataclass(frozen=True)
class Settings:
    supabase: SupabaseConfig = field(default_factory=SupabaseConfig)
    clustering: ClusteringConfig = field(default_factory=ClusteringConfig)
    paths: PathConfig = field(default_factory=PathConfig)
    server: ServerConfig = field(default_factory=ServerConfig)
    dkt: DKTServiceConfig = field(default_factory=DKTServiceConfig)


# Singleton
settings = Settings()
