"""
Story Word Selector service configuration.

Reads from environment variables with sensible defaults.
Follows the same pattern as ml/dkt/config.py and ml/cognitive_load/config.py.
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
class DKTClientConfig:
    """Config for calling the DKT service to get forgetting probabilities."""
    base_url: str = field(
        default_factory=lambda: os.getenv("DKT_BASE_URL", "http://localhost:8100")
    )
    api_key: str = field(
        default_factory=lambda: os.getenv("DKT_API_KEY", "")
    )
    timeout_seconds: float = 10.0


@dataclass(frozen=True)
class ScoringConfig:
    """Weights and parameters for the storyScore() ranking function."""

    # ── Primary scoring weights (must sum to 1.0) ──
    w_forget: float = 0.4          # DKT forgetting risk
    w_recency_penalty: float = 0.2  # penalize words seen in last 2 sessions
    w_production_gap: float = 0.2   # gap between recognition & production
    w_module_variety: float = 0.1   # bonus if not seen in story mode recently
    w_thematic: float = 0.1         # match to user topic preferences

    # ── Sub-parameters ──
    recency_session_window: int = 2           # number of recent sessions to penalize
    story_recency_days: int = 7               # look-back window for story-mode variety
    max_new_word_ratio: float = 0.05          # 95% known constraint
    min_new_words: int = 1                    # always introduce at least 1 new word

    # ── Thematic embedding ──
    topic_embedding_dim: int = 16             # dimension of topic preference vector
    engagement_decay: float = 0.95            # EMA decay for topic engagement updates


@dataclass(frozen=True)
class ServerConfig:
    host: str = field(default_factory=lambda: os.getenv("STORY_SELECTOR_HOST", "0.0.0.0"))
    port: int = field(
        default_factory=lambda: int(os.getenv("STORY_SELECTOR_PORT", "8300"))
    )
    workers: int = field(
        default_factory=lambda: int(os.getenv("STORY_SELECTOR_WORKERS", "1"))
    )
    api_key: str = field(
        default_factory=lambda: os.getenv("STORY_SELECTOR_API_KEY", "")
    )


@dataclass(frozen=True)
class PathConfig:
    base_dir: Path = field(
        default_factory=lambda: Path(__file__).resolve().parent
    )

    @property
    def topic_embeddings_path(self) -> Path:
        d = self.base_dir / "data"
        d.mkdir(parents=True, exist_ok=True)
        return d / "topic_embeddings.json"


@dataclass(frozen=True)
class Settings:
    supabase: SupabaseConfig = field(default_factory=SupabaseConfig)
    dkt: DKTClientConfig = field(default_factory=DKTClientConfig)
    scoring: ScoringConfig = field(default_factory=ScoringConfig)
    server: ServerConfig = field(default_factory=ServerConfig)
    paths: PathConfig = field(default_factory=PathConfig)


# Singleton
settings = Settings()
