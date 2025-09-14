#!/usr/bin/env python3
# pyright: reportMissingImports=false
"""MLX Embedding Generator for Cortex-OS."""

import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any, TypedDict

import numpy as np


def _is_fast_test_mode() -> bool:
    return os.environ.get("CORTEX_PY_FAST_TEST") == "1"


def _import_mlx_components():  # pragma: no cover - import helper
    try:
        import mlx.core as _mx  # type: ignore
    except Exception:  # broad: optional dependency
        _mx = None  # type: ignore
    try:
        from mlx_lm import load as _load  # type: ignore
    except Exception:
        _load = None  # type: ignore
    return _mx, _load


mx, load = _import_mlx_components()


def compute_mlx_available() -> bool:
    """Compute MLX availability with environment overrides.

    Precedence:
    1. CORTEX_FORCE_DISABLE_MLX=1 -> False
    2. CORTEX_FORCE_ENABLE_MLX=1 -> True (if components importable)
    3. Both core + mlx_lm imported and platform Darwin -> True
    4. Else False
    """
    if os.environ.get("CORTEX_FORCE_DISABLE_MLX") == "1":
        return False
    force_enable = os.environ.get("CORTEX_FORCE_ENABLE_MLX") == "1"
    if force_enable:
        return mx is not None and load is not None
    import platform

    return mx is not None and load is not None and platform.system() == "Darwin"


MLX_AVAILABLE = compute_mlx_available()

# Optional sentence-transformers backend
try:  # pragma: no cover - optional dependency
    from sentence_transformers import SentenceTransformer
except ImportError:  # pragma: no cover
    SentenceTransformer = None  # type: ignore

SENTENCE_TRANSFORMERS_AVAILABLE = SentenceTransformer is not None

logger = logging.getLogger(__name__)

DEFAULT_CONFIG_PATH = Path(__file__).with_name("embedding_models.json")


def load_model_config(path: str | None = None) -> dict[str, dict[str, Any]]:
    config_file = Path(path) if path else DEFAULT_CONFIG_PATH
    if config_file.suffix == ".json":
        with open(config_file, encoding="utf-8") as f:
            return json.load(f)
    if config_file.suffix in {".toml", ".tml"}:
        import tomllib

        with open(config_file, "rb") as f:
            return tomllib.load(f)
    raise ValueError("Unsupported config format")


class BackendCapabilities(TypedDict):
    mlx_available: bool
    sentence_transformers_available: bool
    fast_test_mode: bool
    platform: str


def get_backend_capabilities() -> BackendCapabilities:
    import platform

    return BackendCapabilities(
        mlx_available=MLX_AVAILABLE,
        sentence_transformers_available=SENTENCE_TRANSFORMERS_AVAILABLE,
        fast_test_mode=_is_fast_test_mode(),
        platform=platform.system(),
    )


