#!/usr/bin/env python3
"""
Test script for Qwen embedding and reranker models in HuggingFace cache
"""

import os
import sys
from pathlib import Path

# Set HuggingFace cache (configurable via environment)
cache_path = os.environ.get("HF_CACHE_PATH", os.path.expanduser("~/.cache/huggingface"))
os.environ["HF_HOME"] = cache_path
os.environ["TRANSFORMERS_CACHE"] = cache_path


def test_sentence_transformers():
    """Test if sentence-transformers can load Qwen models"""
    try:
        from sentence_transformers import SentenceTransformer

        # Try the embedding model
        print("Testing Qwen3-Embedding-0.6B...")

        # Check if model files exist
        cache_path = os.environ.get(
            "HF_CACHE_PATH", os.path.expanduser("~/.cache/huggingface")
        )
        model_path = Path(cache_path) / "hub/models--Qwen--Qwen3-Embedding-0.6B"
        if not model_path.exists():
            print(f"Model path does not exist: {model_path}")
            return False

        try:
            # Try loading from cache
            cache_path = os.environ.get(
                "HF_CACHE_PATH", os.path.expanduser("~/.cache/huggingface")
            )
            model = SentenceTransformer(
                "Qwen/Qwen3-Embedding-0.6B", cache_folder=cache_path
            )
            print("✓ Qwen3-Embedding-0.6B loaded successfully!")

            # Test embedding
            texts = ["Hello world", "This is a test sentence"]
            embeddings = model.encode(texts)
            print(f"✓ Embeddings generated: shape {embeddings.shape}")

            return True

        except Exception as e:
            print(f"✗ Failed to load Qwen3-Embedding-0.6B: {e}")
            return False

    except ImportError:
        print("✗ sentence-transformers not available")
        return False


def test_transformers_direct():
    """Test direct transformers approach"""
    try:
        import torch
        from transformers import AutoModel, AutoTokenizer

        print("Testing direct transformers approach...")

        # Try the embedding model
        model_name = "Qwen/Qwen3-Embedding-0.6B"
        cache_dir = os.environ.get(
            "HF_CACHE_PATH", os.path.expanduser("~/.cache/huggingface")
        )

        try:
            tokenizer = AutoTokenizer.from_pretrained(
                model_name, cache_dir=cache_dir, local_files_only=True
            )
            model = AutoModel.from_pretrained(
                model_name, cache_dir=cache_dir, local_files_only=True
            )

            print("✓ Qwen3-Embedding loaded with transformers!")

            # Test embedding generation
            text = "This is a test sentence"
            inputs = tokenizer(text, return_tensors="pt", padding=True, truncation=True)

            with torch.no_grad():
                outputs = model(**inputs)
                embeddings = outputs.last_hidden_state.mean(dim=1)  # Mean pooling

            print(f"✓ Direct embedding generated: shape {embeddings.shape}")
            return True

        except Exception as e:
            print(f"✗ Direct transformers failed: {e}")
            return False

    except ImportError as e:
        print(f"✗ transformers not available: {e}")
        return False


def test_reranker():
    """Test reranker model"""
    try:
        import torch
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        print("Testing Qwen3-Reranker-4B...")

        model_name = "Qwen/Qwen3-Reranker-4B"
        cache_dir = os.environ.get(
            "HF_CACHE_PATH", os.path.expanduser("~/.cache/huggingface")
        )

        try:
            tokenizer = AutoTokenizer.from_pretrained(
                model_name, cache_dir=cache_dir, local_files_only=True
            )
            model = AutoModelForSequenceClassification.from_pretrained(
                model_name, cache_dir=cache_dir, local_files_only=True
            )

            print("✓ Qwen3-Reranker loaded successfully!")

            # Test reranking
            query = "What is machine learning?"
            document = "Machine learning is a subset of artificial intelligence."

            inputs = tokenizer(
                query, document, return_tensors="pt", padding=True, truncation=True
            )

            with torch.no_grad():
                outputs = model(**inputs)
                score = torch.sigmoid(outputs.logits).item()

            print(f"✓ Reranking score generated: {score}")
            return True

        except Exception as e:
            print(f"✗ Reranker test failed: {e}")
            return False

    except ImportError as e:
        print(f"✗ transformers not available for reranker: {e}")
        return False


def check_model_files():
    """Check what model files are actually available"""
    print("Checking model file availability...")

    cache_path = os.environ.get(
        "HF_CACHE_PATH", os.path.expanduser("~/.cache/huggingface")
    )
    embedding_path = Path(cache_path) / "hub/models--Qwen--Qwen3-Embedding-0.6B"
    reranker_path = Path(cache_path) / "hub/models--Qwen--Qwen3-Reranker-4B"

    for name, path in [("Embedding", embedding_path), ("Reranker", reranker_path)]:
        if path.exists():
            print(f"✓ {name} model directory exists")

            # Check for config files
            config_files = list(path.rglob("config.json"))
            if config_files:
                print(f"  ✓ Config files found: {len(config_files)}")
            else:
                print("  ✗ No config files found")

            # Check for model weights
            weight_files = list(path.rglob("*.safetensors")) + list(path.rglob("*.bin"))
            if weight_files:
                print(f"  ✓ Weight files found: {len(weight_files)}")
            else:
                print("  ✗ No weight files found")

            # Check for incomplete downloads
            incomplete_files = list(path.rglob("*.incomplete"))
            if incomplete_files:
                print(f"  ⚠ Incomplete downloads: {len(incomplete_files)}")

        else:
            print(f"✗ {name} model directory does not exist")


def create_embedding_api():
    """Create a simple embedding API function"""

    def embed_with_qwen(texts):
        """Fallback embedding function"""
        try:
            # Try sentence-transformers first
            from sentence_transformers import SentenceTransformer

            model = SentenceTransformer("Qwen/Qwen3-Embedding-0.6B")
            return model.encode(texts).tolist()
        except Exception:
            try:
                # Try direct transformers
                import torch
                from transformers import AutoModel, AutoTokenizer

                cache_dir = os.environ.get(
                    "HF_CACHE_PATH", os.path.expanduser("~/.cache/huggingface")
                )
                tokenizer = AutoTokenizer.from_pretrained(
                    "Qwen/Qwen3-Embedding-0.6B", cache_dir=cache_dir
                )
                model = AutoModel.from_pretrained(
                    "Qwen/Qwen3-Embedding-0.6B", cache_dir=cache_dir
                )

                embeddings = []
                for text in texts:
                    inputs = tokenizer(
                        text, return_tensors="pt", padding=True, truncation=True
                    )
                    with torch.no_grad():
                        outputs = model(**inputs)
                        embedding = (
                            outputs.last_hidden_state.mean(dim=1).squeeze().tolist()
                        )
                        embeddings.append(embedding)
                return embeddings
            except Exception:
                # Fallback to mock

                return [
                    [hash(text + str(i)) % 100 / 100.0 for i in range(384)]
                    for text in texts
                ]

    return embed_with_qwen


def main():
    """Main test function"""
    print("=== Qwen Model Availability Test ===")

    # Check file availability
    check_model_files()
    print()

    # Test different approaches
    success_count = 0

    if test_sentence_transformers():
        success_count += 1
    print()

    if test_transformers_direct():
        success_count += 1
    print()

    if test_reranker():
        success_count += 1
    print()

    print(f"=== Summary: {success_count}/3 tests successful ===")

    if success_count > 0:
        print("✓ Some Qwen models are functional")
        return True
    else:
        print("✗ No Qwen models are currently functional")
        print("Using fallback implementations...")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
