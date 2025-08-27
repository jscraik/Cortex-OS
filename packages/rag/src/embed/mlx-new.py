#!/usr/bin/env python3
"""
MLX Embedding Adapter for Cortex-OS
Uses MLX-optimized models for text embeddings on Apple Silicon
"""

import json
import os
from pathlib import Path
from typing import List, Optional

try:
    import mlx.core as mx
    import mlx.nn as nn
    from transformers import AutoTokenizer
    MLX_AVAILABLE = True
except ImportError:
    MLX_AVAILABLE = False

class MLXEmbeddingAdapter:
    """MLX-optimized embedding adapter using pre-downloaded models."""
    
    def __init__(self, model_name: str = "qwen3-4b", config_path: Optional[str] = None):
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
        self.config = self._load_config(config_path)
        
        if not MLX_AVAILABLE:
            print("Warning: MLX not available, using fallback implementation")
    
    def _load_config(self, config_path: Optional[str] = None) -> dict:
        """Load model configuration from config file."""
        if config_path is None:
            # Default to repo config
            config_path = Path(__file__).parent.parent.parent.parent.parent / "config" / "mlx-models.json"
        
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            # Fallback configuration
            return {
                "embedding_models": {
                    "qwen3-4b": {
                        "path": "/Volumes/ExternalSSD/huggingface_cache/models--Qwen--Qwen3-Embedding-4B",
                        "dimensions": 768
                    }
                }
            }
    
    def _get_model_path(self) -> str:
        """Get the full path to the model."""
        model_config = self.config.get("embedding_models", {}).get(self.model_name)
        if not model_config:
            raise ValueError(f"Model {self.model_name} not found in config")
        
        base_path = model_config["path"]
        # Find the actual snapshot directory
        snapshots_dir = Path(base_path) / "snapshots"
        if snapshots_dir.exists():
            # Get the first (and usually only) snapshot
            snapshot_dirs = list(snapshots_dir.iterdir())
            if snapshot_dirs:
                return str(snapshot_dirs[0])
        
        return base_path
    
    def load_model(self):
        """Load the MLX model and tokenizer."""
        if self.model is not None:
            return  # Already loaded
        
        model_path = self._get_model_path()
        
        try:
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(model_path)
            
            # Load MLX model (simplified - would need actual MLX model loading)
            # This is a placeholder - actual implementation would load MLX weights
            print(f"Loading MLX model from: {model_path}")
            
            # For now, we'll mark as loaded but implement actual loading later
            self.model = "loaded"  # Placeholder
            
        except Exception as e:
            print(f"Error loading model: {e}")
            raise
    
    def embed_text(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for input texts."""
        if not self.model:
            self.load_model()
        
        if not texts:
            return []
        
        # Placeholder implementation
        # In production, this would:
        # 1. Tokenize texts
        # 2. Run through MLX model
        # 3. Pool embeddings (mean, CLS, etc.)
        # 4. Return as lists
        
        # For now, return random embeddings with correct dimensions
        import random
        dimensions = self.config.get("embedding_models", {}).get(self.model_name, {}).get("dimensions", 768)
        
        embeddings = []
        for text in texts:
            # Generate deterministic "embeddings" based on text hash
            # This is just for testing - replace with actual MLX inference
            random.seed(hash(text) % (2**32))
            embedding = [random.random() - 0.5 for _ in range(dimensions)]
            embeddings.append(embedding)
        
        return embeddings

# Main function for standalone usage
def embed(texts: List[str], model_name: str = "qwen3-4b") -> List[List[float]]:
    """Convenience function for embedding texts."""
    adapter = MLXEmbeddingAdapter(model_name)
    return adapter.embed_text(texts)

if __name__ == "__main__":
    # Test the adapter
    test_texts = ["Hello world", "This is a test", "MLX embeddings work!"]
    embeddings = embed(test_texts)
    print(f"Generated {len(embeddings)} embeddings with {len(embeddings[0])} dimensions each")
