import os
from typing import Any

from _pytest.monkeypatch import MonkeyPatch  # type: ignore


def test_full_init_sentence_transformers_path(monkeypatch: MonkeyPatch) -> None:
    # Ensure fast mode disabled
    os.environ.pop("CORTEX_PY_FAST_TEST", None)

    import mlx.embedding_generator as eg

    # Force only sentence-transformers backend path
    monkeypatch.setattr(eg, "MLX_AVAILABLE", False, raising=False)
    monkeypatch.setattr(eg, "mx", None, raising=False)
    monkeypatch.setattr(eg, "load", None, raising=False)

    # Provide minimal model config with small dimensions
    def fake_load_model_config(
        _path: str | None = None,
    ) -> dict[str, dict[str, Any]]:  # pragma: no cover - simple shim
        return {
            "qwen3-embedding-4b-mlx": {
                "path": "dummy-model",
                "dimensions": 8,
                "context_length": 16,
                "memory_gb": 0.1,
            }
        }

    monkeypatch.setattr(eg, "load_model_config", fake_load_model_config)

    class DummyST:
        def __init__(self, *_a: object, **_k: object) -> None:
            self.dims = 8

        def encode(
            self,
            text: str,
            convert_to_numpy: bool = True,
            normalize_embeddings: bool = True,
        ) -> Any:
            import numpy as np

            arr = np.arange(self.dims, dtype=float) + 1.0
            if normalize_embeddings:
                arr = arr / (np.linalg.norm(arr) or 1.0)
            return arr if convert_to_numpy else arr.tolist()

    monkeypatch.setattr(eg, "SentenceTransformer", DummyST, raising=False)
    monkeypatch.setattr(eg, "SENTENCE_TRANSFORMERS_AVAILABLE", True, raising=False)

    gen = eg.MLXEmbeddingGenerator()
    emb = gen.generate_embedding("hello world", normalize=True)
    assert isinstance(emb, list)
    assert len(emb) == 8
    # Norm should be 1 (allow small float error)
    import numpy as np

    assert abs(np.linalg.norm(emb) - 1.0) < 1e-6

    info = gen.get_model_info()
    assert info["backend"] == "sentence-transformers"
    assert info["model_loaded"] is True
