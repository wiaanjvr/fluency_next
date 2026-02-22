"""
DKT inference engine.

Provides the high-level functions called by the API layer:
  - ``get_knowledge_state(user_id)``  → per-word p_recall, p_forget_48h, p_forget_7d + concept mastery
  - ``predict_session(user_id, planned_word_ids)`` → predicted per-word performance
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import torch
from loguru import logger

from ..config import settings
from ..data.feature_engineering import (
    GrammarTagIndex,
    VocabIndex,
    build_user_sequences,
)
from ..data.supabase_client import (
    fetch_user_baseline,
    fetch_user_events,
    fetch_user_words,
)
from ..model.transformer_dkt import TransformerDKT


class DKTPredictor:
    """
    Stateful inference wrapper.

    Loads the best checkpoint and vocab/grammar maps once, then serves
    predictions for any user on demand.
    """

    def __init__(self) -> None:
        self._model: TransformerDKT | None = None
        self._vocab: VocabIndex | None = None
        self._grammar_tags: GrammarTagIndex | None = None
        self._device = torch.device("cpu")

    # ── Model loading ───────────────────────────────────────────────────

    def load(self, checkpoint: Path | None = None) -> None:
        """Load model + vocab from disk."""
        paths = settings.paths
        ckpt = checkpoint or paths.best_model_path

        if not ckpt.exists():
            raise FileNotFoundError(f"No checkpoint at {ckpt}")
        if not paths.vocab_map_path.exists():
            raise FileNotFoundError(f"No vocab map at {paths.vocab_map_path}")

        self._vocab = VocabIndex.load(paths.vocab_map_path)
        self._grammar_tags = GrammarTagIndex.load(paths.grammar_tag_map_path)

        if torch.cuda.is_available():
            self._device = torch.device("cuda")
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            self._device = torch.device("mps")

        state = torch.load(ckpt, map_location=self._device, weights_only=True)

        self._model = TransformerDKT(
            vocab_size=self._vocab.size,
            grammar_tag_count=self._grammar_tags.size,
            d_model=state.get("d_model", settings.model.d_model),
            nhead=state.get("nhead", settings.model.nhead),
            num_layers=state.get("num_layers", settings.model.num_layers),
        ).to(self._device)

        self._model.load_state_dict(state["model_state_dict"])
        self._model.eval()

        logger.info(
            f"DKT model loaded from {ckpt} — "
            f"vocab={self._vocab.size}, device={self._device}"
        )

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def _ensure_loaded(self) -> None:
        if not self.is_loaded:
            self.load()

    # ── Knowledge state ─────────────────────────────────────────────────

    def get_knowledge_state(self, user_id: str) -> dict[str, Any]:
        """
        Compute the full knowledge state for a user.

        Returns
        -------
        {
            "word_states": [
                {"word_id": str, "p_recall": float, "p_forget_48h": float, "p_forget_7d": float},
                ...
            ],
            "concept_mastery": [
                {"tag_id": str, "mastery_score": float},
                ...
            ],
            "event_count": int,
            "using_dkt": bool,  # False if below threshold → FSRS fallback
        }
        """
        self._ensure_loaded()
        assert self._model is not None
        assert self._vocab is not None
        assert self._grammar_tags is not None

        # Fetch user's event history
        events = fetch_user_events(user_id)
        event_count = len(events)

        if event_count < settings.model.min_events_for_dkt:
            return {
                "word_states": [],
                "concept_mastery": [],
                "event_count": event_count,
                "using_dkt": False,
                "reason": f"Need {settings.model.min_events_for_dkt} events, have {event_count}. Using FSRS.",
            }

        # Fetch baseline
        baseline_raw = fetch_user_baseline(user_id)
        baselines = {user_id: baseline_raw} if baseline_raw else {}

        # Build feature sequence (use last max_seq_len events)
        seqs = build_user_sequences(
            events,
            self._vocab,
            self._grammar_tags,
            baselines,
            build_vocab=False,
        )

        if not seqs:
            return {
                "word_states": [],
                "concept_mastery": [],
                "event_count": event_count,
                "using_dkt": False,
                "reason": "Could not build sequence from events.",
            }

        # Take the last (most recent) sequence
        seq = seqs[-1]
        batch = self._sequence_to_batch(seq)

        # Run model
        result = self._model.predict_knowledge_state(
            word_ids=batch["word_ids"],
            grammar_ids=batch["grammar_ids"],
            continuous=batch["continuous"],
            module_source=batch["module_source"],
            input_mode=batch["input_mode"],
            lengths=batch["lengths"],
        )

        # Unpack knowledge state
        ks = result["knowledge_state"][0].cpu().numpy()     # [V]
        fp = result["forget_probs"][0].cpu().numpy()         # [H]
        gm = result["grammar_mastery"][0].cpu().numpy()      # [G]

        # Build per-word output (only for words the user has encountered)
        user_words = fetch_user_words(user_id)
        user_word_ids = {w["id"] for w in user_words}

        word_states = []
        for wid in user_word_ids:
            idx = self._vocab.get(wid)
            if idx == 0:
                continue  # word not in training vocab
            p_recall = float(ks[idx]) if idx < len(ks) else 0.5
            # For per-word forget: use the global forget probabilities
            # scaled by (1 - p_recall) as a proxy
            p_forget_48h = float(fp[0]) * (1.0 - p_recall)
            p_forget_7d = float(fp[1]) * (1.0 - p_recall)

            word_states.append({
                "word_id": wid,
                "p_recall": round(p_recall, 4),
                "p_forget_48h": round(p_forget_48h, 4),
                "p_forget_7d": round(p_forget_7d, 4),
            })

        # Build concept mastery
        concept_mastery = []
        for gid in self._grammar_tags.all_ids:
            g_idx = self._grammar_tags.get(gid)
            if g_idx < len(gm):
                concept_mastery.append({
                    "tag_id": gid,
                    "mastery_score": round(float(gm[g_idx]), 4),
                })

        return {
            "word_states": word_states,
            "concept_mastery": concept_mastery,
            "event_count": event_count,
            "using_dkt": True,
        }

    # ── Session prediction ──────────────────────────────────────────────

    def predict_session(
        self,
        user_id: str,
        planned_word_ids: list[str],
    ) -> dict[str, Any]:
        """
        Predict performance for each word in a hypothetical upcoming session.

        Appends synthetic events (one per planned word, with correct=unknown)
        to the user's history and returns the model's predicted p(correct)
        for each.

        Returns
        -------
        {
            "predictions": [
                {"word_id": str, "predicted_recall": float},
                ...
            ],
            "using_dkt": bool,
        }
        """
        self._ensure_loaded()
        assert self._model is not None
        assert self._vocab is not None
        assert self._grammar_tags is not None

        events = fetch_user_events(user_id)
        event_count = len(events)

        if event_count < settings.model.min_events_for_dkt:
            return {
                "predictions": [],
                "using_dkt": False,
                "reason": f"Need {settings.model.min_events_for_dkt} events, have {event_count}. Using FSRS.",
            }

        baseline_raw = fetch_user_baseline(user_id)
        baselines = {user_id: baseline_raw} if baseline_raw else {}

        # Build the real history sequence
        seqs = build_user_sequences(
            events,
            self._vocab,
            self._grammar_tags,
            baselines,
            build_vocab=False,
        )
        if not seqs:
            return {"predictions": [], "using_dkt": False, "reason": "No sequence"}

        seq = seqs[-1]

        # For each planned word, extend the sequence by one step and predict
        predictions = []
        for wid in planned_word_ids:
            word_idx = self._vocab.get(wid)
            # Create a synthetic next-event feature
            synthetic = {
                "word_idx": word_idx,
                "grammar_tag_idx": 0,
                "correct": 0.5,  # unknown — model predicts this
                "response_time_norm": 1.0,
                "days_since_last_review_log": 0.0,
                "input_mode_idx": 0,
                "module_source_idx": 0,
                "time_of_day_idx": 0,
                "day_of_week": 0,
                "consecutive_correct": 0,
                "session_fatigue_proxy": 1.0,
                "time_since_session_start_norm": 0.0,
            }
            extended_seq = (seq + [synthetic])[-settings.model.max_seq_len:]
            batch = self._sequence_to_batch(extended_seq)

            out = self._model(
                word_ids=batch["word_ids"],
                grammar_ids=batch["grammar_ids"],
                continuous=batch["continuous"],
                module_source=batch["module_source"],
                input_mode=batch["input_mode"],
                padding_mask=batch["padding_mask"],
            )

            # The prediction for the last position is our answer
            last_pos = len(extended_seq) - 1
            p_recall = float(out["recall_probs"][0, last_pos].item())

            predictions.append({
                "word_id": wid,
                "predicted_recall": round(p_recall, 4),
            })

        return {
            "predictions": predictions,
            "using_dkt": True,
        }

    # ── Internal helpers ────────────────────────────────────────────────

    def _sequence_to_batch(
        self, seq: list[dict[str, Any]]
    ) -> dict[str, torch.Tensor]:
        """Convert a single feature-dict sequence to a batched tensor dict."""
        from ..data.dataset import DKTDataset

        ds = DKTDataset([seq])
        sample = ds[0]

        # Add batch dimension and move to device
        batch: dict[str, torch.Tensor] = {}
        for k, v in sample.items():
            if isinstance(v, torch.Tensor):
                batch[k] = v.unsqueeze(0).to(self._device)

        T = sample["length"]
        max_len = batch["word_ids"].size(1)
        lengths = torch.tensor([T], dtype=torch.long, device=self._device)
        padding_mask = torch.arange(max_len, device=self._device).unsqueeze(0) >= lengths.unsqueeze(1)
        batch["padding_mask"] = padding_mask
        batch["lengths"] = lengths

        return batch


# ── Module-level singleton ──────────────────────────────────────────────────

predictor = DKTPredictor()
