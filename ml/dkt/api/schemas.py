"""
Pydantic schemas for DKT API request/response validation.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Knowledge State ─────────────────────────────────────────────────────────


class KnowledgeStateRequest(BaseModel):
    user_id: str = Field(..., alias="userId", description="UUID of the user")


class WordState(BaseModel):
    word_id: str = Field(..., alias="wordId")
    p_recall: float = Field(..., alias="pRecall", ge=0.0, le=1.0)
    p_forget_48h: float = Field(..., alias="pForget48h", ge=0.0, le=1.0)
    p_forget_7d: float = Field(..., alias="pForget7d", ge=0.0, le=1.0)


class ConceptMastery(BaseModel):
    tag: str
    mastery_score: float = Field(..., alias="masteryScore", ge=0.0, le=1.0)


class KnowledgeStateResponse(BaseModel):
    word_states: list[WordState] = Field(default_factory=list, alias="wordStates")
    concept_mastery: list[ConceptMastery] = Field(
        default_factory=list, alias="conceptMastery"
    )
    event_count: int = Field(..., alias="eventCount")
    using_dkt: bool = Field(..., alias="usingDkt")
    reason: str | None = None

    model_config = {"populate_by_name": True}


# ── Session Prediction ──────────────────────────────────────────────────────


class PredictSessionRequest(BaseModel):
    user_id: str = Field(..., alias="userId")
    planned_words: list[str] = Field(..., alias="plannedWords")


class WordPrediction(BaseModel):
    word_id: str = Field(..., alias="wordId")
    predicted_recall: float = Field(..., alias="predictedRecall", ge=0.0, le=1.0)


class PredictSessionResponse(BaseModel):
    predictions: list[WordPrediction] = []
    using_dkt: bool = Field(..., alias="usingDkt")
    reason: str | None = None

    model_config = {"populate_by_name": True}


# ── Training ────────────────────────────────────────────────────────────────


class TrainRequest(BaseModel):
    mode: str = Field(
        default="full",
        description="'full' for weekly retrain, 'finetune' for daily incremental",
    )
    finetune_days: int = Field(
        default=1,
        alias="finetuneDays",
        ge=1,
        le=30,
    )


class TrainResponse(BaseModel):
    status: str
    best_val_loss: float | None = Field(None, alias="bestValLoss")
    epochs_trained: int | None = Field(None, alias="epochsTrained")
    vocab_size: int | None = Field(None, alias="vocabSize")
    grammar_tag_count: int | None = Field(None, alias="grammarTagCount")

    model_config = {"populate_by_name": True}


# ── Health ──────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool = Field(..., alias="modelLoaded")
    vocab_size: int | None = Field(None, alias="vocabSize")
    device: str | None = None
