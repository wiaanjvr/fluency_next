"""
PyTorch Dataset for DKT training and evaluation.

Each sample is a padded sequence of interaction feature vectors with the
target being the `correct` label at each time-step (shifted by one, so the
model predicts the *next* event outcome given history).
"""

from __future__ import annotations

from typing import Any

import numpy as np
import torch
from torch.utils.data import Dataset

from ..config import settings


class DKTDataset(Dataset):
    """
    Takes pre-computed feature sequences (output of ``build_user_sequences``)
    and converts them to padded tensors on-the-fly.

    Each item returned
    -----------------
    word_ids      : LongTensor  [T]        vocab indices
    grammar_ids   : LongTensor  [T]        grammar-tag indices
    continuous    : FloatTensor [T, C]      continuous features
    module_source : LongTensor  [T]        one-hot index
    input_mode    : LongTensor  [T]        one-hot index
    targets       : FloatTensor [T]        correct label (0/1)
    target_word   : LongTensor  [T]        word index for that step (needed for loss masking)
    lengths       : int                    actual sequence length (before padding)
    """

    # The continuous features we pack into the dense vector
    _CONTINUOUS_KEYS = [
        "response_time_norm",
        "days_since_last_review_log",
        "time_of_day_idx",       # treated as continuous ordinal
        "day_of_week",           # treated as continuous ordinal
        "consecutive_correct",
        "session_fatigue_proxy",
        "time_since_session_start_norm",
    ]

    def __init__(
        self,
        sequences: list[list[dict[str, Any]]],
        max_seq_len: int | None = None,
    ) -> None:
        self.sequences = sequences
        self.max_seq_len = max_seq_len or settings.model.max_seq_len

    def __len__(self) -> int:
        return len(self.sequences)

    def __getitem__(self, idx: int) -> dict[str, torch.Tensor]:
        seq = self.sequences[idx]
        T = min(len(seq), self.max_seq_len)

        word_ids = np.zeros(self.max_seq_len, dtype=np.int64)
        grammar_ids = np.zeros(self.max_seq_len, dtype=np.int64)
        module_source = np.zeros(self.max_seq_len, dtype=np.int64)
        input_mode = np.zeros(self.max_seq_len, dtype=np.int64)
        continuous = np.zeros((self.max_seq_len, len(self._CONTINUOUS_KEYS)), dtype=np.float32)
        targets = np.zeros(self.max_seq_len, dtype=np.float32)
        target_word = np.zeros(self.max_seq_len, dtype=np.int64)

        for t, feat in enumerate(seq[:T]):
            word_ids[t] = feat["word_idx"]
            grammar_ids[t] = feat["grammar_tag_idx"]
            module_source[t] = feat["module_source_idx"]
            input_mode[t] = feat["input_mode_idx"]
            targets[t] = feat["correct"]
            target_word[t] = feat["word_idx"]

            for c, key in enumerate(self._CONTINUOUS_KEYS):
                continuous[t, c] = float(feat.get(key, 0.0))

        return {
            "word_ids": torch.from_numpy(word_ids),
            "grammar_ids": torch.from_numpy(grammar_ids),
            "continuous": torch.from_numpy(continuous),
            "module_source": torch.from_numpy(module_source),
            "input_mode": torch.from_numpy(input_mode),
            "targets": torch.from_numpy(targets),
            "target_word": torch.from_numpy(target_word),
            "length": T,
        }


def collate_fn(batch: list[dict[str, Any]]) -> dict[str, torch.Tensor]:
    """
    Custom collate that stacks individual samples and builds an attention
    mask from the ``length`` field.
    """
    keys = ["word_ids", "grammar_ids", "continuous", "module_source", "input_mode", "targets", "target_word"]
    out: dict[str, torch.Tensor] = {}
    for k in keys:
        out[k] = torch.stack([b[k] for b in batch])

    lengths = torch.tensor([b["length"] for b in batch], dtype=torch.long)
    max_len = out["word_ids"].size(1)

    # Causal + padding mask: True where the position should be IGNORED
    # Shape: [B, T]
    padding_mask = torch.arange(max_len).unsqueeze(0) >= lengths.unsqueeze(1)
    out["padding_mask"] = padding_mask
    out["lengths"] = lengths

    return out
