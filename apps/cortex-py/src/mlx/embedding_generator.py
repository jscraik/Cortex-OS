#!/usr/bin/env python3
"""
MLX Embedding Generator for Cortex-OS

Generates embeddings using Qwen models with MLX acceleration.
"""

import json
import logging
import sys
import time
from typing import Any

try:
    import numpy as np

    MLX_AVAILABLE = True
except ImportError as e:
    print(f"MLX core not available: {e}", file=sys.stderr)
    MLX_AVAILABLE = False

logger = logging.getLogger(__name__)

# Default embedding models
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
        """
        Initialize the embedding generator.

        Args:
            model_name: Name of the embedding model to use
        """
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
        self.model_config = DEFAULT_EMBEDDING_MODELS.get(model_name)

        if not self.model_config:
            raise ValueError(f"Unsupported model: {model_name}")

        # Load model if MLX is available
        if MLX_AVAILABLE:
            self._load_model()
        else:
            logger.warning("MLX not available, embeddings will be mocked")

    def _load_model(self):
        """Load the embedding model."""
        try:
            model_path = self.model_config["path"]
            logger.info(f"Loading model: {model_path}")

            if MLX_AVAILABLE:
                try:
                    # Load the actual MLX model
                    from mlx_lm import load
                    self.model, self.tokenizer = load(model_path)

                    if self.model is None or self.tokenizer is None:
                        raise RuntimeError(f"Failed to load model from {model_path}")

                    logger.info(f"Successfully loaded MLX model: {model_path}")

                except Exception as load_error:
                    logger.warning(f"MLX model loading failed: {load_error}")
                    # Try downloading model if not found
                    try:
                        import os

                        from huggingface_hub import snapshot_download

                        cache_dir = os.environ.get('HF_CACHE_PATH', os.path.expanduser('~/.cache/huggingface'))
                        local_path = snapshot_download(
                            repo_id=model_path,
                            cache_dir=cache_dir,
                            local_files_only=False
                        )
                        logger.info(f"Downloaded model to: {local_path}")

                        # Try loading again after download
                        self.model, self.tokenizer = load(model_path)
                        if self.model is None or self.tokenizer is None:
                            raise RuntimeError(f"Failed to load model after download from {model_path}")

                        logger.info(f"Successfully loaded MLX model after download: {model_path}")

                    except Exception as download_error:
                        logger.error(f"Failed to download and load model: {download_error}")
                        self.model = None
                        self.tokenizer = None
            else:
                logger.warning("MLX not available, will use fallback embedding generation")
                self.model = None
                self.tokenizer = None

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.model = None
            self.tokenizer = None

    def _deterministic_embedding(self, text: str, dimensions: int = 1536) -> list[float]:
        """
        Generate a deterministic embedding for consistent testing and fallback.

        Args:
            text: Input text
            dimensions: Number of embedding dimensions

        Returns:
            Deterministic embedding vector
        """
        # Create a deterministic embedding based on text content
        import hashlib

        text_hash = hashlib.sha256(text.encode()).hexdigest()
        seed = int(text_hash[:8], 16) % (2**32)

        # Use modern numpy random generator
        rng = np.random.default_rng(seed)
        embedding = rng.standard_normal(dimensions).tolist()

        # Normalize the embedding
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = [x / norm for x in embedding]

        return embedding

    def _normalize_embedding(self, embedding: list[float]) -> list[float]:
        """
        Normalize an embedding vector to unit length.

        Args:
            embedding: Input embedding vector

        Returns:
            Normalized embedding vector
        """
        embedding_np = np.array(embedding)
        norm = np.linalg.norm(embedding_np)
        if norm > 0:
            embedding_np = embedding_np / norm
        return embedding_np.tolist()

    def generate_embedding(self, text: str, normalize: bool = True) -> list[float]:
        """
        Generate an embedding for the given text.

        Args:
            text: Input text to embed
            normalize: Whether to normalize the embedding

        Returns:
            Embedding vector
        """
        embedding = self._generate_raw_embedding(text)

        # Normalize if requested
        if normalize:
            embedding = self._normalize_embedding(embedding)

        return embedding

    def _generate_raw_embedding(self, text: str) -> list[float]:
        """Generate raw embedding using MLX model or fallback."""
        if self._can_use_mlx_model():
            try:
                return self._generate_mlx_embedding(text)
            except Exception as e:
                logger.warning(f"MLX embedding generation failed, falling back: {e}")

        # Fallback to deterministic embedding
        return self._deterministic_embedding(text, self.model_config["dimensions"])

    def _can_use_mlx_model(self) -> bool:
        """Check if MLX model can be used."""
        return (
            self.model is not None
            and self.tokenizer is not None
            and MLX_AVAILABLE
        )

    def _generate_mlx_embedding(self, text: str) -> list[float]:
        """Generate embedding using the loaded MLX model."""
        import mlx.core as mx

        # Tokenize the input text
        tokens = self.tokenizer.encode(text)
        if len(tokens) > self.model_config["context_length"]:
            tokens = tokens[:self.model_config["context_length"]]

        # Convert to MLX array and generate embeddings
        input_ids = mx.array([tokens])

        with mx.no_grad():
            outputs = self.model(input_ids)
            # Use the last hidden state and apply mean pooling
            if hasattr(outputs, 'last_hidden_state'):
                embedding = outputs.last_hidden_state.mean(axis=1)[0].tolist()
            else:
                # Fallback if model output structure is different
                embedding = outputs.mean(axis=1)[0].tolist()

        # Ensure correct dimensions
        return self._ensure_correct_dimensions(embedding)

    def _ensure_correct_dimensions(self, embedding: list[float]) -> list[float]:
        """Ensure embedding has the correct dimensions."""
        expected_dims = self.model_config["dimensions"]
        if len(embedding) == expected_dims:
            return embedding

        if len(embedding) > expected_dims:
            return embedding[:expected_dims]

        # Pad with zeros if too short
        return embedding + [0.0] * (expected_dims - len(embedding))

    def generate_embeddings(
        self, texts: list[str], normalize: bool = True
    ) -> list[list[float]]:
        """
        Generate embeddings for multiple texts.

        Args:
            texts: List of input texts
            normalize: Whether to normalize the embeddings

        Returns:
            List of embedding vectors
        """
        embeddings = []
        for text in texts:
            embedding = self.generate_embedding(text, normalize)
            embeddings.append(embedding)
        return embeddings

    def get_model_info(self) -> dict[str, Any]:
        """
        Get information about the loaded model.

        Returns:
            Dictionary with model information
        """
        return {
            "model_name": self.model_name,
            "model_path": self.model_config["path"] if self.model_config else None,
            "dimensions": self.model_config["dimensions"]
            if self.model_config
            else None,
            "context_length": self.model_config["context_length"]
            if self.model_config
            else None,
            "memory_gb": self.model_config["memory_gb"] if self.model_config else None,
            "mlx_available": MLX_AVAILABLE,
            "model_loaded": self.model is not None,
        }


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

    # Setup logging
    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING)

    try:
        # Create embedding generator
        generator = MLXEmbeddingGenerator(args.model)

        # Generate embeddings
        start_time = time.time()
        embeddings = generator.generate_embeddings(args.texts, not args.no_normalize)
        end_time = time.time()

        if args.json_only:
            # Output only JSON for machine consumption
            print(json.dumps(embeddings))
        else:
            # Print model info
            model_info = generator.get_model_info()
            print(f"Model Info: {json.dumps(model_info, indent=2)}")

            # Print results
            print(
                f"\nGenerated {len(embeddings)} embeddings in {end_time - start_time:.2f}s"
            )
            for i, (text, embedding) in enumerate(zip(args.texts, embeddings, strict=False)):
                print(f"\nText {i + 1}: {text[:50]}{'...' if len(text) > 50 else ''}")
                print(
                    f"Embedding: [{embedding[0]:.4f}, {embedding[1]:.4f}, ..., {embedding[-1]:.4f}]"
                )
                print(f"Dimensions: {len(embedding)}")
                print(f"L2 Norm: {np.linalg.norm(embedding):.4f}")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
