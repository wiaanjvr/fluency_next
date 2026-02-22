"""
FastAPI routes for Churn Prediction & Engagement Rescue.

Endpoints:
  POST /ml/churn/pre-session-risk   — predict daily churn risk for a user
  POST /ml/churn/mid-session-risk   — predict mid-session abandonment risk
  POST /ml/churn/train              — trigger model training (admin)
  GET  /ml/churn/health             — health check
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from loguru import logger

from ml.shared.cache import prediction_cache
from ml.shared.prediction_log import log_prediction, timed
from ..config import settings
from ..data.supabase_client import (
    fetch_mid_session_features,
    fetch_user_pre_session_features,
    fetch_user_stats_for_notification,
    save_abandonment_snapshot,
    save_churn_prediction,
    save_rescue_intervention,
)
from ..model.interventions import (
    generate_notification_hook,
    select_intervention,
)
from ..model.mid_session import mid_session_model
from ..model.pre_session import pre_session_model
from .schemas import (
    HealthResponse,
    InterventionPayload,
    MidSessionRiskRequest,
    MidSessionRiskResponse,
    PreSessionRiskRequest,
    PreSessionRiskResponse,
    TrainRequest,
    TrainResponse,
)

router = APIRouter(prefix="/ml/churn", tags=["churn-prediction"])


# ── Auth dependency ─────────────────────────────────────────────────────────


async def verify_api_key(x_api_key: str = Header(default="")) -> None:
    """
    Simple shared-secret auth for service-to-service calls.
    If CHURN_PREDICTION_API_KEY is not configured, authentication is
    skipped (dev mode).
    """
    expected = settings.server.api_key
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ── Pre-session churn risk ──────────────────────────────────────────────────


@router.post(
    "/pre-session-risk",
    response_model=PreSessionRiskResponse,
    dependencies=[Depends(verify_api_key)],
)
async def pre_session_risk(req: PreSessionRiskRequest) -> PreSessionRiskResponse:
    """
    Predict the probability that a user will NOT start a session today.
    If churnProbability > 0.7, triggers a notification with a personalised hook.
    """
    # ── Cache check (1-hour TTL) ─────────────────────────────────────────
    cached = prediction_cache.get("churn", "pre-session-risk", req.user_id)
    if cached is not None:
        logger.debug(f"pre_session_risk cache HIT for {req.user_id[:8]}…")
        return PreSessionRiskResponse(**cached)

    try:
        with timed() as t:
            # 1. Fetch live features
            features = fetch_user_pre_session_features(req.user_id)
            if features is None:
                # New user with no session history — low confidence
                _default = PreSessionRiskResponse(
                    churn_probability=0.5,
                    trigger_notification=False,
                    notification_hook=None,
                    using_model=False,
                    prediction_id=None,
                )
                log_prediction(
                    service="churn", endpoint="pre-session-risk",
                    user_id=req.user_id,
                    inputs={},
                    outputs=_default.model_dump(),
                    latency_ms=t.latency_ms,
                )
                return _default

            # 2. Predict
            churn_prob = pre_session_model.predict(features)
            using_model = pre_session_model.is_loaded

            # 3. Decide on notification
            trigger = churn_prob > settings.pre_session.churn_threshold
            hook: str | None = None

            if trigger:
                user_stats = fetch_user_stats_for_notification(req.user_id)
                hook = generate_notification_hook(
                    churn_probability=churn_prob,
                    user_stats=user_stats,
                    streak=features.get("current_streak_days", 0),
                )

            # 4. Persist prediction
            prediction_id = save_churn_prediction(
                user_id=req.user_id,
                churn_probability=churn_prob,
                trigger_notification=trigger,
                notification_hook=hook,
                features=features,
                model_version=pre_session_model.model_version,
            )

        response = PreSessionRiskResponse(
            churn_probability=churn_prob,
            trigger_notification=trigger,
            notification_hook=hook,
            using_model=using_model,
            prediction_id=prediction_id,
        )

        # ── Cache store ──────────────────────────────────────────────────
        prediction_cache.set(
            "churn", "pre-session-risk", req.user_id, response.model_dump()
        )

        # ── Prediction log ────────────────────────────────────────────────
        log_prediction(
            service="churn", endpoint="pre-session-risk",
            user_id=req.user_id,
            inputs={k: v for k, v in features.items() if not isinstance(v, bytes)},
            outputs=response.model_dump(),
            model_version=pre_session_model.model_version,
            latency_ms=t.latency_ms,
        )

        logger.info(
            f"Pre-session risk for {req.user_id[:8]}...: "
            f"p={churn_prob:.3f}, notify={trigger}, model={using_model}"
        )
        return response

    except Exception as exc:
        logger.exception("pre_session_risk failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Mid-session abandonment risk ────────────────────────────────────────────


@router.post(
    "/mid-session-risk",
    response_model=MidSessionRiskResponse,
    dependencies=[Depends(verify_api_key)],
)
async def mid_session_risk(req: MidSessionRiskRequest) -> MidSessionRiskResponse:
    """
    Predict the probability that a user will abandon the current session.
    Run every 5 words. If abandonmentProbability > 0.65, recommends an
    intervention from the prioritised rescue list.
    """
    try:
        with timed() as t:
            # 1. Fetch live session features
            features = fetch_mid_session_features(
                user_id=req.user_id,
                session_id=req.session_id,
                words_completed_so_far=req.words_completed_so_far,
            )
            if features is None:
                return MidSessionRiskResponse(
                    abandonment_probability=0.3,
                    recommended_intervention=None,
                    using_model=False,
                    snapshot_id=None,
                )

            # 2. Predict
            abandon_prob = mid_session_model.predict(features)
            using_model = mid_session_model.is_loaded

            # 3. Select intervention if needed
            intervention_result: InterventionPayload | None = None
            if abandon_prob >= settings.mid_session.abandonment_threshold:
                # Fetch user stats for personalisation
                try:
                    user_stats = fetch_user_stats_for_notification(req.user_id)
                except Exception:
                    user_stats = None

                intervention = select_intervention(
                    abandonment_probability=abandon_prob,
                    session_features=features,
                    user_stats=user_stats,
                )

                if intervention:
                    intervention_result = InterventionPayload(
                        type=intervention["type"],
                        message=intervention["message"],
                        payload=intervention["payload"],
                    )

                    # Log the intervention
                    save_rescue_intervention(
                        user_id=req.user_id,
                        session_id=req.session_id,
                        intervention_type=intervention["type"],
                        trigger_probability=abandon_prob,
                        intervention_payload=intervention["payload"],
                    )

            # 4. Persist snapshot
            snapshot_id = save_abandonment_snapshot(
                user_id=req.user_id,
                session_id=req.session_id,
                words_completed_so_far=req.words_completed_so_far,
                abandonment_probability=abandon_prob,
                recommended_intervention=(
                    intervention_result.type if intervention_result else None
                ),
                features=features,
                model_version=mid_session_model.model_version,
            )

        response = MidSessionRiskResponse(
            abandonment_probability=abandon_prob,
            recommended_intervention=intervention_result,
            using_model=using_model,
            snapshot_id=snapshot_id,
        )

        log_prediction(
            service="churn", endpoint="mid-session-risk",
            user_id=req.user_id,
            inputs={
                "session_id": req.session_id,
                "words_completed_so_far": req.words_completed_so_far,
            },
            outputs={
                "abandonment_probability": abandon_prob,
                "intervention": intervention_result.type if intervention_result else None,
            },
            model_version=mid_session_model.model_version,
            latency_ms=t.latency_ms,
        )

        logger.info(
            f"Mid-session risk for {req.user_id[:8]}... "
            f"(session={req.session_id[:8]}..., words={req.words_completed_so_far}): "
            f"p={abandon_prob:.3f}, "
            f"intervention={intervention_result.type if intervention_result else 'none'}"
        )
        return response

    except Exception as exc:
        logger.exception("mid_session_risk failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Training ────────────────────────────────────────────────────────────────


@router.post(
    "/train",
    response_model=TrainResponse,
    dependencies=[Depends(verify_api_key)],
)
async def train(req: TrainRequest) -> TrainResponse:
    """
    Trigger model training. Supports training pre_session, mid_session,
    or both models.
    """
    from ..training.trainer import train_churn_models

    try:
        result = train_churn_models(
            train_pre_session=(req.model in ("both", "pre_session")),
            train_mid_session=(req.model in ("both", "mid_session")),
        )
        return TrainResponse(
            status=result.get("status", "ok"),
            pre_session=result.get("pre_session"),
            mid_session=result.get("mid_session"),
        )
    except Exception as exc:
        logger.exception("Training failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Health check ────────────────────────────────────────────────────────────


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Health check endpoint."""
    from .. import __version__

    return HealthResponse(
        status="ok",
        version=__version__,
        pre_session_model_loaded=pre_session_model.is_loaded,
        mid_session_model_loaded=mid_session_model.is_loaded,
    )