class MLXEmbeddingGenerator:
    """Generate embeddings using MLX (preferred) or sentence-transformers.

    Provides a fast test mode that avoids heavy model downloads while keeping
    interface compatibility for unit tests.
    """

    def __init__(
        self, model_name: str = "qwen3-embedding-4b-mlx", config_path: str | None = None
    ):
        self.model_name = model_name
        self.model: Any | None = None
        self.tokenizer: Any | None = None
        models = load_model_config(config_path)
        if model_name not in models:
            raise ValueError(f"Unsupported model: {model_name}")
        self.model_config: dict[str, Any] = models[model_name]

        import platform

        self.is_darwin = platform.system() == "Darwin"
        # Re-evaluate in case env toggles changed after module import
        self.can_use_mlx = compute_mlx_available() and self.is_darwin
        self.can_use_sentence_transformers = SENTENCE_TRANSFORMERS_AVAILABLE
        self.selected_backend: str | None = None
        self.fast_test_mode = _is_fast_test_mode()

        if self.fast_test_mode:
            self._init_fast_mode()
            return

        if not self.can_use_mlx and not self.can_use_sentence_transformers:
            raise RuntimeError(
                "No embedding backend available (need MLX on macOS or sentence-transformers)"
            )
        self._load_model()
        if not self._can_use_model():  # pragma: no cover - invariant guard
            raise RuntimeError(f"Failed to load model: {model_name}")

    # ---------------- Fast Mode -----------------
    def _init_fast_mode(self) -> None:
        if not self.can_use_mlx and not self.can_use_sentence_transformers:
            # ensure at least one path for tests
            self.can_use_sentence_transformers = True
        dims = int(self.model_config["dimensions"])  # type: ignore[index]

        class _DummyST:  # pragma: no cover - trivial
            def __init__(self, _dims: int):
                self._dims = _dims

            def encode(self, _text: str, convert_to_numpy: bool = True):  # type: ignore[no-untyped-def]
                import numpy as _np

                emb = _np.zeros(self._dims, dtype=float)
                return emb if convert_to_numpy else emb.tolist()

        self.model = _DummyST(dims)
        self.selected_backend = "sentence-transformers"

    # ---------------- Backend Loading -----------------
    def _backend_order(self) -> list[str]:  # pragma: no cover - simple
        order: list[str] = []
        if self.can_use_mlx:
            order.append("mlx")
        if self.can_use_sentence_transformers:
            order.append("sentence-transformers")
        return order

    def _try_load_mlx(self, model_path: str) -> bool:  # pragma: no cover - heavy
        if load is None:
            return False
        try:
            self.model, self.tokenizer = load(model_path)
            self.selected_backend = "mlx"
            return True
        except Exception as e:  # pragma: no cover - MLX initial failure
            logger.warning("MLX backend load failed: %s", e)
            try:
                from huggingface_hub import snapshot_download  # type: ignore[import]

                cache_dir = os.environ.get(
                    "HF_CACHE_PATH", os.path.expanduser("~/.cache/huggingface")
                )
                snapshot_download(
                    repo_id=model_path, cache_dir=cache_dir, local_files_only=False
                )
                self.model, self.tokenizer = load(model_path)
                self.selected_backend = "mlx"
                return True
            except Exception as retry_err:  # pragma: no cover - retry failure
                logger.warning("MLX retry failed: %s", retry_err)
                return False

    def _try_load_sentence_transformers(
        self, model_path: str
    ) -> bool:  # pragma: no cover - heavy
        if SentenceTransformer is None:
            return False
        try:
            cache_dir = os.environ.get(
                "HF_CACHE_PATH", os.path.expanduser("~/.cache/huggingface")
            )
            self.model = SentenceTransformer(model_path, cache_folder=cache_dir)
            self.selected_backend = "sentence-transformers"
            return True
        except Exception as e:  # pragma: no cover - ST failure
            logger.warning("Sentence-transformers backend load failed: %s", e)
            return False

    def _load_model(self) -> None:  # pragma: no cover - heavy
        model_path: str = str(self.model_config["path"])  # type: ignore[index]
        logger.info("Loading model: %s", model_path)  # type: ignore[arg-type]
        for backend in self._backend_order():
            if backend == "mlx" and self._try_load_mlx(model_path):
                return
            if (
                backend == "sentence-transformers"
                and self._try_load_sentence_transformers(model_path)
            ):
                return
        raise RuntimeError(f"No working backend available for model {model_path}")

    # ---------------- Embedding Generation -----------------
    def _normalize_embedding(self, embedding: list[float]) -> list[float]:
        emb = np.array(embedding, dtype=float)
        norm = np.linalg.norm(emb)
        if norm > 0:
            emb = emb / norm
        return emb.tolist()

    def _generate_mlx_embedding(
        self, text: str
    ) -> list[float]:  # pragma: no cover - heavy
        if mx is None:
            raise RuntimeError("MLX backend not available")
        tokens = self.tokenizer.encode(text)  # type: ignore[call-arg, attr-defined]
        max_ctx = int(self.model_config["context_length"])  # type: ignore[index]
        if len(tokens) > max_ctx:
            tokens = tokens[:max_ctx]
        input_ids = mx.array([tokens])  # type: ignore[attr-defined]
        with mx.no_grad():  # type: ignore[attr-defined]
            outputs = self.model(input_ids)  # type: ignore[call-arg]
            if hasattr(outputs, "last_hidden_state"):
                embedding = outputs.last_hidden_state.mean(axis=1)[0].tolist()
            else:
                embedding = outputs.mean(axis=1)[0].tolist()
        return self._ensure_correct_dimensions(embedding)

    def _ensure_correct_dimensions(self, embedding: list[float]) -> list[float]:
        expected = int(self.model_config["dimensions"])  # type: ignore[index]
        if len(embedding) == expected:
            return embedding
        if len(embedding) > expected:
            return embedding[:expected]
        return embedding + [0.0] * (expected - len(embedding))

    def _generate_raw_embedding(
        self, text: str
    ) -> list[float]:  # pragma: no cover - heavy
        if not self._can_use_model():
            raise RuntimeError("Model not loaded")
        return self._generate_mlx_embedding(text)

    def generate_embedding(self, text: str, normalize: bool = True) -> list[float]:
        if self.fast_test_mode:
            dims = int(self.model_config["dimensions"])  # type: ignore[index]
            return [0.0] * dims
        if hasattr(self.model, "encode") and self.model is not None:
            embedding = self.model.encode(  # type: ignore[attr-defined]
                text, convert_to_numpy=True, normalize_embeddings=normalize
            )  # type: ignore[call-arg, attr-defined]
            # Sentence-transformers may return either a numpy array (with .tolist())
            # or an already-materialized Python list. Be defensive to avoid attribute errors.
            if isinstance(embedding, np.ndarray):  # preferred path
                emb_list: list[float] = embedding.tolist()
            elif isinstance(embedding, list | tuple):
                emb_list = [float(x) for x in embedding]
            else:  # fallback: attempt generic conversion
                try:
                    emb_list = list(embedding)  # type: ignore[arg-type]
                    emb_list = [float(x) for x in emb_list]
                except (
                    Exception
                ) as conv_err:  # pragma: no cover - highly unlikely branch
                    raise TypeError(
                        f"Unsupported embedding return type: {type(embedding)}"
                    ) from conv_err
            return self._ensure_correct_dimensions(emb_list)
        embedding = self._generate_raw_embedding(text)
        return self._normalize_embedding(embedding) if normalize else embedding

    def generate_embeddings(
        self, texts: list[str], normalize: bool = True
    ) -> list[list[float]]:
        return [self.generate_embedding(t, normalize) for t in texts]

    def get_model_info(self) -> dict[str, Any]:
        return {
            "model_name": self.model_name,
            "model_path": self.model_config["path"],  # type: ignore[index]
            "dimensions": self.model_config["dimensions"],  # type: ignore[index]
            "context_length": self.model_config["context_length"],  # type: ignore[index]
            "memory_gb": self.model_config["memory_gb"],  # type: ignore[index]
            "mlx_available": MLX_AVAILABLE,
            "sentence_transformers_available": SENTENCE_TRANSFORMERS_AVAILABLE,
            "backend": self.selected_backend
            or ("sentence-transformers" if hasattr(self.model, "encode") else "mlx"),
            "model_loaded": self._can_use_model(),
        }

    def _can_use_model(self) -> bool:
        if self.fast_test_mode:
            return True
        if hasattr(self.model, "encode"):
            return self.model is not None
        return (
            self.model is not None and self.tokenizer is not None and self.can_use_mlx
        )


