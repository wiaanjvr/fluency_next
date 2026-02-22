"""
FastAPI routes for the LLM Feedback Generator.

Endpoints:
  POST /ml/feedback/explain           — generate personalized word explanation
  POST /ml/feedback/grammar-examples  — generate grammar example sentences
  GET  /ml/feedback/health            — health check
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from loguru import logger

from ml.shared.cache import prediction_cache
from ml.shared.prediction_log import log_prediction, timed
from ..config import settings
from ..engine.generator import generate_explanation, generate_grammar_examples
from .schemas import (
    ExplainRequest,
    ExplainResponse,
    GrammarExamplesRequest,
    GrammarExamplesResponse,
    HealthResponse,
)

router = APIRouter(prefix="/ml/feedback", tags=["feedback-generator"])


# ── Auth dependency ─────────────────────────────────────────────────────────


async def verify_api_key(x_api_key: str = Header(default="")) -> None:
    """
    Simple shared-secret auth for service-to-service calls.
    If FEEDBACK_GENERATOR_API_KEY is not configured, authentication is
    skipped (dev mode).
    """
    expected = settings.server.api_key
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ── Explain endpoint ────────────────────────────────────────────────────────


@router.post(
    "/explain",
    response_model=ExplainResponse,
    dependencies=[Depends(verify_api_key)],
)
async def explain(req: ExplainRequest) -> ExplainResponse:
    """
    Generate a personalized micro-explanation for a word the learner
    keeps getting wrong.

    Trigger conditions (checked automatically unless force=True):
      - Same word wrong 2+ times in current session, OR
      - exposure_count > 5 with recognition_score < 0.4
    """
    # ── Cache (keyed by user + word) ───────────────────────────────────
    if not req.force:
        cached = prediction_cache.get("feedback", "explain", req.user_id, extra=req.word_id)
        if cached is not None:
            logger.debug(f"explain cache HIT user={req.user_id[:8]}… word={req.word_id}")
            return ExplainResponse(**cached)

    try:
        with timed() as t:
            result = await generate_explanation(
                user_id=req.user_id,
                word_id=req.word_id,
                session_id=req.session_id,
                force=req.force,
            )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception("explain endpoint failed")
        raise HTTPException(status_code=500, detail=str(exc))

    response = ExplainResponse(**result)

    prediction_cache.set("feedback", "explain", req.user_id, response.model_dump(), extra=req.word_id)

    log_prediction(
        service="feedback", endpoint="explain",
        user_id=req.user_id,
        inputs={"word_id": req.word_id, "session_id": req.session_id, "force": req.force},
        outputs={k: v for k, v in result.items() if k != "explanation"},  # skip long text
        latency_ms=t.latency_ms,
    )

    return response


# ── Grammar examples endpoint ───────────────────────────────────────────────


@router.post(
    "/grammar-examples",
    response_model=GrammarExamplesResponse,
    dependencies=[Depends(verify_api_key)],
)
async def grammar_examples(req: GrammarExamplesRequest) -> GrammarExamplesResponse:
    """
    Generate 3 example sentences demonstrating a grammar concept
    using only the user's known vocabulary.

    Triggered when a grammar lesson is completed.
    """
    # ── Cache (keyed by user + grammar concept) ────────────────────
    cached = prediction_cache.get(
        "feedback", "grammar-examples", req.user_id,
        extra=req.grammar_concept_tag
    )
    if cached is not None:
        logger.debug(
            f"grammar_examples cache HIT user={req.user_id[:8]}… "
            f"concept={req.grammar_concept_tag}"
        )
        return GrammarExamplesResponse(**cached)

    try:
        with timed() as t:
            result = await generate_grammar_examples(
                user_id=req.user_id,
                grammar_concept_tag=req.grammar_concept_tag,
                known_word_ids=req.known_word_ids if req.known_word_ids else None,
            )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception("grammar_examples endpoint failed")
        raise HTTPException(status_code=500, detail=str(exc))

    response = GrammarExamplesResponse(**result)

    prediction_cache.set(
        "feedback", "grammar-examples", req.user_id,
        response.model_dump(), extra=req.grammar_concept_tag
    )

    log_prediction(
        service="feedback", endpoint="grammar-examples",
        user_id=req.user_id,
        inputs={"grammar_concept_tag": req.grammar_concept_tag,
                "known_word_count": len(req.known_word_ids or [])},
        outputs={k: v for k, v in result.items() if k != "examples"},
        latency_ms=t.latency_ms,
    )

    return response


# ── Health check ────────────────────────────────────────────────────────────


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Health check — also reports configured LLM provider."""
    try:
        from ..engine.llm_client import get_llm_client

        llm = get_llm_client()
        provider = llm.provider_name
        model = llm.model_name
        status = "ok"
    except Exception as exc:
        provider = ""
        model = ""
        status = f"llm_not_configured: {exc}"

    return HealthResponse(
        status=status,
        llmProvider=provider,
        llmModel=model,
    )
