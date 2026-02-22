"""
Prompt Engine — Builds parameterized prompts for the LLM.

Two prompt types:
  1. Word explanation — triggered on repeated errors
  2. Grammar examples — triggered after grammar lesson completion
"""

from __future__ import annotations

from typing import Any

from loguru import logger


# ── Word Explanation Prompt ─────────────────────────────────────────────────


def build_explain_prompt(
    *,
    target_language: str,
    native_language: str,
    cefr_level: str,
    target_word: str,
    native_translation: str | None,
    grammar_tags: list[str],
    error_pattern: str,
    known_similar_words: list[str],
) -> str:
    """
    Build the parameterised prompt for word error explanations.

    This follows the exact template from the system spec.
    """
    # Format grammar tags
    tags_str = ", ".join(grammar_tags) if grammar_tags else "none identified"

    # Format known words for analogy
    if known_similar_words:
        known_str = ", ".join(known_similar_words[:5])
    else:
        known_str = "none available"

    # Format translation
    translation = native_translation or "translation unavailable"

    prompt = (
        f'You are a {_language_name(target_language)} language tutor for a '
        f'native {_language_name(native_language)} speaker at {cefr_level} level.\n'
        f'The learner keeps making errors with the word: "{target_word}" ({translation})\n'
        f'Grammar tags: {tags_str}\n'
        f'Their specific error pattern: {error_pattern}\n'
        f'Words they know well (for analogy): {known_str}\n'
        f'Write a personalized explanation in 2-3 sentences maximum. '
        f'Use an analogy to a word they already know if possible. '
        f'End with one example sentence using only vocabulary at their level. '
        f'Do not use markdown.'
    )

    return prompt


# ── Grammar Examples Prompt ─────────────────────────────────────────────────


def build_grammar_examples_prompt(
    *,
    target_language: str,
    native_language: str,
    cefr_level: str,
    grammar_concept: str,
    grammar_explanation: str | None,
    known_words: list[str],
) -> str:
    """
    Build the prompt for generating grammar example sentences.

    The LLM must produce exactly 3 example sentences using only the
    user's known vocabulary.
    """
    known_str = ", ".join(known_words[:30]) if known_words else "basic vocabulary"

    prompt = (
        f'You are a {_language_name(target_language)} language tutor for a '
        f'native {_language_name(native_language)} speaker at {cefr_level} level.\n'
        f'The learner just completed a grammar lesson on: {grammar_concept}\n'
    )

    if grammar_explanation:
        prompt += f'Lesson summary: {grammar_explanation}\n'

    prompt += (
        f'The learner knows these words: {known_str}\n\n'
        f'Write exactly 3 example sentences in {_language_name(target_language)} '
        f'that demonstrate this grammar concept. Rules:\n'
        f'1. Use ONLY vocabulary the learner already knows (listed above)\n'
        f'2. Each sentence should show a different usage of the grammar concept\n'
        f'3. Order from simplest to most complex\n'
        f'4. After each {_language_name(target_language)} sentence, add the '
        f'{_language_name(native_language)} translation in parentheses\n'
        f'5. Do not use markdown, numbered lists, or bullet points\n'
        f'6. Separate each sentence pair with a blank line\n'
        f'Do not include any other text or explanation.'
    )

    return prompt


# ── Response Parsing ────────────────────────────────────────────────────────


def parse_explain_response(text: str) -> dict[str, str]:
    """
    Parse the LLM response for a word explanation.

    Returns:
        {
            "explanation": "...",
            "example_sentence": "..."
        }

    The last sentence-like chunk is treated as the example sentence.
    """
    text = text.strip()
    if not text:
        return {
            "explanation": "Unable to generate explanation.",
            "example_sentence": "",
        }

    # Split into sentences (rough heuristic)
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    if len(lines) >= 2:
        # Last line is likely the example sentence
        example = lines[-1]
        explanation = " ".join(lines[:-1])
    else:
        # Single block — try to split on the last period
        sentences = _split_sentences(text)
        if len(sentences) >= 2:
            example = sentences[-1]
            explanation = " ".join(sentences[:-1])
        else:
            explanation = text
            example = ""

    return {
        "explanation": explanation.strip(),
        "example_sentence": example.strip(),
    }


def parse_grammar_examples_response(text: str) -> list[str]:
    """
    Parse the LLM response for grammar example sentences.

    Returns a list of up to 3 sentence strings (each containing the
    target language sentence plus its translation).
    """
    text = text.strip()
    if not text:
        return []

    # Split on double newlines first (paragraph breaks)
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    if len(paragraphs) >= 3:
        return paragraphs[:3]

    # Fallback: split on single newlines
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    # Filter out lines that are just numbers or labels
    sentences = [
        l for l in lines
        if len(l) > 10 and not l.strip().rstrip(".):").isdigit()
    ]

    return sentences[:3]


# ── Helpers ─────────────────────────────────────────────────────────────────


_LANGUAGE_NAMES = {
    "fr": "French",
    "es": "Spanish",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "nl": "Dutch",
    "sv": "Swedish",
    "no": "Norwegian",
    "da": "Danish",
    "ru": "Russian",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "ar": "Arabic",
    "en": "English",
}


def _language_name(code: str) -> str:
    """Convert a language code to its English name."""
    return _LANGUAGE_NAMES.get(code.lower(), code.upper())


def _split_sentences(text: str) -> list[str]:
    """Simple sentence splitter — split on . ! ? followed by space or end."""
    import re

    parts = re.split(r'(?<=[.!?])\s+', text)
    return [p.strip() for p in parts if p.strip()]
