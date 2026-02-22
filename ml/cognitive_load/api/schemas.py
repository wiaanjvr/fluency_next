"""
Pydantic schemas for the Cognitive Load Estimator API.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Session lifecycle ────────────────────────────────────────────────────────


class InitSessionRequest(BaseModel):
    session_id: str = Field(..., alias="sessionId")
    user_id: str = Field(..., alias="userId")
    module_source: str = Field(..., alias="moduleSource")

    model_config = {"populate_by_name": True}


class InitSessionResponse(BaseModel):
    status: str = "ok"
    session_id: str = Field(..., alias="sessionId")

    model_config = {"populate_by_name": True}


class EndSessionRequest(BaseModel):
    session_id: str = Field(..., alias="sessionId")

    model_config = {"populate_by_name": True}


class EndSessionResponse(BaseModel):
    status: str = "ok"
    session_id: str = Field(..., alias="sessionId")
    final_cognitive_load: float | None = Field(None, alias="finalCognitiveLoad")

    model_config = {"populate_by_name": True}


# ── Event recording ──────────────────────────────────────────────────────────


class RecordEventRequest(BaseModel):
    session_id: str = Field(..., alias="sessionId")
    word_id: str | None = Field(None, alias="wordId")
    word_status: str | None = Field(None, alias="wordStatus")
    response_time_ms: float | None = Field(None, alias="responseTimeMs")
    sequence: int = 0

    model_config = {"populate_by_name": True}


class RecordEventResponse(BaseModel):
    cognitive_load: float | None = Field(None, alias="cognitiveLoad")

    model_config = {"populate_by_name": True}


# ── Session load query ───────────────────────────────────────────────────────


class SessionLoadResponse(BaseModel):
    """
    GET /ml/cognitive-load/session/{sessionId}

    Matches the spec:
    {
      currentLoad: float,
      trend: "increasing" | "stable" | "decreasing",
      recommendedAction: "continue" | "simplify" | "end-session",
    }
    Plus additional diagnostics.
    """
    current_load: float = Field(..., alias="currentLoad")
    trend: str  # "increasing" | "stable" | "decreasing"
    recommended_action: str = Field(..., alias="recommendedAction")
    event_count: int = Field(0, alias="eventCount")
    consecutive_high_load: int = Field(0, alias="consecutiveHighLoad")
    avg_load: float = Field(0.0, alias="avgLoad")
    recent_loads: list[float] = Field(default_factory=list, alias="recentLoads")

    model_config = {"populate_by_name": True}


# ── Health check ─────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "cognitive-load-estimator"
    active_sessions: int = Field(0, alias="activeSessions")
    version: str = "0.1.0"

    model_config = {"populate_by_name": True}
