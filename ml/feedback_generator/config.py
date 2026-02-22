"""
LLM Feedback Generator — Configuration.

Reads from environment variables with sensible defaults.
Follows the same pattern as ml.cognitive_load.config / ml.dkt.config /
ml.complexity_predictor.config.
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
class LLMConfig:
    """Parameters for the LLM provider."""

    # ── Provider ─────────────────────────────────────────────────────────
    # Supported: "google" (Gemini), "openai", "ollama"
    provider: str = field(
        default_factory=lambda: os.getenv("FEEDBACK_LLM_PROVIDER", "google")
    )

    # ── Google Gemini ────────────────────────────────────────────────────
    google_api_key: str = field(
        default_factory=lambda: os.getenv("GOOGLE_API_KEY", "")
    )
    google_model: str = field(
        default_factory=lambda: os.getenv("FEEDBACK_GOOGLE_MODEL", "gemini-2.0-flash")
    )

    # ── OpenAI ───────────────────────────────────────────────────────────
    openai_api_key: str = field(
        default_factory=lambda: os.getenv("OPENAI_API_KEY", "")
    )
    openai_model: str = field(
        default_factory=lambda: os.getenv("FEEDBACK_OPENAI_MODEL", "gpt-4o-mini")
    )

    # ── Ollama (local) ───────────────────────────────────────────────────
    ollama_base_url: str = field(
        default_factory=lambda: os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    )
    ollama_model: str = field(
        default_factory=lambda: os.getenv("FEEDBACK_OLLAMA_MODEL", "llama3.1:8b")
    )

    # ── Generation parameters ────────────────────────────────────────────
    max_tokens: int = 300
    temperature: float = 0.7

    # ── Rate limiting ────────────────────────────────────────────────────
    max_calls_per_user_per_hour: int = 10
    max_calls_per_user_per_session: int = 3


@dataclass(frozen=True)
class TriggerConfig:
    """Trigger thresholds for firing feedback explanations."""

    # Same word wrong N+ times in one session
    session_error_repeat_threshold: int = 2

    # Word has high exposure but low recognition
    exposure_count_threshold: int = 5
    recognition_score_threshold: float = 0.4


@dataclass(frozen=True)
class PathConfig:
    base_dir: Path = field(
        default_factory=lambda: Path(__file__).resolve().parent
    )

    @property
    def logs_dir(self) -> Path:
        d = self.base_dir / "logs"
        d.mkdir(parents=True, exist_ok=True)
        return d

    @property
    def cache_dir(self) -> Path:
        d = self.base_dir / "cache"
        d.mkdir(parents=True, exist_ok=True)
        return d


@dataclass(frozen=True)
class ServerConfig:
    host: str = field(
        default_factory=lambda: os.getenv("FEEDBACK_GENERATOR_HOST", "0.0.0.0")
    )
    port: int = field(
        default_factory=lambda: int(os.getenv("FEEDBACK_GENERATOR_PORT", "8500"))
    )
    workers: int = field(
        default_factory=lambda: int(os.getenv("FEEDBACK_GENERATOR_WORKERS", "1"))
    )
    api_key: str = field(
        default_factory=lambda: os.getenv("FEEDBACK_GENERATOR_API_KEY", "")
    )


@dataclass(frozen=True)
class Settings:
    supabase: SupabaseConfig = field(default_factory=SupabaseConfig)
    llm: LLMConfig = field(default_factory=LLMConfig)
    triggers: TriggerConfig = field(default_factory=TriggerConfig)
    paths: PathConfig = field(default_factory=PathConfig)
    server: ServerConfig = field(default_factory=ServerConfig)


# Singleton
settings = Settings()
