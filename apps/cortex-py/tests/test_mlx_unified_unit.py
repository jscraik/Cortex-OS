import importlib
from unittest.mock import MagicMock, patch

import pytest

MODULE_PATH = "mlx.mlx_unified"


def reload_module():
    if MODULE_PATH in importlib.sys.modules:
        del importlib.sys.modules[MODULE_PATH]
    return importlib.import_module(MODULE_PATH)


def test_env_int_float_readers_and_defaults(monkeypatch):
    mod = reload_module()
    # Ensure defaults first
    assert mod.get_default_max_length() == mod._FALLBACK_MAX_LENGTH
    assert mod.get_default_max_tokens() == mod._FALLBACK_MAX_TOKENS
    assert mod.get_default_temperature() == mod._FALLBACK_TEMPERATURE

    # Valid overrides
    monkeypatch.setenv("MLX_DEFAULT_MAX_LENGTH", "1024")
    monkeypatch.setenv("MLX_DEFAULT_MAX_TOKENS", "2048")
    monkeypatch.setenv("MLX_DEFAULT_TEMPERATURE", "0.9")
    mod = reload_module()
    assert mod.get_default_max_length() == 1024
    assert mod.get_default_max_tokens() == 2048
    assert mod.get_default_temperature() == 0.9

    # Invalid (negative / non-numeric) -> fallback
    monkeypatch.setenv("MLX_DEFAULT_MAX_LENGTH", "-5")
    monkeypatch.setenv("MLX_DEFAULT_MAX_TOKENS", "abc")
    monkeypatch.setenv("MLX_DEFAULT_TEMPERATURE", "0")
    mod = reload_module()
    assert mod.get_default_max_length() == mod._FALLBACK_MAX_LENGTH
    assert mod.get_default_max_tokens() == mod._FALLBACK_MAX_TOKENS
    assert mod.get_default_temperature() == mod._FALLBACK_TEMPERATURE


def test_cache_helpers_precedence(monkeypatch):
    mod = reload_module()
    # Baseline
    base_hf = mod.get_hf_home()
    assert base_hf

    # HF_HOME precedence
    monkeypatch.setenv("HF_HOME", "/tmp/hf_custom")
    assert reload_module().get_hf_home() == "/tmp/hf_custom"

    # TRANSFORMERS_CACHE when HF_HOME unset
    monkeypatch.delenv("HF_HOME", raising=False)
    monkeypatch.setenv("TRANSFORMERS_CACHE", "/tmp/transformers_cache")
    assert reload_module().get_hf_home() == "/tmp/transformers_cache"

    # MLX cache dir
    monkeypatch.setenv("MLX_CACHE_DIR", "/tmp/mlx_cache")
    assert reload_module().get_mlx_cache_dir() == "/tmp/mlx_cache"


def test_model_type_inference():
    mod = reload_module()
    emb = mod.MLXUnified("awesome-embedding-model")
    assert emb.model_type == "embedding"
    rer = mod.MLXUnified("semantic-rerank-model")
    assert rer.model_type == "reranking"
    chat = mod.MLXUnified("cool-chat-model")
    assert chat.model_type == "chat"
    default = mod.MLXUnified("mystery-model")
    assert default.model_type == "chat"  # default fallback


def test_constructor_validation():
    mod = reload_module()
    with pytest.raises(ValueError):
        mod.MLXUnified("")
    with pytest.raises(ValueError):
        mod.MLXUnified(None)  # type: ignore[arg-type]


def test_generate_chat_fallback_path(monkeypatch):
    mod = reload_module()
    ux = mod.MLXUnified("cool-chat-model")
    ux.model_type = "chat"
    # Force model presence & capabilities flags for fallback
    ux.model = object()
    ux.mlx_available = False
    ux.torch_available = False
    # Patch fallback method to observe invocation
    with patch.object(
        ux,
        "_generate_chat_fallback",
        return_value={
            "content": "ok",
            "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
        },
    ) as mock_fb:
        result = ux.generate_chat([{"role": "user", "content": "hi"}])
        assert result["content"] == "ok"
        mock_fb.assert_called_once()


def test_negative_embedding_call(monkeypatch):
    mod = reload_module()
    emb = mod.MLXUnified("awesome-embedding-model")
    # Provide fake model backend with encode for embedding path
    fake_model = MagicMock()
    fake_model.encode.return_value = MagicMock()
    fake_model.encode.return_value.tolist.return_value = [0.1, 0.2]
    emb.model_type = "embedding"
    emb.model = fake_model
    emb.sentence_transformers_available = True

    vec = emb.generate_embedding("hello")
    assert vec == [0.1, 0.2]
    with pytest.raises(ValueError):
        emb.generate_embedding("")
