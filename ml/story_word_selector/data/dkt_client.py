"""
DKT service client — fetches per-word forgetting probabilities.

Calls the DKT microservice (:8100) to get p_forget_48h for each word.
Gracefully degrades if DKT is unavailable (returns empty dict).
"""

from __future__ import annotations

from typing import Any

import httpx
from loguru import logger

from ..config import settings


async def fetch_dkt_forget_probs(user_id: str) -> dict[str, float]:
    """
    Call the DKT knowledge-state endpoint and return a mapping of
    word_id → p_forget_48h.

    Returns an empty dict if the DKT service is unreachable or the user
    has insufficient events (DKT falls back to FSRS).
    """
    url = f"{settings.dkt.base_url}/ml/dkt/knowledge-state"
    headers: dict[str, str] = {}
    if settings.dkt.api_key:
        headers["X-Api-Key"] = settings.dkt.api_key

    try:
        async with httpx.AsyncClient(timeout=settings.dkt.timeout_seconds) as client:
            resp = await client.post(
                url,
                json={"userId": user_id},
                headers=headers,
            )

            if resp.status_code == 503:
                # DKT not trained yet — graceful degradation
                logger.info(f"DKT not available for user {user_id}: {resp.text}")
                return {}

            resp.raise_for_status()
            data = resp.json()

            if not data.get("usingDkt", False):
                logger.info(
                    f"DKT returned FSRS fallback for user {user_id}: "
                    f"{data.get('reason', 'unknown')}"
                )
                return {}

            # Build word_id → p_forget_48h mapping
            forget_map: dict[str, float] = {}
            for ws in data.get("wordStates", []):
                word_id = ws.get("wordId")
                p_forget = ws.get("pForget48h", 0.0)
                if word_id:
                    forget_map[word_id] = p_forget

            logger.debug(
                f"DKT returned {len(forget_map)} word forget probs for user {user_id}"
            )
            return forget_map

    except httpx.ConnectError:
        logger.warning("DKT service unreachable — scoring without forgetting probs")
        return {}
    except httpx.TimeoutException:
        logger.warning("DKT service timed out — scoring without forgetting probs")
        return {}
    except Exception as exc:
        logger.warning(f"DKT client error: {exc} — scoring without forgetting probs")
        return {}
