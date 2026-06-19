from __future__ import annotations

import gc

import torch


def get_device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


DEVICE = get_device()


def clear_memory() -> None:
    gc.collect()
    if DEVICE == "mps":
        torch.mps.empty_cache()
    elif torch.cuda.is_available():
        torch.cuda.empty_cache()
