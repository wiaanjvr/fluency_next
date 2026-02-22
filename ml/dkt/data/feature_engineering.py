"""
Feature engineering for DKT input sequences.

Converts raw Supabase rows into numerical feature tensors ready for the
Transformer model.
"""

from __future__ import annotations

import json
import math
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np
from loguru import logger

from ..config import settings

# ── Categorical mappings ────────────────────────────────────────────────────

MODULE_SOURCES: list[str] = [
    "story_engine",
    "flashcards",
    "cloze",
    "conjugation",
    "pronunciation",
    "grammar",
    "free_reading",
    "foundation",
]
MODULE_SOURCE_TO_IDX = {m: i for i, m in enumerate(MODULE_SOURCES)}

INPUT_MODES: list[str] = ["multiple_choice", "typing", "speaking", "reading"]
INPUT_MODE_TO_IDX = {m: i for i, m in enumerate(INPUT_MODES)}

TIME_OF_DAY: list[str] = ["morning", "afternoon", "evening", "night"]
TIME_OF_DAY_TO_IDX = {t: i for i, t in enumerate(TIME_OF_DAY)}


# ── Vocabulary & grammar-tag index builders ─────────────────────────────────


class VocabIndex:
    """
    Maintains a bidirectional word_id <-> integer index.
    Index 0 is reserved for <PAD>.
    """

    PAD_IDX = 0

    def __init__(self) -> None:
        self._id_to_idx: dict[str, int] = {}
        self._idx_to_id: dict[int, str] = {}
        self._next = 1  # 0 is padding

    # -- persistence -----------------------------------------------------------

    def save(self, path: Path) -> None:
        path.write_text(json.dumps(self._id_to_idx, indent=2))
        logger.info(f"Saved vocab map ({len(self._id_to_idx)} words) → {path}")

    @classmethod
    def load(cls, path: Path) -> "VocabIndex":
        obj = cls()
        data: dict[str, int] = json.loads(path.read_text())
        obj._id_to_idx = data
        obj._idx_to_id = {v: k for k, v in data.items()}
        obj._next = max(data.values(), default=0) + 1
        return obj

    # -- core API --------------------------------------------------------------

    def get_or_add(self, word_id: str) -> int:
        if word_id not in self._id_to_idx:
            self._id_to_idx[word_id] = self._next
            self._idx_to_id[self._next] = word_id
            self._next += 1
        return self._id_to_idx[word_id]

    def get(self, word_id: str) -> int:
        return self._id_to_idx.get(word_id, self.PAD_IDX)

    def id_from_idx(self, idx: int) -> str | None:
        return self._idx_to_id.get(idx)

    @property
    def size(self) -> int:
        """Total vocab size including PAD token."""
        return self._next

    @property
    def word_ids(self) -> list[str]:
        return list(self._id_to_idx.keys())


class GrammarTagIndex:
    """Same pattern for grammar concept IDs."""

    PAD_IDX = 0

    def __init__(self) -> None:
        self._id_to_idx: dict[str, int] = {}
        self._next = 1

    def save(self, path: Path) -> None:
        path.write_text(json.dumps(self._id_to_idx, indent=2))

    @classmethod
    def load(cls, path: Path) -> "GrammarTagIndex":
        obj = cls()
        data: dict[str, int] = json.loads(path.read_text())
        obj._id_to_idx = data
        obj._next = max(data.values(), default=0) + 1
        return obj

    def get_or_add(self, grammar_id: str) -> int:
        if grammar_id not in self._id_to_idx:
            self._id_to_idx[grammar_id] = self._next
            self._next += 1
        return self._id_to_idx[grammar_id]

    def get(self, grammar_id: str) -> int:
        return self._id_to_idx.get(grammar_id, self.PAD_IDX)

    @property
    def size(self) -> int:
        return self._next

    @property
    def all_ids(self) -> list[str]:
        return list(self._id_to_idx.keys())


# ── Feature extraction (single event → vector) ──────────────────────────────


def _log_scale(x: float | None, default: float = 0.0) -> float:
    """Log1p scaling for days_since_last_review and similar."""
    if x is None:
        return default
    return math.log1p(max(0.0, x))


def _parse_iso(s: str | None) -> datetime | None:
    if s is None:
        return None
    # Handle Supabase timestamps (may or may not have timezone)
    s = s.replace("Z", "+00:00")
    return datetime.fromisoformat(s)


