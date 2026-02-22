"""
Pydantic schemas for the Story Word Selector API.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Select Words ────────────────────────────────────────────────────────────


class SelectWordsRequest(BaseModel):
    user_id: str = Field(..., alias="userId", description="UUID of the user")
    target_word_count: int = Field(
        ...,
        alias="targetWordCount",
        ge=5,
        le=500,
        description="Total distinct words the story should contain",
    )
    story_complexity_level: int = Field(
        default=1,
        alias="storyComplexityLevel",
        ge=1,
        le=5,
        description="1-5 scale. Higher = more varied vocabulary",
    )
    language: str = Field(default="fr", description="Target language code")

    model_config = {"populate_by_name": True}


class SelectWordsResponse(BaseModel):
    due_words: list[str] = Field(
        ...,
        alias="dueWords",
        description="Word IDs selected from the due/new pool (≤5% of total)",
    )
    known_fill_words: list[str] = Field(
        ...,
        alias="knownFillWords",
        description="Word IDs from the known pool filling ≥95% of story",
    )
    thematic_bias: list[str] = Field(
        ...,
        alias="thematicBias",
        description="Top topic tags aligned with user preferences",
    )
    debug: SelectWordsDebug | None = None

    model_config = {"populate_by_name": True}


class SelectWordsDebug(BaseModel):
    total_user_words: int = Field(0, alias="totalUserWords")
    due_pool_size: int = Field(0, alias="duePoolSize")
    known_pool_size: int = Field(0, alias="knownPoolSize")
    dkt_coverage: int = Field(0, alias="dktCoverage")
    max_due_allowed: int = Field(0, alias="maxDueAllowed")
    selected_due_count: int = Field(0, alias="selectedDueCount")
    selected_known_count: int = Field(0, alias="selectedKnownCount")
    known_percentage: float = Field(0.0, alias="knownPercentage")

    model_config = {"populate_by_name": True}


# ── Update Preferences ─────────────────────────────────────────────────────


class UpdatePreferencesRequest(BaseModel):
    user_id: str = Field(..., alias="userId")
    story_topic_tags: list[str] = Field(..., alias="storyTopicTags")
    time_on_segment_ms: int = Field(..., alias="timeOnSegmentMs", ge=0)
    story_id: str | None = Field(None, alias="storyId")

    model_config = {"populate_by_name": True}


class UpdatePreferencesResponse(BaseModel):
    status: str = "ok"


# ── Initialize Preferences ─────────────────────────────────────────────────


class InitPreferencesRequest(BaseModel):
    user_id: str = Field(..., alias="userId")
    selected_topics: list[str] = Field(
        ...,
        alias="selectedTopics",
        min_length=1,
        max_length=5,
        description="Topic tags selected by user at signup",
    )

    model_config = {"populate_by_name": True}


class InitPreferencesResponse(BaseModel):
    status: str = "ok"
    preference_vector: list[float] = Field(..., alias="preferenceVector")
    selected_topics: list[str] = Field(..., alias="selectedTopics")

    model_config = {"populate_by_name": True}


# ── Topic Taxonomy ──────────────────────────────────────────────────────────


class TopicInfo(BaseModel):
    tag: str
    label: str


class TopicTaxonomyResponse(BaseModel):
    topics: list[TopicInfo]


# ── Health ──────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    version: str
    dkt_reachable: bool = Field(..., alias="dktReachable")

    model_config = {"populate_by_name": True}
