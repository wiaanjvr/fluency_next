"""
Tests for the prompt engine — prompt building and response parsing.
"""

from __future__ import annotations

from ml.feedback_generator.engine.prompt_engine import (
    build_explain_prompt,
    build_grammar_examples_prompt,
    parse_explain_response,
    parse_grammar_examples_response,
)


# ── Prompt building ─────────────────────────────────────────────────────────


def test_explain_prompt_contains_all_parameters():
    prompt = build_explain_prompt(
        target_language="fr",
        native_language="en",
        cefr_level="A2",
        target_word="manger",
        native_translation="to eat",
        grammar_tags=["irregular", "er_verb"],
        error_pattern="production gap — recognises but can't produce",
        known_similar_words=["parler", "jouer", "regarder"],
    )
    assert "French" in prompt
    assert "English" in prompt
    assert "A2" in prompt
    assert "manger" in prompt
    assert "to eat" in prompt
    assert "irregular" in prompt
    assert "er_verb" in prompt
    assert "production gap" in prompt
    assert "parler" in prompt
    assert "Do not use markdown" in prompt


def test_explain_prompt_handles_empty_tags():
    prompt = build_explain_prompt(
        target_language="es",
        native_language="en",
        cefr_level="B1",
        target_word="comer",
        native_translation=None,
        grammar_tags=[],
        error_pattern="general difficulty",
        known_similar_words=[],
    )
    assert "none identified" in prompt
    assert "none available" in prompt
    assert "translation unavailable" in prompt


def test_grammar_examples_prompt_structure():
    prompt = build_grammar_examples_prompt(
        target_language="fr",
        native_language="en",
        cefr_level="A2",
        grammar_concept="passé_composé",
        grammar_explanation="Past tense using avoir/être + past participle",
        known_words=["manger", "parler", "aller", "être"],
    )
    assert "French" in prompt
    assert "passé_composé" in prompt
    assert "Past tense" in prompt
    assert "manger" in prompt
    assert "exactly 3 example sentences" in prompt


# ── Response parsing ────────────────────────────────────────────────────────


def test_parse_explain_response_multiline():
    text = (
        "Think of 'manger' like 'parler' which you already know. "
        "Both are -er verbs, but 'manger' needs a special 'e' before "
        "-ons to keep the soft 'g' sound.\n"
        "Je mange une pomme le matin."
    )
    result = parse_explain_response(text)
    assert "manger" in result["explanation"]
    assert "Je mange" in result["example_sentence"]


def test_parse_explain_response_single_line():
    text = "This word follows the same pattern as parler. Try: Je mange du pain."
    result = parse_explain_response(text)
    assert result["explanation"] != ""
    # Should still parse something
    assert len(result["explanation"]) > 0


def test_parse_explain_response_empty():
    result = parse_explain_response("")
    assert result["explanation"] == "Unable to generate explanation."
    assert result["example_sentence"] == ""


def test_parse_grammar_examples_paragraphs():
    text = (
        "J'ai mangé une pomme. (I ate an apple.)\n\n"
        "Elle a regardé le film. (She watched the movie.)\n\n"
        "Nous avons parlé avec notre ami. (We spoke with our friend.)"
    )
    result = parse_grammar_examples_response(text)
    assert len(result) == 3
    assert "mangé" in result[0]
    assert "regardé" in result[1]


def test_parse_grammar_examples_single_newlines():
    text = (
        "J'ai mangé une pomme. (I ate an apple.)\n"
        "Elle a regardé le film. (She watched the movie.)\n"
        "Nous avons parlé. (We spoke.)"
    )
    result = parse_grammar_examples_response(text)
    assert len(result) == 3


def test_parse_grammar_examples_empty():
    result = parse_grammar_examples_response("")
    assert result == []