def event_to_features(
    event: dict[str, Any],
    vocab: VocabIndex,
    grammar_tags: GrammarTagIndex,
    baseline_rt: float = 3000.0,
    session_start: datetime | None = None,
) -> dict[str, Any]:
    """
    Convert a raw event dict into a feature dict consumed by the Dataset.

    Returns a dict with:
      - word_idx: int
      - grammar_tag_idx: int
      - correct: float (0/1)
      - response_time_norm: float  (rt / baseline)
      - days_since_last_review_log: float
      - input_mode_idx: int
      - module_source_idx: int
      - time_of_day_idx: int
      - day_of_week: int (0-6)
      - consecutive_correct: int
      - session_fatigue_proxy: float
      - time_since_session_start_norm: float
    """
    word_id = event.get("word_id")
    word_idx = vocab.get(word_id) if word_id else VocabIndex.PAD_IDX

    g_id = event.get("grammar_concept_id")
    grammar_tag_idx = grammar_tags.get(g_id) if g_id else GrammarTagIndex.PAD_IDX

    rt = event.get("response_time_ms")
    response_time_norm = (rt / baseline_rt) if rt and baseline_rt > 0 else 1.0

    fatigue = event.get("session_fatigue_proxy")
    session_fatigue = fatigue if fatigue is not None else 1.0

    # Time since session start (normalised to minutes)
    created = _parse_iso(event.get("created_at"))
    if created and session_start:
        delta = (created - session_start).total_seconds() / 60.0
        time_since_start_norm = min(delta / 60.0, 1.0)  # cap at 1h
    else:
        time_since_start_norm = 0.0

    return {
        "word_idx": word_idx,
        "grammar_tag_idx": grammar_tag_idx,
        "correct": 1.0 if event.get("correct") else 0.0,
        "response_time_norm": min(response_time_norm, 5.0),  # clip outliers
        "days_since_last_review_log": _log_scale(
            event.get("days_since_last_review"), default=0.0
        ),
        "input_mode_idx": INPUT_MODE_TO_IDX.get(event.get("input_mode", ""), 0),
        "module_source_idx": MODULE_SOURCE_TO_IDX.get(
            event.get("module_source", ""), 0
        ),
        "time_of_day_idx": TIME_OF_DAY_TO_IDX.get(event.get("time_of_day", ""), 0),
        "day_of_week": event.get("day_of_week", 0),
        "consecutive_correct": event.get("consecutive_correct_in_session", 0),
        "session_fatigue_proxy": min(session_fatigue, 5.0),
        "time_since_session_start_norm": time_since_start_norm,
    }


# ── Sequence builder (user events → training sequences) ─────────────────────


def build_user_sequences(
    events: list[dict[str, Any]],
    vocab: VocabIndex,
    grammar_tags: GrammarTagIndex,
    baselines: dict[str, dict[str, Any]],
    max_seq_len: int | None = None,
    build_vocab: bool = False,
) -> list[list[dict[str, Any]]]:
    """
    Group events by user, then by session, into feature-vector sequences.

    If *build_vocab* is True, word_ids and grammar_ids are added to the
    indexes as they are encountered (training mode).  Otherwise, unknown
    IDs map to PAD (inference mode).

    Returns a list of sequences, each sequence being a list of feature dicts.
    """
    if max_seq_len is None:
        max_seq_len = settings.model.max_seq_len

    # Group by user
    user_events: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for e in events:
        user_events[e["user_id"]].append(e)

    all_sequences: list[list[dict[str, Any]]] = []

    for uid, u_events in user_events.items():
        # Sort chronologically
        u_events.sort(key=lambda x: x.get("created_at", ""))

        baseline_rt = 3000.0
        if uid in baselines:
            baseline_rt = baselines[uid].get("avg_response_time_ms", 3000.0) or 3000.0

        # Track session starts
        session_starts: dict[str, datetime] = {}

        # Register word/grammar IDs if building vocab
        if build_vocab:
            for e in u_events:
                wid = e.get("word_id")
                if wid:
                    vocab.get_or_add(wid)
                gid = e.get("grammar_concept_id")
                if gid:
                    grammar_tags.get_or_add(gid)

        # Determine session start times
        for e in u_events:
            sid = e.get("session_id")
            if sid and sid not in session_starts:
                ts = _parse_iso(e.get("created_at"))
                if ts:
                    session_starts[sid] = ts

        # Build feature vectors
        feature_seq: list[dict[str, Any]] = []
        for e in u_events:
            sid = e.get("session_id", "")
            sess_start = session_starts.get(sid)
            feat = event_to_features(
                e,
                vocab=vocab,
                grammar_tags=grammar_tags,
                baseline_rt=baseline_rt,
                session_start=sess_start,
            )
            feature_seq.append(feat)

        # Sliding window into max_seq_len chunks
        if len(feature_seq) <= max_seq_len:
            all_sequences.append(feature_seq)
        else:
            stride = max_seq_len // 2  # 50% overlap
            for start in range(0, len(feature_seq) - max_seq_len + 1, stride):
                all_sequences.append(feature_seq[start : start + max_seq_len])
            # Always include the final window
            if (len(feature_seq) - max_seq_len) % stride != 0:
                all_sequences.append(feature_seq[-max_seq_len:])

    logger.info(
        f"Built {len(all_sequences)} sequences from "
        f"{len(user_events)} users"
    )
    return all_sequences
