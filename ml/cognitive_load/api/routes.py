"""
FastAPI routes for the Cognitive Load Estimator.

Endpoints:
  POST /ml/cognitive-load/session/init     — initialise session tracking
  POST /ml/cognitive-load/session/event    — record a single event
  GET  /ml/cognitive-load/session/{id}     — current session load snapshot
  POST /ml/cognitive-load/session/end      — end session & persist load
  GET  /ml/cognitive-load/health           — health check
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from loguru import logger

from ml.shared.prediction_log import log_prediction
from ..config import settings
from ..engine import estimator
from ..data.supabase_client import (
    get_user_baseline,
    get_module_baselines,
    get_difficulty_bucket_baselines,
    get_session_events,
    get_session_summary,
    get_word_statuses,
    update_session_cognitive_load,
)
from .schemas import (
    EndSessionRequest,
    EndSessionResponse,
    HealthResponse,
    InitSessionRequest,
    InitSessionResponse,
    RecordEventRequest,
    RecordEventResponse,
    SessionLoadResponse,
)

router = APIRouter(prefix="/ml/cognitive-load", tags=["cognitive-load"])


# ── Auth dependency ──────────────────────────────────────────────────────────


async def verify_api_key(x_api_key: str = Header(default="")) -> None:
    """Simple shared-secret auth for service-to-service calls."""
    expected = settings.server.api_key
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ── Initialise session ───────────────────────────────────────────────────────


@router.post(
    "/session/init",
    response_model=InitSessionResponse,
    dependencies=[Depends(verify_api_key)],
)
async def init_session(req: InitSessionRequest) -> InitSessionResponse:
    """
    Initialise cognitive load tracking for a new session.

    Loads the user's personalised baselines (global, per-module,
    per-module+bucket) from the DB and starts the in-memory tracker.
    """
    try:
        # Fetch baselines from DB
        user_bl = get_user_baseline(req.user_id)
        mod_bls = get_module_baselines(req.user_id)
        bucket_bls = get_difficulty_bucket_baselines(req.user_id)

        estimator.init_session(
            session_id=req.session_id,
            user_id=req.user_id,
            module_source=req.module_source,
            user_baseline_ms=user_bl["avg_response_time_ms"],
            module_baselines=mod_bls,
            bucket_baselines=bucket_bls,
        )
    except Exception as exc:
        logger.exception("Failed to initialise session")
        raise HTTPException(status_code=500, detail=str(exc))

    return InitSessionResponse(session_id=req.session_id)


# ── Record event ─────────────────────────────────────────────────────────────


@router.post(
    "/session/event",
    response_model=RecordEventResponse,
    dependencies=[Depends(verify_api_key)],
)
async def record_event(req: RecordEventRequest) -> RecordEventResponse:
    """
    Record a single interaction event and return its instantaneous
    cognitive load score.

    If the session was not initialised via /session/init, this is a no-op
    and returns cognitiveLoad=null. This allows the main app to fire-and-
    forget without strict ordering.
    """
    load = estimator.record_event(
        session_id=req.session_id,
        word_id=req.word_id,
        word_status=req.word_status,
        response_time_ms=req.response_time_ms,
        sequence=req.sequence,
    )
    return RecordEventResponse(cognitive_load=load)


# ── Get session load ─────────────────────────────────────────────────────────


@router.get(
    "/session/{session_id}",
    response_model=SessionLoadResponse,
    dependencies=[Depends(verify_api_key)],
)
async def get_session_load(session_id: str) -> SessionLoadResponse:
    """
    Get the current cognitive load snapshot for an active session.

    This is the **primary integration endpoint** consumed by:
    - Story engine (before generating each new segment)
    - Frontend (to show load indicator / break prompt)

    Response:
    ```json
    {
      "currentLoad": 0.42,
      "trend": "increasing",
      "recommendedAction": "continue",
      "eventCount": 15,
      "consecutiveHighLoad": 0,
      "avgLoad": 0.35,
      "recentLoads": [0.3, 0.35, 0.4, 0.42]
    }
    ```
    """
    result = estimator.get_session_load(session_id)

    if result is None:
        # Session not tracked in-memory — try to reconstruct from DB
        result = await _reconstruct_from_db(session_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Session {session_id} not found or has no events",
        )

    return SessionLoadResponse(**result)


async def _reconstruct_from_db(session_id: str) -> dict | None:
    """
    Fallback: if the session is not in memory (e.g. after a service
    restart), reconstruct the load estimate from persisted events.
    """
    summary = get_session_summary(session_id)
    if summary is None:
        return None

    events = get_session_events(session_id)
    if not events:
        return {
            "currentLoad": 0.0,
            "trend": "stable",
            "recommendedAction": "continue",
            "eventCount": 0,
            "consecutiveHighLoad": 0,
            "avgLoad": 0.0,
            "recentLoads": [],
        }

    user_id = summary["user_id"]
    module_source = summary["module_source"]

    # Re-initialise the session in-memory
    user_bl = get_user_baseline(user_id)
    mod_bls = get_module_baselines(user_id)
    bucket_bls = get_difficulty_bucket_baselines(user_id)

    estimator.init_session(
        session_id=session_id,
        user_id=user_id,
        module_source=module_source,
        user_baseline_ms=user_bl["avg_response_time_ms"],
        module_baselines=mod_bls,
        bucket_baselines=bucket_bls,
    )

    # Fetch word statuses for all events
    word_ids = [e["word_id"] for e in events if e.get("word_id")]
    statuses = get_word_statuses(user_id, word_ids) if word_ids else {}

    # Replay events
    for ev in events:
        estimator.record_event(
            session_id=session_id,
            word_id=ev.get("word_id"),
            word_status=statuses.get(ev.get("word_id", ""), None),
            response_time_ms=ev.get("response_time_ms"),
            sequence=ev.get("session_sequence_number", 0),
        )

    return estimator.get_session_load(session_id)


# ── End session ──────────────────────────────────────────────────────────────


@router.post(
    "/session/end",
    response_model=EndSessionResponse,
    dependencies=[Depends(verify_api_key)],
)
async def end_session(req: EndSessionRequest) -> EndSessionResponse:
    """
    Finalise cognitive load tracking for a session.

    Computes the final average cognitive load, persists it to the
    session_summaries table, and cleans up in-memory state.
    """
    # Capture user_id before end_session pops the session from memory
    _pre_state = estimator._sessions.get(req.session_id)
    _user_id = _pre_state.user_id if _pre_state else "unknown"

    final_load = estimator.end_session(req.session_id)

    if final_load is not None:
        try:
            update_session_cognitive_load(req.session_id, final_load)
        except Exception as exc:
            logger.warning(
                f"Failed to persist cognitive load for {req.session_id}: {exc}"
            )

    log_prediction(
        service="cognitive_load", endpoint="session-end",
        user_id=_user_id,
        inputs={"session_id": req.session_id},
        outputs={"final_cognitive_load": final_load},
    )

    return EndSessionResponse(
        session_id=req.session_id,
        final_cognitive_load=final_load,
    )


# ── Health check ─────────────────────────────────────────────────────────────


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        active_sessions=len(estimator._sessions),
    )
