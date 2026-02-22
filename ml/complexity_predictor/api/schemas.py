"""
Pydantic schemas for the Complexity Level Predictor API.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Session Plan ────────────────────────────────────────────────────────────


class SessionPlanRequest(BaseModel):
    user_id: str = Field(..., alias="userId", description="UUID of the user")
    model_config = {"populate_by_name": True}


class SessionPlanResponse(BaseModel):
    complexity_level: int = Field(
        ...,
        alias="complexityLevel",
        ge=1,
        le=5,
        description="Optimal complexity level (1=simple present, 5=complex subordinate clauses)",
    )
    recommended_word_count: int = Field(
        ...,
        alias="recommendedWordCount",
        ge=5,
        le=500,
        description="Recommended number of words for the session",
    )
    recommended_duration_minutes: float = Field(
        ...,
        alias="recommendedDurationMinutes",
        ge=1.0,
        le=60.0,
        description="Recommended session duration in minutes",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model confidence in the prediction",
    )
    using_model: bool = Field(
        False,
        alias="usingModel",
        description="Whether the XGBoost model was used (vs heuristic fallback)",
    )
    features: dict[str, float] = Field(
        default_factory=dict,
        description="Input features used for the prediction (for debugging)",
    )
    plan_id: str | None = Field(
        None,
        alias="planId",
        description="ID of the stored session plan (for audit)",
    )
    reason: str | None = Field(
        None,
        description="Reason for fallback (if usingModel=false)",
    )

    model_config = {"populate_by_name": True}


# ── Training ────────────────────────────────────────────────────────────────


class TrainRequest(BaseModel):
    """Body for the POST /ml/session/train endpoint."""

    force: bool = Field(
        default=False,
        description="Force retrain even if recent model exists",
    )


class TrainResponse(BaseModel):
    status: str
    total_samples: int | None = Field(None, alias="totalSamples")
    train_samples: int | None = Field(None, alias="trainSamples")
    val_samples: int | None = Field(None, alias="valSamples")
    complexity_accuracy: float | None = Field(None, alias="complexityAccuracy")
    complexity_within_1: float | None = Field(None, alias="complexityWithin1")
    word_count_rmse: float | None = Field(None, alias="wordCountRmse")
    training_time_seconds: float | None = Field(None, alias="trainingTimeSeconds")

    model_config = {"populate_by_name": True}


# ── Health ──────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    service: str = "complexity-predictor"
    model_loaded: bool = Field(False, alias="modelLoaded")
    version: str = "0.1.0"

    model_config = {"populate_by_name": True}
