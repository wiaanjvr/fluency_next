"""
LLM Client — Unified interface to multiple LLM providers.

Supports:
  - Google Gemini (default, uses GOOGLE_API_KEY already in .env)
  - OpenAI-compatible APIs
  - Ollama (local)

All providers expose the same `generate()` interface that returns
a plain text string.
"""

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass

import httpx
from loguru import logger

from ..config import settings


@dataclass
class LLMResponse:
    """Structured response from an LLM call."""

    text: str
    provider: str
    model: str
    latency_ms: int
    prompt_tokens: int | None = None
    completion_tokens: int | None = None


class BaseLLMClient(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def generate(self, prompt: str) -> LLMResponse:
        """Generate text from a prompt. Returns LLMResponse."""
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        ...

    @property
    @abstractmethod
    def model_name(self) -> str:
        ...


# ── Google Gemini ───────────────────────────────────────────────────────────


class GeminiClient(BaseLLMClient):
    """Google Gemini via the REST API (generativelanguage.googleapis.com)."""

    def __init__(self) -> None:
        self._api_key = settings.llm.google_api_key
        self._model = settings.llm.google_model
        if not self._api_key:
            raise RuntimeError("GOOGLE_API_KEY is required for Gemini provider")

    @property
    def provider_name(self) -> str:
        return "google"

    @property
    def model_name(self) -> str:
        return self._model

    async def generate(self, prompt: str) -> LLMResponse:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/"
            f"models/{self._model}:generateContent"
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "maxOutputTokens": settings.llm.max_tokens,
                "temperature": settings.llm.temperature,
            },
        }

        start = time.monotonic()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                url,
                json=payload,
                params={"key": self._api_key},
            )
            resp.raise_for_status()

        latency = int((time.monotonic() - start) * 1000)
        data = resp.json()

        # Extract text from Gemini response
        text = ""
        try:
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                text = "".join(p.get("text", "") for p in parts)
        except (KeyError, IndexError):
            logger.warning("Failed to extract text from Gemini response")

        # Token counts (if available)
        usage = data.get("usageMetadata", {})
        return LLMResponse(
            text=text.strip(),
            provider=self.provider_name,
            model=self._model,
            latency_ms=latency,
            prompt_tokens=usage.get("promptTokenCount"),
            completion_tokens=usage.get("candidatesTokenCount"),
        )


# ── OpenAI ──────────────────────────────────────────────────────────────────


class OpenAIClient(BaseLLMClient):
    """OpenAI Chat Completions API (or any compatible provider)."""

    def __init__(self) -> None:
        self._api_key = settings.llm.openai_api_key
        self._model = settings.llm.openai_model
        if not self._api_key:
            raise RuntimeError("OPENAI_API_KEY is required for OpenAI provider")

    @property
    def provider_name(self) -> str:
        return "openai"

    @property
    def model_name(self) -> str:
        return self._model

    async def generate(self, prompt: str) -> LLMResponse:
        url = "https://api.openai.com/v1/chat/completions"
        payload = {
            "model": self._model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": settings.llm.max_tokens,
            "temperature": settings.llm.temperature,
        }

        start = time.monotonic()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {self._api_key}"},
            )
            resp.raise_for_status()

        latency = int((time.monotonic() - start) * 1000)
        data = resp.json()

        text = ""
        try:
            text = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError):
            logger.warning("Failed to extract text from OpenAI response")

        usage = data.get("usage", {})
        return LLMResponse(
            text=text.strip(),
            provider=self.provider_name,
            model=self._model,
            latency_ms=latency,
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
        )


# ── Ollama ──────────────────────────────────────────────────────────────────


class OllamaClient(BaseLLMClient):
    """Ollama local LLM via its REST API."""

    def __init__(self) -> None:
        self._base_url = settings.llm.ollama_base_url
        self._model = settings.llm.ollama_model

    @property
    def provider_name(self) -> str:
        return "ollama"

    @property
    def model_name(self) -> str:
        return self._model

    async def generate(self, prompt: str) -> LLMResponse:
        url = f"{self._base_url}/api/generate"
        payload = {
            "model": self._model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": settings.llm.max_tokens,
                "temperature": settings.llm.temperature,
            },
        }

        start = time.monotonic()
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()

        latency = int((time.monotonic() - start) * 1000)
        data = resp.json()

        return LLMResponse(
            text=data.get("response", "").strip(),
            provider=self.provider_name,
            model=self._model,
            latency_ms=latency,
        )


# ── Factory ─────────────────────────────────────────────────────────────────


_client_instance: BaseLLMClient | None = None


def get_llm_client() -> BaseLLMClient:
    """
    Get the configured LLM client singleton.
    Provider is determined by FEEDBACK_LLM_PROVIDER env var.
    """
    global _client_instance
    if _client_instance is not None:
        return _client_instance

    provider = settings.llm.provider.lower()
    if provider == "google":
        _client_instance = GeminiClient()
    elif provider == "openai":
        _client_instance = OpenAIClient()
    elif provider == "ollama":
        _client_instance = OllamaClient()
    else:
        raise ValueError(
            f"Unknown LLM provider: {provider}. "
            f"Supported: google, openai, ollama"
        )

    logger.info(
        f"LLM client initialised: provider={provider}, "
        f"model={_client_instance.model_name}"
    )
    return _client_instance
