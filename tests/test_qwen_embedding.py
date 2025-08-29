"""Tests Qwen embedding and reranker models from a local HuggingFace cache.

These tests are skipped unless the required models are present under
``HF_CACHE_PATH`` and the necessary libraries (``sentence_transformers``,
``transformers`` and ``torch``) are installed.

To run the tests manually:

    HF_CACHE_PATH=/path/to/hf-cache pytest tests/test_qwen_embedding.py
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest

HF_CACHE = Path(os.environ.get("HF_CACHE_PATH", "~/.cache/huggingface")).expanduser()


def ensure_model(name: str) -> Path:
    """Ensure the given Qwen model is available in the cache or skip."""
    path = HF_CACHE / f"hub/models--Qwen--{name}"
    if not path.exists():
        pytest.skip(f"{name} model not found in cache: {path}")
    return path


def test_sentence_transformers_embedding() -> None:
    """Embed text using sentence-transformers implementation."""
    ensure_model("Qwen3-Embedding-0.6B")
    sentence_transformers = pytest.importorskip("sentence_transformers")
    model = sentence_transformers.SentenceTransformer(
        "Qwen/Qwen3-Embedding-0.6B", cache_folder=str(HF_CACHE)
    )
    embedding = model.encode(["Hello world"])
    assert embedding.shape[0] == 1 and embedding.shape[1] > 0


def test_transformers_embedding() -> None:
    """Embed text using transformers directly."""
    ensure_model("Qwen3-Embedding-0.6B")
    transformers = pytest.importorskip("transformers")
    torch = pytest.importorskip("torch")
    tokenizer = transformers.AutoTokenizer.from_pretrained(
        "Qwen/Qwen3-Embedding-0.6B", cache_dir=str(HF_CACHE), local_files_only=True
    )
    model = transformers.AutoModel.from_pretrained(
        "Qwen/Qwen3-Embedding-0.6B", cache_dir=str(HF_CACHE), local_files_only=True
    )
    inputs = tokenizer("Hello world", return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)
        embedding = outputs.last_hidden_state.mean(dim=1)
    assert embedding.shape[1] > 0


def test_transformers_reranker() -> None:
    """Score relevance using the Qwen reranker model."""
    ensure_model("Qwen3-Reranker-4B")
    transformers = pytest.importorskip("transformers")
    torch = pytest.importorskip("torch")
    tokenizer = transformers.AutoTokenizer.from_pretrained(
        "Qwen/Qwen3-Reranker-4B", cache_dir=str(HF_CACHE), local_files_only=True
    )
    model = transformers.AutoModelForSequenceClassification.from_pretrained(
        "Qwen/Qwen3-Reranker-4B", cache_dir=str(HF_CACHE), local_files_only=True
    )
    inputs = tokenizer("What is machine learning?", "Machine learning is a subset of AI.", return_tensors="pt", padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
        score = torch.sigmoid(outputs.logits).item()
    assert 0.0 <= score <= 1.0

