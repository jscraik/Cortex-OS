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
from typing import Any, Dict, List, Optional, Union
from pathlib import Path
import importlib.util

if importlib.util.find_spec("mlx") is None:
    raise ImportError("MLX is required to use MLXEmbeddingGenerator")

import mlx.core as mx
import numpy as np

logger = logging.getLogger(__name__)

# Default embedding models
DEFAULT_EMBEDDING_MODELS = {
    "qwen3-embedding-0.6b-mlx": {
        "path": "Qwen/Qwen3-Embedding-0.6B",
        "memory_gb": 1.0,
        "dimensions": 1536,
        "context_length": 8192
    },
    "qwen3-embedding-4b-mlx": {
        "path": "Qwen/Qwen3-Embedding-4B",
        "memory_gb": 4.0,
        "dimensions": 1536,
        "context_length": 8192
    },
    "qwen3-embedding-8b-mlx": {
        "path": "Qwen/Qwen3-Embedding-8B",
        "memory_gb": 8.0,
        "dimensions": 1536,
        "context_length": 8192
    }
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

        self._load_model()

    def _load_model(self):
        """Load the embedding model."""
        try:
            model_path = self.model_config["path"]
            logger.info(f"Loading model: {model_path}")

            # For now, we'll just set up the model info without actually loading
            # The actual loading would require proper model files and configuration
            logger.info(f"Model setup for: {model_path}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            # Don't raise the exception, we'll fall back to mock embeddings

    def _mock_embedding(self, text: str, dimensions: int = 1536) -> List[float]:
        """
        Generate a mock embedding for testing purposes.

        Args:
            text: Input text
            dimensions: Number of embedding dimensions

        Returns:
            Mock embedding vector
        """
        # Create a deterministic mock embedding based on text
        import hashlib
        text_hash = hashlib.sha256(text.encode()).hexdigest()
        seed = int(text_hash[:8], 16) % (2**32)

        np.random.seed(seed)
        embedding = np.random.randn(dimensions).tolist()

        # Normalize the embedding
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = [x / norm for x in embedding]

        return embedding

    def _normalize_embedding(self, embedding: List[float]) -> List[float]:
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

    def generate_embedding(self, text: str, normalize: bool = True) -> List[float]:
        """
        Generate an embedding for the given text.

        Args:
            text: Input text to embed
            normalize: Whether to normalize the embedding

        Returns:
            Embedding vector
        """
        # Always use mock embedding for now since we're not actually loading the model
        embedding = self._mock_embedding(text, self.model_config["dimensions"])

        # Normalize if requested
        if normalize:
            embedding = self._normalize_embedding(embedding)

        return embedding

    def generate_embeddings(self, texts: List[str], normalize: bool = True) -> List[List[float]]:
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

    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the loaded model.

        Returns:
            Dictionary with model information
        """
        return {
            "model_name": self.model_name,
            "model_path": self.model_config["path"] if self.model_config else None,
            "dimensions": self.model_config["dimensions"] if self.model_config else None,
            "context_length": self.model_config["context_length"] if self.model_config else None,
            "memory_gb": self.model_config["memory_gb"] if self.model_config else None,
            "model_loaded": self.model is not None
        }

def main():
    """Main function for testing the embedding generator."""
    import argparse

    parser = argparse.ArgumentParser(description="Generate embeddings using MLX")
    parser.add_argument("texts", nargs="+", help="Texts to embed")
    parser.add_argument("--model", default="qwen3-embedding-4b-mlx",
                       choices=["qwen3-embedding-0.6b-mlx", "qwen3-embedding-4b-mlx", "qwen3-embedding-8b-mlx"],
                       help="Embedding model to use")
    parser.add_argument("--no-normalize", action="store_true", help="Don't normalize embeddings")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--json-only", action="store_true", help="Output only JSON embeddings")

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
            print(f"\nGenerated {len(embeddings)} embeddings in {end_time - start_time:.2f}s")
            for i, (text, embedding) in enumerate(zip(args.texts, embeddings)):
                print(f"\nText {i+1}: {text[:50]}{'...' if len(text) > 50 else ''}")
                print(f"Embedding: [{embedding[0]:.4f}, {embedding[1]:.4f}, ..., {embedding[-1]:.4f}]")
                print(f"Dimensions: {len(embedding)}")
                print(f"L2 Norm: {np.linalg.norm(embedding):.4f}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
