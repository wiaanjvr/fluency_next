"""
Cognitive Load Estimator — Configuration.

Reads from environment variables with sensible defaults.
Follows the same pattern as ml.dkt.config.
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
class CognitiveLoadConfig:
    """Thresholds and parameters for cognitive load estimation."""

    # ── Normalisation ────────────────────────────────────────────────────
    # cognitiveLoad = (currentRT - baselineRT) / baselineRT
    # Clamped to [0, 1] where > 0.5 = high cognitive load

    high_load_threshold: float = 0.5
    simplify_threshold: float = 0.6
    break_threshold: float = 0.8
    consecutive_high_load_words: int = 3

    # ── Rolling window for trend detection ───────────────────────────────
    trend_window_size: int = 8  # last N events for trend calculation
    trend_increase_delta: float = 0.05  # slope above this → "increasing"
    trend_decrease_delta: float = -0.05  # slope below this → "decreasing"

    # ── Baseline EMA ─────────────────────────────────────────────────────
    default_baseline_ms: float = 3000.0
    ema_max_sessions: int = 20  # cap N for EMA α = 2 / (N+1)

    # ── Difficulty buckets ───────────────────────────────────────────────
    # Words are bucketed by their status for per-bucket baselines:
    #   new, learning, known, mastered
    # If a user has no bucket-level baseline, fall back to module baseline,
    # then to the global user baseline.
    difficulty_buckets: tuple[str, ...] = ("new", "learning", "known", "mastered")


@dataclass(frozen=True)
class ServerConfig:
    host: str = field(default_factory=lambda: os.getenv("COGNITIVE_LOAD_HOST", "0.0.0.0"))
    port: int = field(
        default_factory=lambda: int(os.getenv("COGNITIVE_LOAD_PORT", "8200"))
    )
    workers: int = field(
        default_factory=lambda: int(os.getenv("COGNITIVE_LOAD_WORKERS", "1"))
    )
    api_key: str = field(
        default_factory=lambda: os.getenv("COGNITIVE_LOAD_API_KEY", "")
    )


@dataclass(frozen=True)
class Settings:
    supabase: SupabaseConfig = field(default_factory=SupabaseConfig)
    cognitive_load: CognitiveLoadConfig = field(default_factory=CognitiveLoadConfig)
    server: ServerConfig = field(default_factory=ServerConfig)


# Singleton
settings = Settings()
