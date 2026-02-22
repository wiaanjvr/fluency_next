"""
DKT service configuration.

Reads from environment variables with sensible defaults.
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
    # --- Embedding dims ---
    word_embed_dim: int = 64
    grammar_tag_count: int = 32  # max distinct grammar tags; padded
    module_source_count: int = 8
    input_mode_count: int = 4

    # --- Transformer architecture ---
    d_model: int = 128
    nhead: int = 4
    num_layers: int = 4
    dim_feedforward: int = 256
    dropout: float = 0.1
    max_seq_len: int = 512

    # --- Output heads ---
    forecast_horizons_hours: tuple[float, ...] = (48.0, 168.0)  # 48h, 7d

    # --- Training ---
    batch_size: int = 32
    learning_rate: float = 3e-4
    weight_decay: float = 1e-5
    max_epochs: int = 30
    patience: int = 5  # early stopping
    min_events_for_dkt: int = 50  # FSRS used below this threshold

    # --- Retraining schedule ---
    weekly_retrain_day: int = 0  # Monday
    daily_finetune_hour: int = 3  # 03:00 UTC


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
        return self.checkpoints_dir / "dkt_best.pt"

    @property
    def finetune_model_path(self) -> Path:
        return self.checkpoints_dir / "dkt_finetune.pt"

    @property
    def vocab_map_path(self) -> Path:
        return self.checkpoints_dir / "vocab_map.json"

    @property
    def grammar_tag_map_path(self) -> Path:
        return self.checkpoints_dir / "grammar_tag_map.json"


@dataclass(frozen=True)
class ServerConfig:
    host: str = field(default_factory=lambda: os.getenv("DKT_HOST", "0.0.0.0"))
    port: int = field(
        default_factory=lambda: int(os.getenv("DKT_PORT", "8100"))
    )
    workers: int = field(
        default_factory=lambda: int(os.getenv("DKT_WORKERS", "1"))
    )
    # Shared secret so the Next.js backend can call us
    api_key: str = field(
        default_factory=lambda: os.getenv("DKT_API_KEY", "")
    )


@dataclass(frozen=True)
class Settings:
    supabase: SupabaseConfig = field(default_factory=SupabaseConfig)
    model: ModelConfig = field(default_factory=ModelConfig)
    paths: PathConfig = field(default_factory=PathConfig)
    server: ServerConfig = field(default_factory=ServerConfig)


# Singleton
settings = Settings()
