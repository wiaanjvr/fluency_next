"""
FastAPI routes for the Story Word Selector service.

Endpoints:
  POST /ml/story/select-words       — adaptive word selection for story generation
  POST /ml/story/update-preferences  — update user topic prefs after a session
  POST /ml/story/init-preferences    — initialize topic prefs at signup
  GET  /ml/story/topics              — list available topic tags
  GET  /ml/story/health              — health check
"""

from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException, Header
from loguru import logger

from ml.shared.cache import prediction_cache
from ml.shared.prediction_log import log_prediction, timed
from .. import __version__
from ..config import settings
from ..data.supabase_client import upsert_topic_preferences
from ..engine.selector import select_story_words, update_user_preferences_after_session
from ..engine.thematic_embeddings import (
    TOPIC_TAXONOMY,
    build_initial_preference_vector,
)
from .schemas import (
    HealthResponse,
    InitPreferencesRequest,
    InitPreferencesResponse,
    SelectWordsDebug,
    SelectWordsRequest,
    SelectWordsResponse,
    TopicInfo,
    TopicTaxonomyResponse,
    UpdatePreferencesRequest,
    UpdatePreferencesResponse,
)

router = APIRouter(prefix="/ml/story", tags=["story-word-selector"])


# ── Auth dependency ─────────────────────────────────────────────────────────


async def verify_api_key(x_api_key: str = Header(default="")) -> None:
    """
    Simple shared-secret auth for service-to-service calls.
    If STORY_SELECTOR_API_KEY is not configured, authentication is skipped (dev mode).
    """
    expected = settings.server.api_key
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ── Select words ────────────────────────────────────────────────────────────


@router.post(
    "/select-words",
    response_model=SelectWordsResponse,
    dependencies=[Depends(verify_api_key)],
)
async def select_words(req: SelectWordsRequest) -> SelectWordsResponse:
    """
    ML-informed word selection for story generation.

    Input: userId, targetWordCount, storyComplexityLevel
    Output: { dueWords: wordId[], knownFillWords: wordId[], thematicBias: topicTag[] }
    """
    # ── Cache (30-min TTL — word selection can change as user does activities) ─
    _extra = f"{req.target_word_count}:{req.story_complexity_level}"
    cached = prediction_cache.get("story", "select-words", req.user_id, extra=_extra)
    if cached is not None:
        logger.debug(f"select_words cache HIT for {req.user_id[:8]}…")
        return SelectWordsResponse(**cached)

    try:
        with timed() as t:
            result = await select_story_words(
                user_id=req.user_id,
                target_word_count=req.target_word_count,
                story_complexity_level=req.story_complexity_level,
                language=req.language,
            )
    except Exception as exc:
        logger.exception("select_words failed")
        raise HTTPException(status_code=500, detail=str(exc))

    debug = None
    if result.debug_info:
        debug = SelectWordsDebug(
            total_user_words=result.debug_info.get("total_user_words", 0),
            due_pool_size=result.debug_info.get("due_pool_size", 0),
            known_pool_size=result.debug_info.get("known_pool_size", 0),
            dkt_coverage=result.debug_info.get("dkt_coverage", 0),
            max_due_allowed=result.debug_info.get("max_due_allowed", 0),
            selected_due_count=result.debug_info.get("selected_due_count", 0),
            selected_known_count=result.debug_info.get("selected_known_count", 0),
            known_percentage=result.debug_info.get("known_percentage", 0.0),
        )

    response = SelectWordsResponse(
        due_words=result.due_words,
        known_fill_words=result.known_fill_words,
        thematic_bias=result.thematic_bias,
        debug=debug,
    )

    prediction_cache.set(
        "story", "select-words", req.user_id, response.model_dump(),
        extra=_extra, ttl=1800  # 30-minute TTL
    )

    log_prediction(
        service="story", endpoint="select-words",
        user_id=req.user_id,
        inputs={"target_word_count": req.target_word_count,
                "story_complexity_level": req.story_complexity_level,
                "language": req.language},
        outputs={"due_word_count": len(result.due_words),
                 "known_fill_count": len(result.known_fill_words),
                 "thematic_bias": result.thematic_bias},
        latency_ms=t.latency_ms,
    )

    return response


# ── Update preferences (after session) ─────────────────────────────────────


@router.post(
    "/update-preferences",
    response_model=UpdatePreferencesResponse,
    dependencies=[Depends(verify_api_key)],
)
async def update_preferences(
    req: UpdatePreferencesRequest,
) -> UpdatePreferencesResponse:
    """
    Update the user's thematic preferences after a story session.
    Uses time-on-segment as an engagement proxy to shift the topic embedding.
    """
    try:
        await update_user_preferences_after_session(
            user_id=req.user_id,
            story_topic_tags=req.story_topic_tags,
            time_on_segment_ms=req.time_on_segment_ms,
            story_id=req.story_id,
        )
    except Exception as exc:
        logger.exception("update_preferences failed")
        raise HTTPException(status_code=500, detail=str(exc))

    return UpdatePreferencesResponse(status="ok")


# ── Initialize preferences (at signup) ─────────────────────────────────────


@router.post(
    "/init-preferences",
    response_model=InitPreferencesResponse,
    dependencies=[Depends(verify_api_key)],
)
async def init_preferences(
    req: InitPreferencesRequest,
) -> InitPreferencesResponse:
    """
    Initialize topic preferences when user selects 3 interests at signup.
    Builds the initial 16-dim preference vector from the selected topics.
    """
    try:
        vec = build_initial_preference_vector(req.selected_topics)

        upsert_topic_preferences(
            user_id=req.user_id,
            preference_vector=vec.tolist(),
            selected_topics=req.selected_topics,
            topic_engagement={},
        )

        return InitPreferencesResponse(
            status="ok",
            preference_vector=vec.tolist(),
            selected_topics=req.selected_topics,
        )
    except Exception as exc:
        logger.exception("init_preferences failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Topic taxonomy ──────────────────────────────────────────────────────────


@router.get("/topics", response_model=TopicTaxonomyResponse)
async def list_topics() -> TopicTaxonomyResponse:
    """Return all available topic tags for the signup selector UI."""
    topics = [
        TopicInfo(tag=tag, label=info["label"])
        for tag, info in TOPIC_TAXONOMY.items()
    ]
    return TopicTaxonomyResponse(topics=topics)


# ── Health ──────────────────────────────────────────────────────────────────


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Health check — also probes the DKT service."""
    dkt_ok = False
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.dkt.base_url}/ml/dkt/health")
            dkt_ok = resp.status_code == 200
    except Exception:
        pass

    return HealthResponse(
        status="healthy",
        version=__version__,
        dkt_reachable=dkt_ok,
    )
