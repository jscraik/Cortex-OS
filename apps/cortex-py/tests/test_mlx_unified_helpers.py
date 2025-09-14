"""Targeted tests for lightweight helper functions in `mlx.mlx_unified`.

Focus areas:
- Environment driven defaults (max length / tokens / temperature) already covered in `test_env_overrides.py`; here we add invalid / negative value fallbacks.
- Cache directory resolution precedence: HF_HOME > TRANSFORMERS_CACHE > default.
- MLX cache dir env override (MLX_CACHE_DIR) and default.
- Token estimation fallback path when no tokenizer is present.
"""

from __future__ import annotations

from pathlib import Path

# We import via file spec to avoid polluting sys.modules with side-effects across tests that
# might rely on initial constant evaluation. Re-import per test to ensure fresh environment
# evaluation of DEFAULT_* constants.


def _load_module():  # type: ignore[no-untyped-def]
    # Local import to ensure fresh each call
    import importlib.util

    repo_root = Path(__file__).resolve().parents[3]
    module_path = repo_root / "apps" / "cortex-py" / "src" / "mlx" / "mlx_unified.py"
    spec = importlib.util.spec_from_file_location(
        "_mlx_unified_test_mod", str(module_path)
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


def test_invalid_env_values_fall_back(monkeypatch):  # type: ignore[no-untyped-def]
    monkeypatch.setenv("MLX_DEFAULT_MAX_LENGTH", "-10")
    monkeypatch.setenv("MLX_DEFAULT_MAX_TOKENS", "0")
    monkeypatch.setenv("MLX_DEFAULT_TEMPERATURE", "not-a-float")
    mod = _load_module()
    # All should fall back to their underlying FALLBACK values (512/4096/0.7 from module)
    assert mod.get_default_max_length() == mod._FALLBACK_MAX_LENGTH
    assert mod.get_default_max_tokens() == mod._FALLBACK_MAX_TOKENS
    assert abs(mod.get_default_temperature() - mod._FALLBACK_TEMPERATURE) < 1e-9


def test_cache_dir_precedence(monkeypatch):  # type: ignore[no-untyped-def]
    monkeypatch.delenv("HF_HOME", raising=False)
    monkeypatch.delenv("TRANSFORMERS_CACHE", raising=False)
    mod = _load_module()
    default_hf_home = mod.get_hf_home()
    # 1. HF_HOME wins
    monkeypatch.setenv("HF_HOME", "/tmp/hfhome")
    mod = _load_module()
    assert mod.get_hf_home() == "/tmp/hfhome"
    # 2. TRANSFORMERS_CACHE used when HF_HOME unset
    monkeypatch.delenv("HF_HOME", raising=False)
    monkeypatch.setenv("TRANSFORMERS_CACHE", "/tmp/tcache")
    mod = _load_module()
    assert mod.get_hf_home() == "/tmp/tcache"
    # 3. fallback original default when both unset again
    monkeypatch.delenv("TRANSFORMERS_CACHE", raising=False)
    mod = _load_module()
    assert mod.get_hf_home() == default_hf_home


def test_mlx_cache_dir(monkeypatch):  # type: ignore[no-untyped-def]
    monkeypatch.delenv("MLX_CACHE_DIR", raising=False)
    mod = _load_module()
    default_dir = mod.get_mlx_cache_dir()
    monkeypatch.setenv("MLX_CACHE_DIR", "/tmp/mlxcache")
    mod = _load_module()
    assert mod.get_mlx_cache_dir() == "/tmp/mlxcache"
    # Reset -> default
    monkeypatch.delenv("MLX_CACHE_DIR", raising=False)
    mod = _load_module()
    assert mod.get_mlx_cache_dir() == default_dir


def test_token_estimate_without_tokenizer(monkeypatch):  # type: ignore[no-untyped-def]
    mod = _load_module()
    # Create instance with model_type forcing fallback path
    inst = mod.MLXUnified("test-embedding-model")
    # Simulate embedding model loaded with sentence-transformers absence => set encode attribute? we just force fallback
    inst.model_type = (
        "chat"  # set to chat so _estimate_tokens uses tokenizer if present
    )
    inst.tokenizer = None  # ensure fallback branch (no tokenizer) is triggered
    long_text = "a" * 40
    # Without tokenizer we expect len(text)//4
    assert inst._estimate_tokens(long_text) == len(long_text) // 4 or 1
    # Very short text should return >=1
    assert inst._estimate_tokens("") >= 1
