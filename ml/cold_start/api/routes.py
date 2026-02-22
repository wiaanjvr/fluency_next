"""
FastAPI routes for Cold Start Collaborative Filtering.

Endpoints:
  POST /ml/coldstart/assign-cluster  — assign new user to nearest cluster
  POST /ml/coldstart/check-graduation — check if user should graduate from cold start
  POST /ml/coldstart/train            — trigger clustering model training (admin)
  GET  /ml/coldstart/health           — health check
"""

from __future__ import annotations

import time

from fastapi import APIRouter, Depends, Header, HTTPException
from loguru import logger

from ml.shared.cache import prediction_cache
from ml.shared.prediction_log import log_prediction, timed
from ..config import settings
from ..data.supabase_client import (
    deactivate_assignment,
    fetch_mature_users,
    fetch_user_event_count,
    get_user_active_assignment,
    save_cluster_assignment,
)
from ..model.clustering import cluster_model, heuristic_assignment
from .schemas import (
    AssignClusterRequest,
    AssignClusterResponse,
    CheckGraduationRequest,
    CheckGraduationResponse,
    HealthResponse,
    TrainRequest,
    TrainResponse,
)

router = APIRouter(prefix="/ml/coldstart", tags=["cold-start"])


# ── Auth dependency ─────────────────────────────────────────────────────────


async def verify_api_key(x_api_key: str = Header(default="")) -> None:
    """
    Simple shared-secret auth for service-to-service calls.
    If COLD_START_API_KEY is not configured, authentication is
    skipped (dev mode).
    """
    expected = settings.server.api_key
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ── Assign cluster ──────────────────────────────────────────────────────────


@router.post(
    "/assign-cluster",
    response_model=AssignClusterResponse,
    dependencies=[Depends(verify_api_key)],
)
async def assign_cluster(req: AssignClusterRequest) -> AssignClusterResponse:
    """
    Assign a new/cold-start user to the nearest learner cluster.

    Input: nativeLanguage, targetLanguage, cefrLevel, goals[]
    Output: clusterId, recommendedPath, defaultComplexityLevel, estimatedVocabStart
    """
    # ── Cache check (keyed by user_id when provided, else by cefr+goals) ──
    _cache_key = req.user_id or f"{req.cefr_level}:{'|'.join(sorted(req.goals or []))}"
    cached = prediction_cache.get("cold_start", "assign-cluster", _cache_key)
    if cached is not None:
        logger.debug(f"assign_cluster cache HIT for key {_cache_key[:12]}…")
        return AssignClusterResponse(**cached)

    try:
        with timed() as t:
            if cluster_model.is_loaded:
                result = cluster_model.assign(
                    native_language=req.native_language,
                    target_language=req.target_language,
                    cefr_level=req.cefr_level,
                    goals=req.goals,
                )
                using_model = True
            else:
                # Heuristic fallback when model is not trained yet
                result = heuristic_assignment(
                    cefr_level=req.cefr_level,
                    goals=req.goals,
                )
                using_model = False

            # Persist assignment if user_id provided
            assignment_id = None
            if req.user_id:
                assignment_id = save_cluster_assignment(
                    user_id=req.user_id,
                    cluster_id=result["cluster_id"],
                    recommended_path=result["recommended_path"],
                    default_complexity_level=result["default_complexity_level"],
                    estimated_vocab_start=result["estimated_vocab_start"],
                    confidence=result["confidence"],
                    assignment_features={
                        "native_language": req.native_language,
                        "target_language": req.target_language,
                        "cefr_level": req.cefr_level,
                        "goals": req.goals,
                    },
                )

        response = AssignClusterResponse(
            cluster_id=result["cluster_id"],
            recommended_path=result["recommended_path"],
            default_complexity_level=result["default_complexity_level"],
            estimated_vocab_start=result["estimated_vocab_start"],
            confidence=result["confidence"],
            recommended_module_weights=result.get("recommended_module_weights", {}),
            assignment_id=assignment_id,
            using_model=using_model,
        )

        prediction_cache.set("cold_start", "assign-cluster", _cache_key, response.model_dump())

        if req.user_id:
            log_prediction(
                service="cold_start", endpoint="assign-cluster",
                user_id=req.user_id,
                inputs={"cefr_level": req.cefr_level, "goals": req.goals,
                        "native_language": req.native_language,
                        "target_language": req.target_language},
                outputs={"cluster_id": result["cluster_id"],
                         "recommended_path": result["recommended_path"],
                         "using_model": using_model},
                latency_ms=t.latency_ms,
            )

        return response

    except Exception as exc:
        logger.exception("assign_cluster failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Check graduation ───────────────────────────────────────────────────────


@router.post(
    "/check-graduation",
    response_model=CheckGraduationResponse,
    dependencies=[Depends(verify_api_key)],
)
async def check_graduation(req: CheckGraduationRequest) -> CheckGraduationResponse:
    """
    Check if a user has accumulated enough events to graduate from cold start.

    At 50 events the user transitions to their personal model and the
    cold start assignment is deactivated.
    """
    try:
        event_count = fetch_user_event_count(req.user_id)
        threshold = settings.clustering.cold_start_threshold
        should_graduate = event_count >= threshold

        # Get current assignment
        assignment = get_user_active_assignment(req.user_id)
        current_cluster_id = assignment["cluster_id"] if assignment else None

        graduated = False
        if should_graduate and assignment:
            deactivate_assignment(req.user_id)
            graduated = True
            logger.info(
                f"User {req.user_id} graduated from cold start "
                f"(events={event_count}, cluster={current_cluster_id})"
            )

        return CheckGraduationResponse(
            user_id=req.user_id,
            event_count=event_count,
            threshold=threshold,
            should_graduate=should_graduate,
            current_cluster_id=current_cluster_id,
            graduated=graduated,
        )

    except Exception as exc:
        logger.exception("check_graduation failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Training trigger ────────────────────────────────────────────────────────


@router.post(
    "/train",
    response_model=TrainResponse,
    dependencies=[Depends(verify_api_key)],
)
async def train(req: TrainRequest) -> TrainResponse:
    """
    Manually trigger a K-Means clustering training run.
    Intended for admin use or CI/CD pipelines.
    """
    t0 = time.time()

    try:
        # Fetch mature user data
        user_rows = fetch_mature_users(
            min_events=settings.clustering.min_events_for_training
        )

        if not user_rows:
            return TrainResponse(
                status="no_data",
                n_users=0,
            )

        # Train the model
        result = cluster_model.train(user_rows)

        # Save to disk
        cluster_model.save()

        elapsed = time.time() - t0

        return TrainResponse(
            status=result.get("status", "trained"),
            n_users=result.get("n_users"),
            n_features=result.get("n_features"),
            n_clusters=result.get("n_clusters"),
            inertia=result.get("inertia"),
            cluster_sizes={
                str(k): v for k, v in (result.get("cluster_sizes") or {}).items()
            },
            training_time_seconds=round(elapsed, 2),
        )

    except Exception as exc:
        logger.exception("Training failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Health check ────────────────────────────────────────────────────────────


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    loaded = cluster_model.is_loaded

    return HealthResponse(
        status="ok" if loaded else "model_not_loaded",
        model_loaded=loaded,
        n_clusters=cluster_model.n_clusters if loaded else 0,
    )