def main():  # pragma: no cover - CLI utility
    import argparse

    parser = argparse.ArgumentParser(description="Generate embeddings using MLX")
    parser.add_argument("texts", nargs="+", help="Texts to embed")
    parser.add_argument(
        "--model",
        default="qwen3-embedding-4b-mlx",
        choices=[
            "qwen3-embedding-0.6b-mlx",
            "qwen3-embedding-4b-mlx",
            "qwen3-embedding-8b-mlx",
        ],
        help="Embedding model to use",
    )
    parser.add_argument(
        "--no-normalize", action="store_true", help="Don't normalize embeddings"
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument(
        "--json-only", action="store_true", help="Output only JSON embeddings"
    )
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING)
    generator = MLXEmbeddingGenerator(args.model)
    start_time = time.time()
    embeddings = generator.generate_embeddings(args.texts, not args.no_normalize)
    end_time = time.time()
    if args.json_only:
        print(json.dumps(embeddings))
    else:
        info = generator.get_model_info()
        print(f"Model Info: {json.dumps(info, indent=2)}")
        print(
            f"\nGenerated {len(embeddings)} embeddings in {end_time - start_time:.2f}s"
        )
        for i, (text, embedding) in enumerate(
            zip(args.texts, embeddings, strict=False)
        ):
            print(f"\nText {i + 1}: {text[:50]}{'...' if len(text) > 50 else ''}")
            print(
                f"Embedding: [{embedding[0]:.4f}, {embedding[1]:.4f}, ..., {embedding[-1]:.4f}]"
            )
            print(f"Dimensions: {len(embedding)}")
            print(f"L2 Norm: {np.linalg.norm(embedding):.4f}")


if __name__ == "__main__":
    try:
        main()
    except (
        RuntimeError,
        ValueError,
        ImportError,
    ) as e:  # pragma: no cover - CLI error path
        logger.error("Error: %s", e)
        sys.exit(1)
    except Exception as e:
        logger.error("Unexpected error: %s", e)
        sys.exit(1)
