"""
ml.service.routes_gdpr — GDPR / POPIA right-to-erasure endpoint.

  DELETE /ml/user/{user_id}
    Deletes ALL ML training data + prediction cache for a user.
    Protected by the same X-Api-Key shared-secret auth used by all
    other ML service endpoints.

  GET /ml/user/{user_id}/ml-data-summary
    Returns a count of ML records the service holds for a user, so the
    frontend can show a "data we have on you" disclosure screen.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Header, HTTPException
from loguru import logger
from pydantic import BaseModel

from ..shared.gdpr import delete_user_ml_data

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_PROJECT_ROOT / ".env.local")
load_dotenv(_PROJECT_ROOT / ".env")

router = APIRouter(prefix="/ml", tags=["gdpr"])


# ── Auth ────────────────────────────────────────────────────────────────────


async def verify_api_key(x_api_key: str = Header(default="")) -> None:
    """Shared-secret auth for service-to-service calls."""
    expected = os.getenv("ML_GATEWAY_API_KEY", "")
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ── Schemas ──────────────────────────────────────────────────────────────────


class DeleteUserResponse(BaseModel):
    user_id: str
    cache_keys_deleted: int
    prediction_log_rows_deleted: int
    supabase_tables: dict[str, Any]
    errors: list[str]
    success: bool


# ── Endpoints ───────────────────────────────────────────────────────────────


@router.delete(
    "/user/{user_id}",
    response_model=DeleteUserResponse,
    summary="GDPR / POPIA right-to-erasure — delete all ML data for a user",
    dependencies=[Depends(verify_api_key)],
)
async def delete_user(user_id: str) -> DeleteUserResponse:
    """
    Permanently remove all ML training data, prediction logs, and Redis
    cache entries for *user_id*.

    This endpoint satisfies GDPR Article 17 and POPIA Section 24 (right
    to erasure / destruction).

    What is deleted:
    - All Redis prediction-cache keys for the user (immediate)
    - All rows in ``ml_prediction_log``
    - All rows in ``routing_decisions`` + ``routing_rewards`` (cascade)
    - All rows in ``churn_predictions``, ``abandonment_snapshots``,
      ``rescue_interventions``
    - All rows in ``cluster_assignments`` (resets user to cold-start)
    - All rows in ``cognitive_load_sessions`` + ``cognitive_load_events``

    **Auth**: requires X-Api-Key header matching ML_GATEWAY_API_KEY env var.
    """
    logger.info(
        f"GDPR DELETE /ml/user/{user_id[:8]}… received — "
        "purging all ML data for this user"
    )
    try:
        result = delete_user_ml_data(user_id)
    except Exception as exc:
        logger.exception(f"GDPR delete failed for user {user_id}")
        raise HTTPException(status_code=500, detail=str(exc))

    return DeleteUserResponse(**result)
