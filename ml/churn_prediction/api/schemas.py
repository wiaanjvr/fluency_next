"""
Pydantic schemas for the Churn Prediction & Engagement Rescue API.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Pre-session churn risk ──────────────────────────────────────────────────


class PreSessionRiskRequest(BaseModel):
    user_id: str = Field(
        ...,
        alias="userId",
        description="UUID of the user to assess churn risk for",
    )

    model_config = {"populate_by_name": True}


class PreSessionRiskResponse(BaseModel):
    churn_probability: float = Field(
        ...,
        alias="churnProbability",
        ge=0.0,
        le=1.0,
        description="Probability the user will not start a session today",
    )
    trigger_notification: bool = Field(
        ...,
        alias="triggerNotification",
        description="Whether to send a push notification",
    )
    notification_hook: str | None = Field(
        None,
        alias="notificationHook",
        description="Personalised notification message (if triggered)",
    )
    using_model: bool = Field(
        False,
        alias="usingModel",
        description="Whether the trained model was used (vs heuristic)",
    )
    prediction_id: str | None = Field(
        None,
        alias="predictionId",
        description="ID of the persisted prediction record",
    )

    model_config = {"populate_by_name": True}


# ── Mid-session abandonment risk ────────────────────────────────────────────


class MidSessionRiskRequest(BaseModel):
    user_id: str = Field(
        ...,
        alias="userId",
        description="UUID of the user",
    )
    session_id: str = Field(
        ...,
        alias="sessionId",
        description="UUID of the current session",
    )
    words_completed_so_far: int = Field(
        ...,
        alias="wordsCompletedSoFar",
        ge=0,
        description="Number of words completed so far in this session",
    )

    model_config = {"populate_by_name": True}


class InterventionPayload(BaseModel):
    type: str = Field(
        ...,
        description="Intervention type identifier",
    )
    message: str = Field(
        ...,
        description="User-facing message for the intervention",
    )
    payload: dict = Field(
        default_factory=dict,
        description="Additional intervention parameters",
    )


class MidSessionRiskResponse(BaseModel):
    abandonment_probability: float = Field(
        ...,
        alias="abandonmentProbability",
        ge=0.0,
        le=1.0,
        description="Probability the user will abandon this session",
    )
    recommended_intervention: InterventionPayload | None = Field(
        None,
        alias="recommendedIntervention",
        description="Recommended rescue intervention (if triggered)",
    )
    using_model: bool = Field(
        False,
        alias="usingModel",
        description="Whether the trained model was used (vs heuristic)",
    )
    snapshot_id: str | None = Field(
        None,
        alias="snapshotId",
        description="ID of the persisted snapshot record",
    )

    model_config = {"populate_by_name": True}


# ── Training ────────────────────────────────────────────────────────────────


class TrainRequest(BaseModel):
    model: str = Field(
        default="both",
        description="Which model to train: 'pre_session', 'mid_session', or 'both'",
    )
    force: bool = Field(
        default=False,
        description="Force retrain even if recent model exists",
    )


class TrainResponse(BaseModel):
    status: str
    pre_session: dict | None = Field(
        None,
        alias="preSession",
        description="Pre-session model training results",
    )
    mid_session: dict | None = Field(
        None,
        alias="midSession",
        description="Mid-session model training results",
    )

    model_config = {"populate_by_name": True}


# ── Health ──────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    version: str
    pre_session_model_loaded: bool = Field(..., alias="preSessionModelLoaded")
    mid_session_model_loaded: bool = Field(..., alias="midSessionModelLoaded")

    model_config = {"populate_by_name": True}
