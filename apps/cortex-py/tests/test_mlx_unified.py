import importlib.util
from pathlib import Path
from unittest.mock import MagicMock

import pytest

# Load module directly from file path to avoid import issues with hyphenated
# package directories (apps/cortex-py). This makes tests independent of
# how the package is installed.
repo_root = Path(__file__).resolve().parents[3]
module_path = repo_root / "apps" / "cortex-py" / "src" / "mlx" / "mlx_unified.py"
spec = importlib.util.spec_from_file_location("mlx_unified", str(module_path))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

MLXUnified = mod.MLXUnified
FALLBACK_TEST_TEXT = getattr(mod, "FALLBACK_TEST_TEXT", "test")


class DummyTokenizer:
    def __init__(self):
        pass

    def __call__(self, text, return_tensors=None, truncation=None, max_length=None):
        return {"input_ids": "dummy", "attention_mask": "dummy"}

    def encode(self, text):
        return list(range(len(text.split())))


class DummyOutputs:
    def __init__(self, tensor):
        self.last_hidden_state = tensor


class DummyModel:
    def __init__(self, last_hidden_state):
        self._lh = last_hidden_state

    def __call__(self, **kwargs):
        return DummyOutputs(self._lh)


def test_module_imports_without_instructor(monkeypatch):
    import sys

    monkeypatch.delitem(sys.modules, "instructor", raising=False)
    spec = importlib.util.spec_from_file_location("mlx_unified_no_inst", str(module_path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert module.instructor is None
    assert hasattr(module, "ChatResponse")


def test_cache_dir_overrides(monkeypatch):
    import os

    monkeypatch.setenv("HF_HOME", "/tmp/hf")
    monkeypatch.setenv("TRANSFORMERS_CACHE", "/tmp/transformers")
    monkeypatch.setenv("MLX_CACHE_DIR", "/tmp/mlx")

    spec = importlib.util.spec_from_file_location("mlx_unified_cache", str(module_path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    assert module.get_hf_home() == "/tmp/hf"
    assert module.get_transformers_cache() == "/tmp/transformers"
    assert module.get_mlx_cache_dir() == "/tmp/mlx"


def test_generate_embedding_valid(monkeypatch):
    model = MLXUnified("embedding-model")
    model.model_type = "embedding"
    model.tokenizer = DummyTokenizer()
    import torch

    tensor = torch.zeros((1, 4, 16))
    model.model = DummyModel(tensor)

    emb = model.generate_embedding("hello world")
    assert isinstance(emb, list)
    assert len(emb) == 16


def test_generate_embedding_invalid_input():
    model = MLXUnified("embedding-model")
    model.model_type = "embedding"
    with pytest.raises(ValueError):
        model.generate_embedding("")


def test_generate_chat_validation():
    model = MLXUnified("chat-model")
    model.model_type = "chat"
    model.model = MagicMock()
    model.tokenizer = DummyTokenizer()

    with pytest.raises(ValueError):
        model.generate_chat([])

    with pytest.raises(ValueError):
        model.generate_chat([{"role": "user"}])


def test_generate_reranking_cosine(monkeypatch):
    model = MLXUnified("rerank-model")
    model.model_type = "reranking"
    import torch

    # create tensor where last_hidden_state shape (1, seq_len, dim)
    tensor = torch.randn((1, 8, 32))
    model.tokenizer = DummyTokenizer()
    model.model = DummyModel(tensor)

    scores = model.generate_reranking("q", ["a", "b"])
    assert isinstance(scores, list)
    assert all("score" in s for s in scores)


def test_cli_fallback_text(monkeypatch, capsys):
    monkeypatch.setattr("sys.argv", ["mlx_unified.py", "--model", "embedding-model"])

    # stub MLXUnified to avoid heavy loads
    class Stub(MLXUnified):
        def load_model(self):
            self.model = True
            self.tokenizer = DummyTokenizer()

        def generate_embedding(self, text):
            return [0.0]

    monkeypatch.setattr(mod, "MLXUnified", Stub)
    mod.main()
    captured = capsys.readouterr()
    assert "Model: embedding-model" in captured.out
