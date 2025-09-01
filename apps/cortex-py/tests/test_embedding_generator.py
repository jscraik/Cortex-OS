import importlib.util
from pathlib import Path

import pytest

repo_root = Path(__file__).resolve().parents[3]
module_path = (
    repo_root / "apps" / "cortex-py" / "src" / "mlx" / "embedding_generator.py"
)
spec = importlib.util.spec_from_file_location("embedding_generator", str(module_path))
eg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(eg)


def test_init_fails_without_mlx(monkeypatch):
    monkeypatch.setattr(eg, "MLX_AVAILABLE", False)
    with pytest.raises(RuntimeError):
        eg.MLXEmbeddingGenerator()
