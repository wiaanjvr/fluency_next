"""
Transformer-based Deep Knowledge Tracing (DKT) model.

Architecture overview
─────────────────────
Input per time-step:
    ┌─────────────────────────────────────────────┐
    │  word_embedding(64) ‖ grammar_tag_emb(16)   │
    │  ‖ module_source_emb(8) ‖ input_mode_emb(8) │
    │  ‖ continuous_features(7) → linear(d_model)  │
    └─────────────────────────────────────────────┘
             ↓  projected to d_model
    ┌─────────────────────────────┐
    │  + Learned Positional Emb   │
    └─────────────────────────────┘
             ↓
    ┌─────────────────────────────┐
    │  N × Transformer Encoder    │
    │  (causal attention mask)    │
    └─────────────────────────────┘
             ↓
    ┌─────────────────────────────────────────────────┐
    │  Knowledge State Head  →  per-word p_recall     │
    │  Forgetting Forecast   →  p_forget_48h, 7d      │
    │  Grammar Mastery Head  →  per-concept score      │
    └─────────────────────────────────────────────────┘

The model is auto-regressive: at each position t it can only attend to
positions ≤ t, so inference is causal.
"""

from __future__ import annotations

import math

import torch
import torch.nn as nn
import torch.nn.functional as F

from ..config import settings


# ── Positional encoding ────────────────────────────────────────────────────


class LearnedPositionalEncoding(nn.Module):
    """Learned position embeddings up to ``max_len``."""

    def __init__(self, d_model: int, max_len: int) -> None:
        super().__init__()
        self.pe = nn.Embedding(max_len, d_model)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [B, T, D]
        positions = torch.arange(x.size(1), device=x.device)
        return x + self.pe(positions).unsqueeze(0)


# ── Main model ──────────────────────────────────────────────────────────────


