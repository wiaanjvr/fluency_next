"""
DKT training loop.

Handles:
  - Full retrain (weekly) from scratch on all data
  - Fine-tune (daily) on recent events from the last checkpoint
  - Early stopping, gradient clipping, checkpointing
  - Train/val split by user (no user leakage)
"""

from __future__ import annotations

import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import numpy as np
import torch
import torch.nn as nn
from loguru import logger
from sklearn.model_selection import GroupShuffleSplit
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch.utils.data import DataLoader

from ..config import settings
from ..data.dataset import DKTDataset, collate_fn
from ..data.feature_engineering import (
    GrammarTagIndex,
    VocabIndex,
    build_user_sequences,
)
from ..data.supabase_client import fetch_all_baselines, fetch_all_events
from ..model.losses import DKTLoss
from ..model.transformer_dkt import TransformerDKT


# ── Helpers ─────────────────────────────────────────────────────────────────


def _get_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def _split_sequences_by_user(
    events: list[dict[str, Any]],
    test_size: float = 0.15,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """
    Split events so that all events from a user end up in either train or
    val — no user appears in both sets.
    """
    user_ids = [e["user_id"] for e in events]
    unique_users = list(set(user_ids))

    if len(unique_users) < 2:
        # Not enough users to split
        return events, []

    # Assign user index to each event
    user_to_idx = {u: i for i, u in enumerate(unique_users)}
    groups = np.array([user_to_idx[uid] for uid in user_ids])

    gss = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=42)
    train_idx, val_idx = next(gss.split(events, groups=groups))

    train_events = [events[i] for i in train_idx]
    val_events = [events[i] for i in val_idx]

    logger.info(
        f"Split: {len(train_events)} train events ({len(set(user_ids[i] for i in train_idx))} users), "
        f"{len(val_events)} val events ({len(set(user_ids[i] for i in val_idx))} users)"
    )
    return train_events, val_events


# ── Core training function ──────────────────────────────────────────────────


def train_dkt(
    *,
    since: datetime | None = None,
    resume_from: Path | None = None,
    max_epochs: int | None = None,
    learning_rate: float | None = None,
) -> dict[str, Any]:
    """
    Full training or fine-tuning run.

    Parameters
    ----------
    since : datetime, optional
        If set, only fetch events created after this time (for fine-tuning).
    resume_from : Path, optional
        Checkpoint to resume from. If None, train from scratch.
    max_epochs : int, optional
        Override config max_epochs.
    learning_rate : float, optional
        Override config learning_rate.

    Returns
    -------
    dict with training metrics.
    """
    cfg = settings.model
    paths = settings.paths
    device = _get_device()
    logger.info(f"Training on device: {device}")

    epochs = max_epochs or cfg.max_epochs
    lr = learning_rate or cfg.learning_rate

    # ── 1. Fetch data ──────────────────────────────────────────────────
    logger.info("Fetching interaction events from Supabase...")
    all_events = fetch_all_events(since=since)

    if len(all_events) == 0:
        logger.warning("No events found. Aborting training.")
        return {"status": "no_data"}

    baselines = fetch_all_baselines()
    logger.info(f"Loaded {len(baselines)} user baselines")

    # ── 2. Build/load vocab ────────────────────────────────────────────
    if resume_from and paths.vocab_map_path.exists():
        vocab = VocabIndex.load(paths.vocab_map_path)
        grammar_tags = GrammarTagIndex.load(paths.grammar_tag_map_path)
        build_vocab = True  # still add new words seen in recent data
    else:
        vocab = VocabIndex()
        grammar_tags = GrammarTagIndex()
        build_vocab = True

    # ── 3. Train/val split ─────────────────────────────────────────────
    train_events, val_events = _split_sequences_by_user(all_events)

    train_seqs = build_user_sequences(
        train_events, vocab, grammar_tags, baselines, build_vocab=build_vocab
    )
    val_seqs = build_user_sequences(
        val_events, vocab, grammar_tags, baselines, build_vocab=False
    )

    # Save vocab maps
    vocab.save(paths.vocab_map_path)
    grammar_tags.save(paths.grammar_tag_map_path)
    logger.info(f"Vocab size: {vocab.size}, Grammar tags: {grammar_tags.size}")

    # ── 4. DataLoaders ─────────────────────────────────────────────────
    train_ds = DKTDataset(train_seqs)
    val_ds = DKTDataset(val_seqs) if val_seqs else None

    train_loader = DataLoader(
        train_ds,
        batch_size=cfg.batch_size,
        shuffle=True,
        collate_fn=collate_fn,
        num_workers=0,
        pin_memory=(device.type == "cuda"),
    )
    val_loader = (
        DataLoader(
            val_ds,
            batch_size=cfg.batch_size,
            shuffle=False,
            collate_fn=collate_fn,
            num_workers=0,
        )
        if val_ds
        else None
    )

    # ── 5. Model ───────────────────────────────────────────────────────
    model = TransformerDKT(
        vocab_size=vocab.size,
        grammar_tag_count=grammar_tags.size,
    ).to(device)

    if resume_from and resume_from.exists():
        logger.info(f"Resuming from checkpoint: {resume_from}")
        state = torch.load(resume_from, map_location=device, weights_only=True)
        # Handle possible vocab size mismatch after new words
        _load_state_flexible(model, state["model_state_dict"])
    else:
        logger.info("Training from scratch")

    total_params = sum(p.numel() for p in model.parameters())
    logger.info(f"Model parameters: {total_params:,}")

    # ── 6. Optimiser & scheduler ───────────────────────────────────────
    optimiser = AdamW(model.parameters(), lr=lr, weight_decay=cfg.weight_decay)
    scheduler = CosineAnnealingLR(optimiser, T_max=epochs, eta_min=lr / 10)
    criterion = DKTLoss(smoothness_weight=0.01)

    # ── 7. Training loop ───────────────────────────────────────────────
    best_val_loss = float("inf")
    patience_counter = 0
    history: dict[str, list[float]] = defaultdict(list)

    for epoch in range(1, epochs + 1):
        t0 = time.time()

        # ── Train ──────────────────────────────────────────────────────
        model.train()
        epoch_loss = 0.0
        epoch_correct = 0
        epoch_total = 0

        for batch in train_loader:
            batch = {k: v.to(device) if isinstance(v, torch.Tensor) else v for k, v in batch.items()}

            out = model(
                word_ids=batch["word_ids"],
                grammar_ids=batch["grammar_ids"],
                continuous=batch["continuous"],
                module_source=batch["module_source"],
                input_mode=batch["input_mode"],
                padding_mask=batch["padding_mask"],
            )

            losses = criterion(
                out["recall_logits"],
                batch["targets"],
                batch["padding_mask"],
            )

            optimiser.zero_grad()
            losses["total_loss"].backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimiser.step()

            # Metrics
            active = ~batch["padding_mask"]
            preds = (out["recall_probs"] > 0.5).float()
            epoch_correct += ((preds == batch["targets"]) & active).sum().item()
            epoch_total += active.sum().item()
            epoch_loss += losses["total_loss"].item() * active.sum().item()

        scheduler.step()

        train_loss = epoch_loss / max(epoch_total, 1)
        train_acc = epoch_correct / max(epoch_total, 1)
        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)

        # ── Validate ───────────────────────────────────────────────────
        val_loss = float("inf")
        val_acc = 0.0
        if val_loader is not None:
            val_loss, val_acc = _evaluate(model, val_loader, criterion, device)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)

        elapsed = time.time() - t0
        logger.info(
            f"Epoch {epoch}/{epochs} — "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.3f} | "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.3f} | "
            f"{elapsed:.1f}s"
        )

        # ── Checkpointing & early stopping ─────────────────────────────
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            _save_checkpoint(model, optimiser, epoch, val_loss, paths.best_model_path)
            logger.info(f"  ✓ New best model saved (val_loss={val_loss:.4f})")
        else:
            patience_counter += 1
            if patience_counter >= cfg.patience:
                logger.info(f"Early stopping at epoch {epoch}")
                break

    return {
        "status": "completed",
        "best_val_loss": best_val_loss,
        "epochs_trained": epoch,
        "vocab_size": vocab.size,
        "grammar_tag_count": grammar_tags.size,
        "history": dict(history),
    }


