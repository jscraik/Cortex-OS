import importlib.util
from pathlib import Path

import numpy as np
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


def test_generate_embedding_normalizes(monkeypatch):
    monkeypatch.setattr(eg, "MLX_AVAILABLE", True)

    class Stub(eg.MLXEmbeddingGenerator):
        def _load_model(self):
            pass

        def _can_use_mlx_model(self):
            return True

        def _generate_raw_embedding(self, text):
            return [3.0, 4.0]

    gen = Stub()
    emb = gen.generate_embedding("hello")
    assert pytest.approx(np.linalg.norm(emb), rel=1e-6) == 1.0
    assert emb == [0.6, 0.8]


def test_generate_embeddings_batch(monkeypatch):
    monkeypatch.setattr(eg, "MLX_AVAILABLE", True)

    class Stub(eg.MLXEmbeddingGenerator):
        def _load_model(self):
            pass

        def _can_use_mlx_model(self):
            return True

        def _generate_raw_embedding(self, text):
            return [1.0, 0.0]

    gen = Stub()
    res = gen.generate_embeddings(["a", "b"])
    assert len(res) == 2
    assert all(len(r) == 2 for r in res)
