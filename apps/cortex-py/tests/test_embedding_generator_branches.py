import importlib.util
import os
from pathlib import Path
from typing import Any, cast

import numpy as np
import pytest

# Load embedding_generator dynamically
repo_root = Path(__file__).resolve().parents[3]
module_path = (
    repo_root / "apps" / "cortex-py" / "src" / "mlx" / "embedding_generator.py"
)
spec = importlib.util.spec_from_file_location(
    "embedding_generator_branch", str(module_path)
)
if spec is None or spec.loader is None:  # pragma: no cover - environment anomaly
    pytest.skip("Cannot load embedding_generator module spec")
emb_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(emb_mod)


class STLike:
    def __init__(self, dims: int, return_list: bool = False) -> None:
        self.dims = dims
        self._return_list = return_list

    def encode(
        self,
        text: str,
        convert_to_numpy: bool = True,  # kept for interface similarity
        normalize_embeddings: bool = True,
    ) -> list[float]:
        base = np.arange(self.dims, dtype=float)
        if normalize_embeddings:
            n = float(np.linalg.norm(base))
            if n > 0:
                base = base / n
        return cast(list[float], base.tolist())


def _fresh_reload() -> Any:
    # Ensure environment state isolation
    import sys

    if "embedding_generator_branch" in sys.modules:
        del sys.modules["embedding_generator_branch"]
    spec2 = importlib.util.spec_from_file_location(
        "embedding_generator_branch", str(module_path)
    )
    if spec2 is None or spec2.loader is None:  # pragma: no cover - environment anomaly
        pytest.skip("Cannot reload embedding_generator module spec")
    mod2 = importlib.util.module_from_spec(spec2)
    # mypy/pyright: loader is not None here due to guard above
    assert spec2.loader is not None  # nosec - test helper assertion
    spec2.loader.exec_module(mod2)
    return mod2


def test_dimension_correction_oversize(monkeypatch: pytest.MonkeyPatch) -> None:
    os.environ.pop("CORTEX_PY_FAST_TEST", None)
    mod = _fresh_reload()
    monkeypatch.setattr(mod, "MLX_AVAILABLE", True)
    monkeypatch.setattr(mod, "SENTENCE_TRANSFORMERS_AVAILABLE", False)

    class Stub(mod.MLXEmbeddingGenerator):  # type: ignore[name-defined,misc]
        def _load_model(self) -> None:
            self.model = object()
            self.tokenizer = object()

        def _can_use_mlx_model(self) -> bool:
            return True

        def _generate_raw_embedding(self, text: str) -> list[float]:
            return [1.0] * (int(self.model_config["dimensions"]) + 5)

    gen = Stub()
    emb_raw = gen.generate_embedding("x")
    # Raw embedding should be oversized (+5)
    assert len(emb_raw) == int(gen.model_config["dimensions"]) + 5
    # Apply correction helper explicitly to exercise branch
    emb = gen._ensure_correct_dimensions(emb_raw)
    assert len(emb) == int(gen.model_config["dimensions"])  # truncated to expected size


def test_dimension_correction_undersize(monkeypatch: pytest.MonkeyPatch) -> None:
    os.environ.pop("CORTEX_PY_FAST_TEST", None)
    mod = _fresh_reload()
    monkeypatch.setattr(mod, "MLX_AVAILABLE", True)
    monkeypatch.setattr(mod, "SENTENCE_TRANSFORMERS_AVAILABLE", False)

    class Stub(mod.MLXEmbeddingGenerator):  # type: ignore[name-defined,misc]
        def _load_model(self) -> None:
            self.model = object()
            self.tokenizer = object()

        def _can_use_mlx_model(self) -> bool:
            return True

        def _generate_raw_embedding(self, text: str) -> list[float]:
            return [1.0] * (int(self.model_config["dimensions"]) - 3)

    gen = Stub()
    emb_raw = gen.generate_embedding("x")
    # Raw embedding should be undersized (-3)
    assert len(emb_raw) == int(gen.model_config["dimensions"]) - 3
    emb = gen._ensure_correct_dimensions(emb_raw)
    assert len(emb) == int(gen.model_config["dimensions"])  # padded to expected size
    assert abs(emb[-1] - 0.0) < 1e-12  # padding zeros at tail


def test_no_normalize_branch(monkeypatch: pytest.MonkeyPatch) -> None:
    os.environ.pop("CORTEX_PY_FAST_TEST", None)
    mod = _fresh_reload()
    monkeypatch.setattr(mod, "MLX_AVAILABLE", True)
    monkeypatch.setattr(mod, "SENTENCE_TRANSFORMERS_AVAILABLE", False)

    class Stub(mod.MLXEmbeddingGenerator):  # type: ignore[name-defined,misc]
        def _load_model(self) -> None:
            self.model = object()
            self.tokenizer = object()

        def _can_use_mlx_model(self) -> bool:
            return True

        def _generate_raw_embedding(self, text: str) -> list[float]:
            return [2.0, 0.0]

    gen = Stub()
    emb = gen.generate_embedding("x", normalize=False)
    assert emb == [2.0, 0.0]


def test_sentence_transformers_list_return(monkeypatch: pytest.MonkeyPatch) -> None:
    os.environ.pop("CORTEX_PY_FAST_TEST", None)
    mod = _fresh_reload()
    monkeypatch.setattr(mod, "MLX_AVAILABLE", False)
    monkeypatch.setattr(mod, "SENTENCE_TRANSFORMERS_AVAILABLE", True)

    class Stub(mod.MLXEmbeddingGenerator):  # type: ignore[name-defined,misc]
        def _load_model(self) -> None:
            self.model = STLike(int(self.model_config["dimensions"]), return_list=True)
            self.selected_backend = "sentence-transformers"

        def _can_use_mlx_model(self) -> bool:
            return False

    gen = Stub()
    emb = gen.generate_embedding("hello")
    assert len(emb) == int(gen.model_config["dimensions"])
    # Vector should be normalized (first element deterministic)
    assert isinstance(emb[0], float)


def test_fast_mode_returns_zero_vector(monkeypatch: pytest.MonkeyPatch) -> None:
    os.environ["CORTEX_PY_FAST_TEST"] = "1"
    mod = _fresh_reload()
    gen = mod.MLXEmbeddingGenerator()
    emb = gen.generate_embedding("x")
    assert all(abs(v) < 1e-12 for v in emb)
    os.environ.pop("CORTEX_PY_FAST_TEST", None)


def test_backend_capabilities_flags(monkeypatch: pytest.MonkeyPatch) -> None:
    mod = _fresh_reload()
    monkeypatch.setattr(mod, "MLX_AVAILABLE", False)
    monkeypatch.setattr(mod, "SENTENCE_TRANSFORMERS_AVAILABLE", False)
    caps = mod.get_backend_capabilities()
    assert set(caps.keys()) == {
        "mlx_available",
        "sentence_transformers_available",
        "fast_test_mode",
        "platform",
    }
    os.environ.pop("CORTEX_PY_FAST_TEST", None)
