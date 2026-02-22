"""
Pydantic schemas for the RL Module Router API.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Next Activity ───────────────────────────────────────────────────────────


class NextActivityRequest(BaseModel):
    user_id: str = Field(
        ...,
        alias="userId",
        description="UUID of the user",
    )
    last_completed_module: str | None = Field(
        None,
        alias="lastCompletedModule",
        description="Module the user just completed (optional)",
    )
    available_minutes: float | None = Field(
        None,
        alias="availableMinutes",
        ge=0,
        description="How many minutes the user has available (optional, inferred if omitted)",
    )

    model_config = {"populate_by_name": True}


class NextActivityResponse(BaseModel):
    recommended_module: str = Field(
        ...,
        alias="recommendedModule",
        description="The module the user should do next",
    )
    target_words: list[str] = Field(
        default_factory=list,
        alias="targetWords",
        description="Word IDs to target in the recommended module",
    )
    target_concept: str | None = Field(
        None,
        alias="targetConcept",
        description="Grammar concept tag to target (if applicable)",
    )
    reason: str = Field(
        ...,
        description="Human-readable explanation of the recommendation",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Model confidence in this recommendation",
    )
    algorithm: str = Field(
        ...,
        description="Algorithm used: 'cold_start', 'linucb', or 'ppo'",
    )
    decision_id: str | None = Field(
        None,
        alias="decisionId",
        description="ID of the persisted routing decision",
    )

    model_config = {"populate_by_name": True}


# ── Reward Observation ──────────────────────────────────────────────────────


class ObserveRewardRequest(BaseModel):
    decision_id: str = Field(
        ...,
        alias="decisionId",
        description="ID of the routing decision to compute reward for",
    )
    user_id: str = Field(
        ...,
        alias="userId",
        description="UUID of the user",
    )

    model_config = {"populate_by_name": True}


class ObserveRewardResponse(BaseModel):
    reward: float = Field(
        ...,
        description="Computed total reward",
    )
    components: dict[str, float] = Field(
        default_factory=dict,
        description="Breakdown of reward components",
    )
    observation_id: str | None = Field(
        None,
        alias="observationId",
        description="ID of the persisted reward observation",
    )

    model_config = {"populate_by_name": True}


# ── Training ────────────────────────────────────────────────────────────────


class TrainRequest(BaseModel):
    algorithm: str = Field(
        default="bandit",
        description="Which model to train: 'bandit', 'ppo', or 'both'",
    )
    force: bool = Field(
        default=False,
        description="Force retrain even if recent model exists",
    )


class TrainResponse(BaseModel):
    status: str
    algorithm: str
    metrics: dict | None = None

    model_config = {"populate_by_name": True}


# ── Health ──────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    version: str
    bandit_loaded: bool = Field(..., alias="banditLoaded")
    ppo_loaded: bool = Field(..., alias="ppoLoaded")
    active_algorithm: str = Field(..., alias="activeAlgorithm")
    bandit_stats: dict = Field(default_factory=dict, alias="banditStats")
    ppo_stats: dict = Field(default_factory=dict, alias="ppoStats")

    model_config = {"populate_by_name": True}
