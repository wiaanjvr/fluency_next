"""
Pydantic schemas for the LLM Feedback Generator API.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Explain ─────────────────────────────────────────────────────────────────


class ExplainRequest(BaseModel):
    user_id: str = Field(..., alias="userId", description="UUID of the user")
    word_id: str = Field(..., alias="wordId", description="UUID of the user_word")
    session_id: str = Field(..., alias="sessionId", description="UUID of the current session")
    force: bool = Field(
        default=False,
        description="Force generation even if trigger conditions are not met",
    )
    model_config = {"populate_by_name": True}


class ExplainResponse(BaseModel):
    explanation: str = Field(
        ...,
        description="Personalized 2-3 sentence explanation of the word error",
    )
    example_sentence: str = Field(
        "",
        alias="exampleSentence",
        description="Example sentence using vocabulary at the learner's level",
    )
    pattern_detected: str = Field(
        ...,
        alias="patternDetected",
        description=(
            "Detected error pattern: production_gap, contextualization, "
            "slow_recognition, general_difficulty, or early_learning"
        ),
    )
    pattern_description: str = Field(
        "",
        alias="patternDescription",
        description="Human-readable description of the detected pattern",
    )
    pattern_confidence: float = Field(
        0.0,
        alias="patternConfidence",
        ge=0.0,
        le=1.0,
        description="Confidence in the pattern detection (0-1)",
    )
    trigger_reason: str = Field(
        "",
        alias="triggerReason",
        description="Why feedback was (or wasn't) triggered",
    )
    triggered: bool = Field(
        True,
        description="Whether the trigger conditions were met",
    )
    cached: bool = Field(
        False,
        description="Whether this response came from cache",
    )
    llm_provider: str = Field(
        "",
        alias="llmProvider",
        description="LLM provider used (google, openai, ollama)",
    )
    llm_model: str = Field(
        "",
        alias="llmModel",
        description="Specific model used",
    )
    latency_ms: int = Field(
        0,
        alias="latencyMs",
        ge=0,
        description="LLM call latency in milliseconds",
    )
    model_config = {"populate_by_name": True}


# ── Grammar Examples ────────────────────────────────────────────────────────


class GrammarExamplesRequest(BaseModel):
    user_id: str = Field(..., alias="userId", description="UUID of the user")
    grammar_concept_tag: str = Field(
        ...,
        alias="grammarConceptTag",
        description="Grammar concept tag (e.g. 'passé_composé', 'subjunctive')",
    )
    known_word_ids: list[str] = Field(
        default_factory=list,
        alias="knownWordIds",
        description=(
            "Optional list of word IDs the user knows. If empty, "
            "the service fetches the user's known vocabulary automatically."
        ),
    )
    model_config = {"populate_by_name": True}


class GrammarExamplesResponse(BaseModel):
    sentences: list[str] = Field(
        ...,
        description="3 example sentences demonstrating the grammar concept",
    )
    grammar_concept: str = Field(
        ...,
        alias="grammarConcept",
        description="The grammar concept tag that was used",
    )
    llm_provider: str = Field(
        "",
        alias="llmProvider",
        description="LLM provider used",
    )
    llm_model: str = Field(
        "",
        alias="llmModel",
        description="Specific model used",
    )
    latency_ms: int = Field(
        0,
        alias="latencyMs",
        ge=0,
        description="LLM call latency in milliseconds",
    )
    model_config = {"populate_by_name": True}


# ── Health ──────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    service: str = "feedback-generator"
    llm_provider: str = Field("", alias="llmProvider")
    llm_model: str = Field("", alias="llmModel")
    version: str = "0.1.0"
    model_config = {"populate_by_name": True}