class TransformerDKT(nn.Module):
    """
    Transformer-based Deep Knowledge Tracing model.

    Parameters come from ``ModelConfig`` by default, but can be overridden
    for unit-testing or hyper-parameter sweeps.
    """

    def __init__(
        self,
        vocab_size: int,
        grammar_tag_count: int | None = None,
        *,
        d_model: int | None = None,
        nhead: int | None = None,
        num_layers: int | None = None,
        dim_feedforward: int | None = None,
        dropout: float | None = None,
        max_seq_len: int | None = None,
        word_embed_dim: int | None = None,
        module_source_count: int | None = None,
        input_mode_count: int | None = None,
        forecast_horizons: int = 2,
    ) -> None:
        super().__init__()

        cfg = settings.model
        self.d_model = d_model or cfg.d_model
        self.nhead = nhead or cfg.nhead
        self.num_layers = num_layers or cfg.num_layers
        self.dim_ff = dim_feedforward or cfg.dim_feedforward
        self.dropout_p = dropout or cfg.dropout
        self.max_seq_len = max_seq_len or cfg.max_seq_len
        self.vocab_size = vocab_size
        self.grammar_tag_count = grammar_tag_count or cfg.grammar_tag_count
        self.forecast_horizons = forecast_horizons

        _we = word_embed_dim or cfg.word_embed_dim
        _msc = module_source_count or cfg.module_source_count
        _imc = input_mode_count or cfg.input_mode_count

        # ── Embedding layers ────────────────────────────────────────────
        self.word_embedding = nn.Embedding(vocab_size, _we, padding_idx=0)
        self.grammar_tag_embedding = nn.Embedding(
            self.grammar_tag_count, 16, padding_idx=0
        )
        self.module_source_embedding = nn.Embedding(_msc, 8)
        self.input_mode_embedding = nn.Embedding(_imc, 8)

        # Total raw feature dim: word(64) + grammar(16) + module(8)
        #   + input_mode(8) + continuous(7) = 103
        _continuous_dim = 7
        _raw_dim = _we + 16 + 8 + 8 + _continuous_dim

        # Project raw features → d_model
        self.input_projection = nn.Sequential(
            nn.Linear(_raw_dim, self.d_model),
            nn.LayerNorm(self.d_model),
            nn.GELU(),
            nn.Dropout(self.dropout_p),
        )

        # ── Positional encoding ─────────────────────────────────────────
        self.pos_encoding = LearnedPositionalEncoding(self.d_model, self.max_seq_len)

        # ── Transformer encoder (causal) ────────────────────────────────
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=self.d_model,
            nhead=self.nhead,
            dim_feedforward=self.dim_ff,
            dropout=self.dropout_p,
            activation="gelu",
            batch_first=True,
            norm_first=True,
        )
        self.transformer = nn.TransformerEncoder(
            encoder_layer,
            num_layers=self.num_layers,
            enable_nested_tensor=False,
        )

        # ── Output heads ────────────────────────────────────────────────

        # 1. Per-word recall probability  →  dot-product with word embeddings
        #    We share the word embedding weight to compute logits
        self.recall_head = nn.Sequential(
            nn.Linear(self.d_model, self.d_model),
            nn.GELU(),
            nn.Dropout(self.dropout_p),
            nn.Linear(self.d_model, _we),  # project to word-embed space
        )

        # 2. Forgetting forecast: for each requested horizon, predict
        #    p(forget) as a scalar per word in the current step
        self.forget_head = nn.Sequential(
            nn.Linear(self.d_model + 1, self.d_model // 2),  # +1 for horizon input
            nn.GELU(),
            nn.Linear(self.d_model // 2, 1),
        )

        # 3. Grammar concept mastery: project knowledge state → per-tag score
        self.grammar_mastery_head = nn.Sequential(
            nn.Linear(self.d_model, self.d_model // 2),
            nn.GELU(),
            nn.Linear(self.d_model // 2, self.grammar_tag_count),
            nn.Sigmoid(),
        )

        # ── Init weights ────────────────────────────────────────────────
        self._init_weights()

    def _init_weights(self) -> None:
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)

    # ── Causal mask ─────────────────────────────────────────────────────

    @staticmethod
    def _causal_mask(T: int, device: torch.device) -> torch.Tensor:
        """Upper-triangular mask (True = masked) for causal attention."""
        return torch.triu(torch.ones(T, T, device=device, dtype=torch.bool), diagonal=1)

    # ── Forward ─────────────────────────────────────────────────────────

    def forward(
        self,
        word_ids: torch.Tensor,       # [B, T]
        grammar_ids: torch.Tensor,    # [B, T]
        continuous: torch.Tensor,     # [B, T, 7]
        module_source: torch.Tensor,  # [B, T]
        input_mode: torch.Tensor,     # [B, T]
        padding_mask: torch.Tensor,   # [B, T]  True=pad
        *,
        return_knowledge_state: bool = False,
    ) -> dict[str, torch.Tensor]:
        B, T = word_ids.shape
        device = word_ids.device

        # ── Build input features ────────────────────────────────────────
        we = self.word_embedding(word_ids)          # [B, T, 64]
        ge = self.grammar_tag_embedding(grammar_ids)  # [B, T, 16]
        me = self.module_source_embedding(module_source)  # [B, T, 8]
        ie = self.input_mode_embedding(input_mode)  # [B, T, 8]

        x = torch.cat([we, ge, me, ie, continuous], dim=-1)  # [B, T, 103]
        x = self.input_projection(x)               # [B, T, d_model]
        x = self.pos_encoding(x)                    # [B, T, d_model]

        # ── Transformer ────────────────────────────────────────────────
        causal = self._causal_mask(T, device)
        h = self.transformer(
            x,
            mask=causal,
            src_key_padding_mask=padding_mask,
        )  # [B, T, d_model]

        # ── Recall head: predict p(correct) for the *current step's word* ──
        #    Project hidden state into word-embedding space, then dot with
        #    the word embedding of the target word → scalar logit
        recall_proj = self.recall_head(h)           # [B, T, 64]
        # Dot product with the word embedding of the SAME step (teacher forcing)
        word_emb = self.word_embedding(word_ids)    # [B, T, 64]
        recall_logits = (recall_proj * word_emb).sum(dim=-1)  # [B, T]

        outputs: dict[str, torch.Tensor] = {
            "recall_logits": recall_logits,          # raw logits → BCE w/ logits
            "recall_probs": torch.sigmoid(recall_logits),
        }

        # ── Grammar mastery ────────────────────────────────────────────
        # Use the last non-padded hidden state for aggregate mastery
        outputs["grammar_mastery"] = self.grammar_mastery_head(h)  # [B, T, G]

        # ── Knowledge state (full-vocabulary recall probabilities) ──────
        if return_knowledge_state:
            # Project hidden state, dot with ALL word embeddings
            all_emb = self.word_embedding.weight  # [V, 64]
            recall_all = torch.matmul(recall_proj, all_emb.T)  # [B, T, V]
            outputs["knowledge_state"] = torch.sigmoid(recall_all)

            # Forgetting forecast for each horizon
            forget_probs_list = []
            for h_idx, hours in enumerate(settings.model.forecast_horizons_hours):
                # Normalise horizon: log1p(hours)
                h_norm = math.log1p(hours) / math.log1p(168.0)  # normalise to [0,1]
                horizon_input = torch.full(
                    (B, T, 1), h_norm, device=device, dtype=torch.float
                )
                forget_input = torch.cat([h, horizon_input], dim=-1)
                p_forget = torch.sigmoid(
                    self.forget_head(forget_input).squeeze(-1)
                )  # [B, T]
                forget_probs_list.append(p_forget)

            outputs["forget_probs"] = torch.stack(
                forget_probs_list, dim=-1
            )  # [B, T, H]

        return outputs

    # ── Convenience: get knowledge state for a single user ──────────────

    @torch.no_grad()
    def predict_knowledge_state(
        self,
        word_ids: torch.Tensor,
        grammar_ids: torch.Tensor,
        continuous: torch.Tensor,
        module_source: torch.Tensor,
        input_mode: torch.Tensor,
        lengths: torch.Tensor,
    ) -> dict[str, torch.Tensor]:
        """
        Run forward pass with ``return_knowledge_state=True`` and extract
        the knowledge state at the last valid position for each sample.
        """
        self.eval()
        B, T = word_ids.shape
        device = word_ids.device

        padding_mask = torch.arange(T, device=device).unsqueeze(0) >= lengths.unsqueeze(1)

        out = self.forward(
            word_ids,
            grammar_ids,
            continuous,
            module_source,
            input_mode,
            padding_mask,
            return_knowledge_state=True,
        )

        # Extract state at last valid time-step per batch element
        last_idx = (lengths - 1).clamp(min=0)  # [B]
        batch_idx = torch.arange(B, device=device)

        ks = out["knowledge_state"][batch_idx, last_idx]  # [B, V]
        fp = out["forget_probs"][batch_idx, last_idx]     # [B, H]
        gm = out["grammar_mastery"][batch_idx, last_idx]  # [B, G]

        return {
            "knowledge_state": ks,  # [B, V]
            "forget_probs": fp,     # [B, H]
            "grammar_mastery": gm,  # [B, G]
        }