# ── Fine-tune convenience ──────────────────────────────────────────────────


def finetune_dkt(days: int = 1) -> dict[str, Any]:
    """
    Fine-tune the best checkpoint on recent events (last N days).
    Uses a lower learning rate and fewer epochs.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)
    best = settings.paths.best_model_path

    if not best.exists():
        logger.warning("No checkpoint found — running full train instead")
        return train_dkt()

    return train_dkt(
        since=since,
        resume_from=best,
        max_epochs=5,
        learning_rate=settings.model.learning_rate / 10,
    )


# ── Internal helpers ────────────────────────────────────────────────────────


def _evaluate(
    model: TransformerDKT,
    loader: DataLoader,
    criterion: DKTLoss,
    device: torch.device,
) -> tuple[float, float]:
    model.eval()
    total_loss = 0.0
    total_correct = 0
    total_active = 0

    with torch.no_grad():
        for batch in loader:
            batch = {k: v.to(device) if isinstance(v, torch.Tensor) else v for k, v in batch.items()}

            out = model(
                word_ids=batch["word_ids"],
                grammar_ids=batch["grammar_ids"],
                continuous=batch["continuous"],
                module_source=batch["module_source"],
                input_mode=batch["input_mode"],
                padding_mask=batch["padding_mask"],
            )

            losses = criterion(
                out["recall_logits"],
                batch["targets"],
                batch["padding_mask"],
            )

            active = ~batch["padding_mask"]
            preds = (out["recall_probs"] > 0.5).float()
            total_correct += ((preds == batch["targets"]) & active).sum().item()
            total_active += active.sum().item()
            total_loss += losses["total_loss"].item() * active.sum().item()

    return (
        total_loss / max(total_active, 1),
        total_correct / max(total_active, 1),
    )


def _save_checkpoint(
    model: TransformerDKT,
    optimiser: AdamW,
    epoch: int,
    val_loss: float,
    path: Path,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "epoch": epoch,
            "val_loss": val_loss,
            "model_state_dict": model.state_dict(),
            "optimiser_state_dict": optimiser.state_dict(),
            "vocab_size": model.vocab_size,
            "grammar_tag_count": model.grammar_tag_count,
            "d_model": model.d_model,
            "nhead": model.nhead,
            "num_layers": model.num_layers,
        },
        path,
    )


def _load_state_flexible(
    model: TransformerDKT,
    state_dict: dict[str, torch.Tensor],
) -> None:
    """
    Load state dict while handling embedding size mismatches gracefully.
    If the vocab grew since the last checkpoint, the new embeddings are
    initialised randomly.
    """
    model_sd = model.state_dict()
    for key in state_dict:
        if key in model_sd:
            if state_dict[key].shape == model_sd[key].shape:
                model_sd[key] = state_dict[key]
            else:
                # Partial copy (e.g. embedding grew)
                src = state_dict[key]
                dst = model_sd[key]
                slices = tuple(slice(0, min(s, d)) for s, d in zip(src.shape, dst.shape))
                dst[slices] = src[slices]
                logger.warning(
                    f"Partial load for {key}: {src.shape} → {dst.shape}"
                )
    model.load_state_dict(model_sd)
