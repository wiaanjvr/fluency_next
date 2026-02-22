"""
Cold-start rule-based fallback.

For users with fewer than 50 interaction events, we use deterministic
rules instead of the learned policy. This avoids poor recommendations
from a model that has no data about the user.

Rules (evaluated in priority order):
1. If productionScore < 0.4 on any word cluster → conjugation_drill
2. If pronunciationScore < 0.3 on any words → pronunciation_session
3. If grammar concept mastery < 0.3 → grammar_lesson
4. Default → story_engine
"""

from __future__ import annotations

from loguru import logger

from ..config import settings
from .state_assembler import UserState


def cold_start_recommend(state: UserState) -> dict:
    """
    Return a routing recommendation using rule-based logic.

    Returns:
        dict with keys: module, target_words, target_concept, reason, confidence
    """
    cfg = settings.cold_start

    # Rule 1: Low production scores → conjugation drill
    if (
        state.avg_production_score < cfg.production_score_threshold
        or len(state.low_production_words) > 0
    ):
        target_words = state.low_production_words[:settings.router.max_target_words]
        logger.info(
            f"Cold-start [{state.user_id[:8]}]: conjugation_drill "
            f"(prod={state.avg_production_score:.2f}, "
            f"low_words={len(state.low_production_words)})"
        )
        return {
            "module": "conjugation_drill",
            "target_words": target_words,
            "target_concept": None,
            "reason": (
                f"Production score ({state.avg_production_score:.0%}) is below "
                f"threshold ({cfg.production_score_threshold:.0%}) — "
                f"drilling {len(target_words)} weak words."
            ),
            "confidence": 0.7,
        }

    # Rule 2: Low pronunciation scores → pronunciation session
    if (
        state.avg_pronunciation_score < cfg.pronunciation_score_threshold
        or len(state.low_pronunciation_words) > 0
    ):
        target_words = state.low_pronunciation_words[:settings.router.max_target_words]
        logger.info(
            f"Cold-start [{state.user_id[:8]}]: pronunciation_session "
            f"(pron={state.avg_pronunciation_score:.2f}, "
            f"low_words={len(state.low_pronunciation_words)})"
        )
        return {
            "module": "pronunciation_session",
            "target_words": target_words,
            "target_concept": None,
            "reason": (
                f"Pronunciation score ({state.avg_pronunciation_score:.0%}) is below "
                f"threshold ({cfg.pronunciation_score_threshold:.0%}) — "
                f"practising {len(target_words)} words."
            ),
            "confidence": 0.7,
        }

    # Rule 3: Low grammar mastery → grammar lesson
    if (
        state.weakest_concept_tag is not None
        and state.weakest_concept_score < cfg.grammar_mastery_threshold
    ):
        logger.info(
            f"Cold-start [{state.user_id[:8]}]: grammar_lesson "
            f"(concept={state.weakest_concept_tag}, "
            f"score={state.weakest_concept_score:.2f})"
        )
        return {
            "module": "grammar_lesson",
            "target_words": [],
            "target_concept": state.weakest_concept_tag,
            "reason": (
                f"Grammar concept '{state.weakest_concept_tag}' has mastery "
                f"({state.weakest_concept_score:.0%}) below threshold "
                f"({cfg.grammar_mastery_threshold:.0%})."
            ),
            "confidence": 0.65,
        }

    # Rule 4: High cognitive load from last session → rest
    if state.cognitive_load_last_session > 0.85:
        logger.info(
            f"Cold-start [{state.user_id[:8]}]: rest "
            f"(cog_load={state.cognitive_load_last_session:.2f})"
        )
        return {
            "module": "rest",
            "target_words": [],
            "target_concept": None,
            "reason": (
                f"Cognitive load from last session was high "
                f"({state.cognitive_load_last_session:.0%}) — "
                f"suggesting a break to avoid burnout."
            ),
            "confidence": 0.6,
        }

    # Default: story engine
    logger.info(
        f"Cold-start [{state.user_id[:8]}]: story_engine (default)"
    )
    return {
        "module": cfg.default_module,
        "target_words": [],
        "target_concept": None,
        "reason": "Default recommendation: immersive story practice.",
        "confidence": 0.5,
    }
