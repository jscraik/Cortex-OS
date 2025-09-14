import importlib
import importlib.util
from pathlib import Path


def load_module():
    repo_root = Path(__file__).resolve().parents[3]
    module_path = repo_root / "apps" / "cortex-py" / "src" / "mlx" / "mlx_unified.py"
    spec = importlib.util.spec_from_file_location("mlx_env_mod", str(module_path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore
    return module


def test_env_overrides_max_length(monkeypatch):
    monkeypatch.setenv("MLX_DEFAULT_MAX_LENGTH", "1024")
    mod = load_module()
    assert mod.get_default_max_length() == 1024
    assert mod.DEFAULT_MAX_LENGTH == 1024


def test_env_overrides_max_tokens(monkeypatch):
    monkeypatch.setenv("MLX_DEFAULT_MAX_TOKENS", "2048")
    mod = load_module()
    assert mod.get_default_max_tokens() == 2048
    assert mod.DEFAULT_MAX_TOKENS == 2048


def test_env_overrides_temperature(monkeypatch):
    monkeypatch.setenv("MLX_DEFAULT_TEMPERATURE", "0.9")
    mod = load_module()
    assert abs(mod.get_default_temperature() - 0.9) < 1e-9
    assert abs(mod.DEFAULT_TEMPERATURE - 0.9) < 1e-9
