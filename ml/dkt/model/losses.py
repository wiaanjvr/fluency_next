"""
Loss functions for DKT training.

Primary loss: Binary cross-entropy on the `correct` prediction.
Auxiliary losses: Knowledge-state smoothness regularisation.
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class DKTLoss(nn.Module):
    """
    Combined loss for Transformer DKT.

    Components
    ----------
    1. **BCE loss** — Binary cross-entropy (with logits) on the per-step
       correct/incorrect prediction.  Only non-padded positions contribute.

    2. **Temporal smoothness** (optional) — small L2 penalty on the
       difference between consecutive knowledge-state vectors, encouraging
       the model to change mastery gradually rather than erratically.
       Weight controlled by ``smoothness_weight``.
    """

    def __init__(self, smoothness_weight: float = 0.01) -> None:
        super().__init__()
        self.smoothness_weight = smoothness_weight

    def forward(
        self,
        recall_logits: torch.Tensor,  # [B, T]
        targets: torch.Tensor,        # [B, T]  0.0 or 1.0
        padding_mask: torch.Tensor,   # [B, T]  True = pad
        knowledge_state: torch.Tensor | None = None,  # [B, T, V] (optional)
    ) -> dict[str, torch.Tensor]:
        # ── Mask out padding ────────────────────────────────────────────
        active = ~padding_mask  # True where valid
        active_float = active.float()
        num_active = active_float.sum().clamp(min=1.0)

        # ── Primary BCE ─────────────────────────────────────────────────
        bce = F.binary_cross_entropy_with_logits(
            recall_logits, targets, reduction="none"
        )
        bce_loss = (bce * active_float).sum() / num_active

        total = bce_loss
        out = {"bce_loss": bce_loss}

        # ── Temporal smoothness ─────────────────────────────────────────
        if knowledge_state is not None and self.smoothness_weight > 0:
            # Difference between consecutive timesteps
            ks_diff = knowledge_state[:, 1:, :] - knowledge_state[:, :-1, :]
            smooth_mask = active_float[:, 1:].unsqueeze(-1)
            smooth_loss = (ks_diff.pow(2) * smooth_mask).sum() / smooth_mask.sum().clamp(min=1.0)
            total = total + self.smoothness_weight * smooth_loss
            out["smooth_loss"] = smooth_loss

        out["total_loss"] = total
        return out
