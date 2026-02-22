"""
Pydantic schemas for the Cold Start Collaborative Filtering API.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Assign Cluster ──────────────────────────────────────────────────────────


class AssignClusterRequest(BaseModel):
    native_language: str = Field(
        ...,
        alias="nativeLanguage",
        description="User's native language (e.g. 'en', 'pt', 'zu')",
    )
    target_language: str = Field(
        ...,
        alias="targetLanguage",
        description="Language the user wants to learn",
    )
    cefr_level: str = Field(
        ...,
        alias="cefrLevel",
        description="Self-assessed CEFR level (A0–C2)",
    )
    goals: list[str] = Field(
        ...,
        description="Learning goals: conversational, formal, travel, business",
    )
    user_id: str | None = Field(
        None,
        alias="userId",
        description="Optional user UUID — if provided, assignment is persisted",
    )

    model_config = {"populate_by_name": True}


class AssignClusterResponse(BaseModel):
    cluster_id: int = Field(..., alias="clusterId")
    recommended_path: list[str] = Field(
        ...,
        alias="recommendedPath",
        description="Ordered module sequence for this learner type",
    )
    default_complexity_level: int = Field(
        ...,
        alias="defaultComplexityLevel",
        ge=1,
        le=5,
    )
    estimated_vocab_start: str = Field(
        ...,
        alias="estimatedVocabStart",
        description="Starting vocabulary frequency band (e.g. top_1000)",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Assignment confidence (distance-based, 0–1)",
    )
    recommended_module_weights: dict[str, float] = Field(
        default_factory=dict,
        alias="recommendedModuleWeights",
        description="Module name → recommended weight",
    )
    assignment_id: str | None = Field(
        None,
        alias="assignmentId",
        description="Persisted assignment ID (if userId was provided)",
    )
    using_model: bool = Field(
        False,
        alias="usingModel",
        description="Whether the trained K-Means model was used (vs heuristic)",
    )

    model_config = {"populate_by_name": True}


# ── Check / Graduate ────────────────────────────────────────────────────────


class CheckGraduationRequest(BaseModel):
    user_id: str = Field(..., alias="userId")

    model_config = {"populate_by_name": True}


class CheckGraduationResponse(BaseModel):
    user_id: str = Field(..., alias="userId")
    event_count: int = Field(..., alias="eventCount")
    threshold: int
    should_graduate: bool = Field(..., alias="shouldGraduate")
    current_cluster_id: int | None = Field(None, alias="currentClusterId")
    graduated: bool = Field(
        False,
        description="Whether graduation was performed in this request",
    )

    model_config = {"populate_by_name": True}


# ── Training ────────────────────────────────────────────────────────────────


class TrainRequest(BaseModel):
    force: bool = Field(
        default=False,
        description="Force retrain even if recent model exists",
    )


class TrainResponse(BaseModel):
    status: str
    n_users: int | None = Field(None, alias="nUsers")
    n_features: int | None = Field(None, alias="nFeatures")
    n_clusters: int | None = Field(None, alias="nClusters")
    inertia: float | None = None
    cluster_sizes: dict[str, int] | None = Field(None, alias="clusterSizes")
    training_time_seconds: float | None = Field(None, alias="trainingTimeSeconds")

    model_config = {"populate_by_name": True}


# ── Health ──────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    service: str = "cold-start"
    model_loaded: bool = Field(False, alias="modelLoaded")
    n_clusters: int = Field(0, alias="nClusters")
    version: str = "0.1.0"

    model_config = {"populate_by_name": True}
