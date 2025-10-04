"""
CLIP Image Embedder for Cortex-Py (Phase 3.1.3)

Following CODESTYLE.md:
- snake_case naming
- Type hints on all public functions
- Guard clauses for readability
- Functions ≤40 lines
- brAInwav branding in error messages
"""

import io
import os
from typing import Any, Union

import numpy as np
from PIL import Image


def _is_fast_test_mode() -> bool:
    """Check if fast test mode is enabled"""
    return os.environ.get("CORTEX_PY_FAST_TEST") == "1"


class EmbeddingError(Exception):
    """brAInwav embedding error for CLIP processing"""

    pass


class CLIPEmbedder:
    """
    CLIP-based image embedding generator.
    
    Supports MLX (Darwin) and PyTorch backends with automatic fallback.
    Generates 512-dimensional embeddings for images.
    """

    def __init__(self, model_name: str = "openai/clip-vit-base-patch32"):
        """
        Initialize CLIP embedder.
        
        Args:
            model_name: HuggingFace model identifier
        """
        self.model_name = model_name
        self.model: Any = None
        self.processor: Any = None
        self.backend: str = "unknown"
        self.fast_test_mode = _is_fast_test_mode()
        self._model_loaded = False

    def _try_load_mlx(self) -> bool:
        """
        Attempt to load CLIP via MLX backend.
        
        Returns:
            True if successful, False otherwise
        
        Following CODESTYLE.md: Guard clauses for error handling
        """
        # Guard: Fast test mode
        if self.fast_test_mode:
            return False

        # Guard: Not on macOS
        import platform

        if platform.system() != "Darwin":
            return False

        # Guard: MLX disabled
        if os.environ.get("CORTEX_FORCE_DISABLE_MLX") == "1":
            return False

        try:
            # MLX CLIP implementation would go here
            # For now, fall through to PyTorch
            return False
        except Exception:
            return False

    def _load_pytorch_clip(self) -> None:
        """
        Load CLIP using PyTorch backend.
        
        Following CODESTYLE.md: Guard clauses for import errors
        """
        # Guard: Fast test mode
        if self.fast_test_mode:
            self.backend = "fast_test"
            self._model_loaded = True
            return

        try:
            from transformers import CLIPModel, CLIPProcessor
        except ImportError as e:
            raise EmbeddingError(
                "brAInwav: transformers not available for CLIP"
            ) from e

        try:
            self.processor = CLIPProcessor.from_pretrained(self.model_name)
            self.model = CLIPModel.from_pretrained(self.model_name)
            self.backend = "pytorch"
            self._model_loaded = True
        except Exception as e:
            raise EmbeddingError(
                f"brAInwav: Failed to load CLIP model {self.model_name}"
            ) from e

    def _ensure_model_loaded(self) -> None:
        """
        Lazy load model on first use.
        
        Following CODESTYLE.md: Guard clause for already loaded
        """
        # Guard: Already loaded
        if self._model_loaded:
            return

        # Try MLX first (Darwin only)
        if self._try_load_mlx():
            return

        # Fallback to PyTorch
        self._load_pytorch_clip()

    def _image_from_bytes(self, data: bytes) -> Image.Image:
        """
        Convert bytes to PIL Image.
        
        Args:
            data: Image binary data
        
        Returns:
            PIL Image object
        
        Raises:
            EmbeddingError: If conversion fails
        
        Following CODESTYLE.md: Guard clauses for validation
        """
        # Guard: Empty data
        if not data or len(data) == 0:
            raise EmbeddingError("brAInwav: Cannot process empty image data")

        try:
            img = Image.open(io.BytesIO(data))
            img.load()  # Force load to catch corrupt files
            return img
        except Exception as e:
            raise EmbeddingError(
                f"brAInwav: Invalid image data - {str(e)}"
            ) from e

    def _normalize_embedding(self, embedding: list[float]) -> list[float]:
        """
        L2-normalize embedding vector.
        
        Args:
            embedding: Raw embedding vector
        
        Returns:
            Normalized embedding
        """
        emb = np.array(embedding, dtype=float)
        norm = np.linalg.norm(emb)

        # Guard: Zero norm
        if norm > 0:
            emb = emb / norm

        return emb.tolist()

    def generate_image_embedding(
        self, image_data: Union[bytes, Image.Image], normalize: bool = True
    ) -> list[float]:
        """
        Generate CLIP embedding for image.
        
        Args:
            image_data: Image bytes or PIL Image
            normalize: Whether to L2-normalize output
        
        Returns:
            512-dimensional embedding vector
        
        Raises:
            EmbeddingError: If processing fails
        
        Following CODESTYLE.md: Guard clauses for validation
        """
        self._ensure_model_loaded()

        # Convert bytes to PIL Image if needed
        if isinstance(image_data, bytes):
            image = self._image_from_bytes(image_data)
        else:
            image = image_data

        # Fast test mode returns zeros
        if self.fast_test_mode:
            return [0.0] * 512

        # Guard: Model not loaded
        if self.model is None or self.processor is None:
            raise EmbeddingError("brAInwav: CLIP model not loaded")

        try:
            # Process image
            inputs = self.processor(images=image, return_tensors="pt")

            # Generate embedding
            import torch

            with torch.no_grad():
                image_features = self.model.get_image_features(**inputs)

            # Convert to list
            embedding = image_features[0].cpu().numpy().tolist()

            # Normalize if requested
            if normalize:
                embedding = self._normalize_embedding(embedding)

            return embedding

        except Exception as e:
            raise EmbeddingError(
                f"brAInwav: CLIP embedding generation failed - {str(e)}"
            ) from e

    def generate_batch_embeddings(
        self, images: list[Union[bytes, Image.Image]], normalize: bool = True
    ) -> list[list[float]]:
        """
        Generate embeddings for multiple images.
        
        Args:
            images: List of image bytes or PIL Images
            normalize: Whether to L2-normalize outputs
        
        Returns:
            List of 512-dimensional embeddings
        
        Following CODESTYLE.md: Functional composition
        """
        return [
            self.generate_image_embedding(img, normalize) for img in images
        ]

    def get_model_info(self) -> dict[str, Any]:
        """
        Get model metadata.
        
        Returns:
            Dictionary with model information
        """
        return {
            "model_name": self.model_name,
            "embedding_dim": 512,
            "backend": self.backend,
            "model_loaded": self._model_loaded,
            "fast_test_mode": self.fast_test_mode,
        }
