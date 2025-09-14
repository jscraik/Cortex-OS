from __future__ import annotations

# pyright: reportUnknownVariableType=false, reportUnknownMemberType=false, reportUnknownArgumentType=false
import math
import os
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "apps" / "cortex-py" / "src"
if str(SRC) not in sys.path:  # pragma: no cover - deterministic path setup
    sys.path.insert(0, str(SRC))

from mlx.embedding_generator import (
    MLXEmbeddingGenerator,  # type: ignore[import-not-found]
)


def test_embedding_generator_sentence_transformers_encode_path_normalization() -> None:
    """Force sentence-transformers encode path and ensure normalization + dimension correction branches."""
    prev_fast = os.environ.get("CORTEX_PY_FAST_TEST")
    if "CORTEX_PY_FAST_TEST" in os.environ:
        del os.environ["CORTEX_PY_FAST_TEST"]

    gen = MLXEmbeddingGenerator(model_name="qwen3-embedding-4b-mlx")

    class DummyST:  # minimal encode stub
        def __init__(self, dims: int):
            self.dims = dims

        def encode(
            self,
            _text: str,
            convert_to_numpy: bool = True,
            normalize_embeddings: bool = True,
        ) -> list[float]:
            arr = np.arange(self.dims, dtype=float) + 1.0
            if normalize_embeddings:
                arr = arr / np.linalg.norm(arr)
            result = arr.tolist()
            # Ensure type list[float] for static analysis
            return [float(x) for x in result]

    gen.model = DummyST(int(gen.model_config["dimensions"]))  # patched backend
    emb = gen.generate_embedding("hello world", normalize=True)
    assert isinstance(emb, list)
    assert len(emb) == int(gen.model_config["dimensions"])
    assert math.isclose(
        float(np.linalg.norm(np.array(emb))), 1.0, rel_tol=1e-9, abs_tol=1e-9
    )
    if prev_fast is not None:
        os.environ["CORTEX_PY_FAST_TEST"] = prev_fast


def test_embedding_generator_fast_mode_batch_zero_vectors() -> None:
    prev_fast = os.environ.get("CORTEX_PY_FAST_TEST")
    os.environ["CORTEX_PY_FAST_TEST"] = "1"
    gen = MLXEmbeddingGenerator(model_name="qwen3-embedding-4b-mlx")
    batch = gen.generate_embeddings(["a", "b", "c"])
    assert len(batch) == 3 and all(len(row) == len(batch[0]) for row in batch)
    assert all(all(math.isclose(v, 0.0, abs_tol=1e-12) for v in row) for row in batch)
    if prev_fast is not None:
        os.environ["CORTEX_PY_FAST_TEST"] = prev_fast
    else:  # pragma: no cover - cleanup branch
        del os.environ["CORTEX_PY_FAST_TEST"]
