#!/usr/bin/env python3
"""
MLX Embedding Generator for Cortex-OS

Generates embeddings using Qwen models with MLX acceleration.
"""

import json
import logging
import os
import sys
import time
from typing import Any

import numpy as np

try:
    import mlx.core as mx  # type: ignore
    from mlx_lm import load  # type: ignore

    MLX_AVAILABLE = True
except ImportError as e:  # pragma: no cover - diagnostics for missing deps
    logging.basicConfig(level=logging.INFO)
    logging.error("MLX core not available: %s", e)
    MLX_AVAILABLE = False

logger = logging.getLogger(__name__)

DEFAULT_EMBEDDING_MODELS = {
    "qwen3-embedding-0.6b-mlx": {
        "path": "Qwen/Qwen3-Embedding-0.6B",
        "memory_gb": 1.0,
        "dimensions": 1536,
        "context_length": 8192,
    },
    "qwen3-embedding-4b-mlx": {
        "path": "Qwen/Qwen3-Embedding-4B",
        "memory_gb": 4.0,
        "dimensions": 1536,
        "context_length": 8192,
    },
    "qwen3-embedding-8b-mlx": {
        "path": "Qwen/Qwen3-Embedding-8B",
        "memory_gb": 8.0,
        "dimensions": 1536,
        "context_length": 8192,
    },
}


class MLXEmbeddingGenerator:
    """Generate embeddings using Qwen models with MLX acceleration."""

    def __init__(self, model_name: str = "qwen3-embedding-4b-mlx"):
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
        self.model_config = DEFAULT_EMBEDDING_MODELS.get(model_name)
        if not self.model_config:
            raise ValueError(f"Unsupported model: {model_name}")
        if not MLX_AVAILABLE:
            raise RuntimeError("MLX dependencies are not installed")
        self._load_model()
        if not self._can_use_mlx_model():
            raise RuntimeError(f"Failed to load MLX model: {model_name}")

    def _load_model(self) -> None:
        model_path = self.model_config["path"]
        logger.info(f"Loading model: {model_path}")
        try:
            self.model, self.tokenizer = load(model_path)
        except Exception:
            try:
                from huggingface_hub import snapshot_download

                cache_dir = os.environ.get(
                    "HF_CACHE_PATH", os.path.expanduser("~/.cache/huggingface")
                )
                snapshot_download(
                    repo_id=model_path,
                    cache_dir=cache_dir,
                    local_files_only=False,
                )
                self.model, self.tokenizer = load(model_path)
            except Exception as download_error:
                raise RuntimeError(
                    f"Failed to load model {model_path}: {download_error}"
                ) from download_error

    def _normalize_embedding(self, embedding: list[float]) -> list[float]:
        emb = np.array(embedding)
        norm = np.linalg.norm(emb)
        if norm > 0:
            emb = emb / norm
        return emb.tolist()

    def _generate_mlx_embedding(self, text: str) -> list[float]:
        tokens = self.tokenizer.encode(text)
        if len(tokens) > self.model_config["context_length"]:
            tokens = tokens[: self.model_config["context_length"]]
        input_ids = mx.array([tokens])
        with mx.no_grad():
            outputs = self.model(input_ids)
            if hasattr(outputs, "last_hidden_state"):
                embedding = outputs.last_hidden_state.mean(axis=1)[0].tolist()
            else:
                embedding = outputs.mean(axis=1)[0].tolist()
        return self._ensure_correct_dimensions(embedding)

    def _ensure_correct_dimensions(self, embedding: list[float]) -> list[float]:
        expected = self.model_config["dimensions"]
        if len(embedding) == expected:
            return embedding
        if len(embedding) > expected:
            return embedding[:expected]
        return embedding + [0.0] * (expected - len(embedding))

    def _generate_raw_embedding(self, text: str) -> list[float]:
        if not self._can_use_mlx_model():
            raise RuntimeError("MLX model not loaded")
        return self._generate_mlx_embedding(text)

    def generate_embedding(self, text: str, normalize: bool = True) -> list[float]:
        embedding = self._generate_raw_embedding(text)
        return self._normalize_embedding(embedding) if normalize else embedding

    def generate_embeddings(
        self, texts: list[str], normalize: bool = True
    ) -> list[list[float]]:
        return [self.generate_embedding(t, normalize) for t in texts]

    def get_model_info(self) -> dict[str, Any]:
        return {
            "model_name": self.model_name,
            "model_path": self.model_config["path"],
            "dimensions": self.model_config["dimensions"],
            "context_length": self.model_config["context_length"],
            "memory_gb": self.model_config["memory_gb"],
            "mlx_available": MLX_AVAILABLE,
            "model_loaded": self._can_use_mlx_model(),
        }

    def _can_use_mlx_model(self) -> bool:
        return self.model is not None and self.tokenizer is not None and MLX_AVAILABLE


def main():
    """Main function for testing the embedding generator."""
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
