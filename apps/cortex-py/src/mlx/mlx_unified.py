#!/usr/bin/env python3
"""
Unified MLX script for embeddings, chat, and reranking
Supports multiple model types and uses ExternalSSD cache
"""

import argparse
import json
import logging
import os
import sys

from pydantic import BaseModel as PydanticBaseModel

# Default constant fallbacks (overridable via env helpers below)
_FALLBACK_MAX_LENGTH = 512
_FALLBACK_MAX_TOKENS = 4096
_FALLBACK_TEMPERATURE = 0.7


# Simplified environment reads - removed complex validation
def get_default_max_length() -> int:
    return int(os.getenv("MLX_DEFAULT_MAX_LENGTH") or _FALLBACK_MAX_LENGTH)


def get_default_max_tokens() -> int:
    return int(os.getenv("MLX_DEFAULT_MAX_TOKENS") or _FALLBACK_MAX_TOKENS)


def get_default_temperature() -> float:
    return float(os.getenv("MLX_DEFAULT_TEMPERATURE") or _FALLBACK_TEMPERATURE)


DEFAULT_MAX_LENGTH = get_default_max_length()
DEFAULT_MAX_TOKENS = get_default_max_tokens()
DEFAULT_TEMPERATURE = get_default_temperature()
# Default cache directories now derive from HOME to avoid hard-coded platform paths.
_HOME = os.path.expanduser("~")
DEFAULT_CACHE_DIR = os.path.join(_HOME, ".cache", "huggingface")
DEFAULT_MLX_CACHE_DIR = os.path.join(_HOME, ".cache", "mlx")
FALLBACK_TEST_TEXT = "test"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    import mlx_lm
    import mlx_vlm
except ImportError as e:  # pragma: no cover - dependency resolution
    logger.error("Error importing MLX dependencies: %s", e)
    logger.error(
        "Please install with: pip install mlx mlx-lm mlx-vlm transformers torch numpy"
    )
    mlx_lm = mlx_vlm = None

try:
    import torch
    from transformers import AutoModel, AutoTokenizer
except ImportError as e:  # pragma: no cover - transformer deps
    logger.error("Error importing transformer dependencies: %s", e)
    torch = None
    AutoModel = AutoTokenizer = None

try:
    from sentence_transformers import SentenceTransformer
except ImportError as e:  # pragma: no cover - sentence transformers optional
    logger.info("SentenceTransformers not available for CPU fallback: %s", e)
    SentenceTransformer = None

# Simplified instructor import - complex fallback removed
try:
    import instructor
except ImportError:
    instructor = None

BaseModel = PydanticBaseModel
ollama_client = None


# Cache directory getters


def get_hf_home() -> str:
    """Return HuggingFace home cache directory.

    Resolution order:
    1. HF_HOME env var
    2. TRANSFORMERS_CACHE env var (compat)
    3. DEFAULT_CACHE_DIR under user home
    """
    return (
        os.environ.get("HF_HOME")
        or os.environ.get("TRANSFORMERS_CACHE")
        or DEFAULT_CACHE_DIR
    )


def get_transformers_cache() -> str:
    """Return transformers cache directory, falling back to HF_HOME logic."""
    return os.environ.get("TRANSFORMERS_CACHE") or get_hf_home()


def get_mlx_cache_dir() -> str:
    """Return MLX cache directory (models, weights)."""
    return os.environ.get("MLX_CACHE_DIR") or DEFAULT_MLX_CACHE_DIR


class ChatResponse(BaseModel):
    """Structured chat response model for instructor validation"""

    content: str
    usage: dict[str, int]


class MLXUnified:
    """Unified MLX interface for all model types"""

    def __init__(self, model_name: str, model_path: str | None = None):
        """Initialize with model name and optional local path"""
        if not model_name or not isinstance(model_name, str):
            raise ValueError("Model name must be a non-empty string")

        self.model_name = model_name
        self.model_path = model_path or model_name
        self.model = None
        self.tokenizer = None

        # Detect model type from name
        if "embedding" in model_name.lower():
            self.model_type = "embedding"
        elif "rerank" in model_name.lower():
            self.model_type = "reranking"
        elif any(x in model_name.lower() for x in ["chat", "instruct", "coder", "vl"]):
            self.model_type = "chat"
        else:
            self.model_type = "chat"  # Default to chat

        # Detect platform capabilities
        import platform

        self.is_darwin = platform.system() == "Darwin"
        self.mlx_available = (
            mlx_lm is not None and mlx_vlm is not None and self.is_darwin
        )
        self.torch_available = torch is not None
        self.sentence_transformers_available = SentenceTransformer is not None

        logger.info(
            "Detected model type %s for %s (MLX: %s, Torch: %s, CPU fallback: %s)",
            self.model_type,
            model_name,
            self.mlx_available,
            self.torch_available,
            self.sentence_transformers_available,
        )

    def load_model(self) -> None:  # pragma: no cover - heavy I/O
        """Load the appropriate model based on type with cross-platform fallbacks"""
        try:
            if self.model_type == "embedding":
                if self.sentence_transformers_available:
                    # Use sentence-transformers for cross-platform compatibility
                    logger.info(
                        "Loading embedding model with sentence-transformers: %s",
                        self.model_path,
                    )
                    self.model = SentenceTransformer(
                        self.model_path, cache_folder=get_transformers_cache()
                    )
                    self.tokenizer = None  # Not needed for sentence-transformers
                elif self.torch_available and AutoModel is not None:
                    # Fallback to transformers + torch
                    logger.info(
                        "Loading embedding model with transformers: %s", self.model_path
                    )
                    self.model = AutoModel.from_pretrained(
                        self.model_path,
                        cache_dir=get_transformers_cache(),
                    )
                    self.tokenizer = AutoTokenizer.from_pretrained(
                        self.model_path, cache_dir=get_transformers_cache()
                    )
                else:
                    raise RuntimeError(
                        "No embedding backend available (need sentence-transformers or torch+transformers)"
                    )

            elif self.model_type == "chat":
                if self.mlx_available:
                    # Use MLX-LM for chat models on macOS
                    if "vl" in self.model_name.lower():
                        logger.info("Loading VL model with MLX: %s", self.model_path)
                        self.model = mlx_vlm.load(self.model_path)
                    else:
                        logger.info("Loading chat model with MLX: %s", self.model_path)
                        self.model, self.tokenizer = mlx_lm.load(self.model_path)
                elif self.torch_available and AutoModel is not None:
                    # Fallback to transformers for CPU inference
                    logger.info(
                        "Loading chat model with transformers (CPU): %s",
                        self.model_path,
                    )
                    self.model = AutoModel.from_pretrained(
                        self.model_path,
                        cache_dir=get_transformers_cache(),
                    )
                    self.tokenizer = AutoTokenizer.from_pretrained(
                        self.model_path, cache_dir=get_transformers_cache()
                    )
                else:
                    raise RuntimeError(
                        "No chat backend available (need MLX or torch+transformers)"
                    )

            elif self.model_type == "reranking":
                if self.torch_available and AutoModel is not None:
                    logger.info(
                        "Loading reranking model with transformers: %s", self.model_path
                    )
                    self.model = AutoModel.from_pretrained(
                        self.model_path,
                        cache_dir=get_transformers_cache(),
                    )
                    self.tokenizer = AutoTokenizer.from_pretrained(
                        self.model_path, cache_dir=get_transformers_cache()
                    )
                else:
                    raise RuntimeError(
                        "No reranking backend available (need torch+transformers)"
                    )

            logger.info(
                "Successfully loaded %s model: %s", self.model_type, self.model_name
            )

        except Exception as e:
            logger.exception("Failed to load model %s: %s", self.model_name, e)
            raise

    def generate_embedding(self, text: str) -> list[float]:
        """Generate embedding for single text with cross-platform support"""
        if not text:
            raise ValueError("Text must be a non-empty string")
        if self.model_type != "embedding" or self.model is None:
            raise ValueError("Embedding model not loaded")

        # Use sentence-transformers if available (cross-platform)
        if self.sentence_transformers_available and hasattr(self.model, "encode"):
            embedding = self.model.encode(text, convert_to_numpy=True)
            return embedding.tolist()

        # Fallback to transformers + torch
        if self.tokenizer is None:
            raise RuntimeError("Tokenizer not initialized for transformers backend")
        if torch is None:
            raise RuntimeError("Torch not available for embedding generation")

        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=get_default_max_length(),
        )

        with torch.no_grad():  # type: ignore[union-attr]
            outputs = self.model(**inputs)  # type: ignore[operator]
            if hasattr(outputs, "last_hidden_state"):
                embedding_tensor = outputs.last_hidden_state.mean(dim=1).squeeze()
            elif hasattr(outputs, "pooler_output"):
                embedding_tensor = outputs.pooler_output.squeeze()
            else:
                embedding_tensor = outputs[0].mean(dim=1).squeeze()

        return embedding_tensor.numpy().tolist()  # type: ignore[union-attr]

    def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts"""
        return [self.generate_embedding(text) for text in texts]

    def generate_chat(
        self,
        messages: list[dict[str, str]],
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> dict[str, str | dict[str, int]]:
        """Generate chat completion using instructor for structured outputs"""
        if not self.model or self.model_type != "chat":
            raise ValueError("Chat model not loaded")

        if not messages or not isinstance(messages, list):
            raise ValueError("Messages must be a non-empty list")

        for msg in messages:
            if not isinstance(msg, dict) or "role" not in msg or "content" not in msg:
                raise ValueError(
                    "Each message must be a dict with 'role' and 'content' keys"
                )

        try:
            # Use instructor with Ollama API for structured outputs
            if ollama_client:
                response = ollama_client.chat.completions.create(
                    model=self.model_name,
                    messages=messages,
                    max_tokens=max_tokens or get_default_max_tokens(),
                    temperature=temperature or get_default_temperature(),
                    response_model=ChatResponse,
                )
                return {
                    "content": response.content,
                    "usage": response.usage,
                }
            else:
                # Fallback to direct MLX inference if instructor unavailable
                logger.warning(
                    "Instructor not available, falling back to direct MLX inference"
                )
                return self._generate_chat_fallback(
                    messages,
                    max_tokens or get_default_max_tokens(),
                    temperature or get_default_temperature(),
                )

        except Exception as e:
            logger.error("Error with instructor inference, falling back to MLX: %s", e)
            return self._generate_chat_fallback(
                messages,
                max_tokens or get_default_max_tokens(),
                temperature or get_default_temperature(),
            )

    def _generate_chat_fallback(  # pragma: no cover - heavy inference
        self,
        messages: list[dict[str, str]],
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> dict[str, str | dict[str, int]]:
        """Cross-platform chat generation fallback"""
        max_tokens = max_tokens or get_default_max_tokens()
        temperature = temperature or get_default_temperature()

        # Format messages into prompt
        prompt = self._format_chat_messages(messages)

        # Use MLX if available (macOS)
        if self.mlx_available:
            if "vl" in self.model_name.lower():
                # Vision-language model
                response = mlx_vlm.generate(
                    self.model,
                    self.tokenizer,
                    prompt,
                    max_tokens=max_tokens,
                    temp=temperature,
                )
            else:
                # Regular chat model
                response = mlx_lm.generate(
                    self.model,
                    self.tokenizer,
                    prompt=prompt,
                    max_tokens=max_tokens,
                    temp=temperature,
                    verbose=False,
                )
        elif self.torch_available and self.tokenizer is not None:
            # CPU fallback using transformers
            logger.info("Using CPU fallback for chat generation")
            inputs = self.tokenizer(
                prompt,
                return_tensors="pt",
                truncation=True,
                max_length=get_default_max_length(),
            )

            with torch.no_grad():  # type: ignore[union-attr]
                # Simple completion - this is basic but operational
                outputs = self.model.generate(  # type: ignore[union-attr]
                    **inputs,
                    max_new_tokens=min(max_tokens, 100),  # Conservative limit for CPU
                    temperature=temperature,
                    do_sample=temperature > 0.0,
                    pad_token_id=self.tokenizer.eos_token_id,
                )
                response_ids = outputs[0][inputs["input_ids"].shape[1] :]
                response = self.tokenizer.decode(response_ids, skip_special_tokens=True)
        else:
            raise RuntimeError("No chat generation backend available")

        return {
            "content": response,
            "usage": {
                "prompt_tokens": self._estimate_tokens(prompt),
                "completion_tokens": self._estimate_tokens(response),
                "total_tokens": self._estimate_tokens(prompt + response),
            },
        }

    def generate_reranking(  # pragma: no cover - heavy inference
        self, query: str, documents: list[str]
    ) -> list[dict[str, int | float]]:
        """Generate reranking scores with cross-platform support"""
        if not self.model or self.model_type != "reranking":
            raise ValueError("Reranking model not loaded")

        if not self.torch_available or self.tokenizer is None:
            raise RuntimeError("Torch and tokenizer required for reranking")

        scores = []
        for i, doc in enumerate(documents):
            # Create query-document pairs
            inputs = self.tokenizer(
                f"Query: {query} Document: {doc}",
                return_tensors="pt",
                truncation=True,
                max_length=get_default_max_length(),
            )

            with torch.no_grad():  # type: ignore[union-attr]
                outputs = self.model(**inputs)  # type: ignore[operator]
                # Extract relevance score (model-specific logic)
                if hasattr(outputs, "logits"):
                    score = torch.sigmoid(outputs.logits).item()  # type: ignore[union-attr]
                else:
                    # Fallback: use similarity between query and document embeddings
                    query_embedding = outputs.last_hidden_state[:, 0, :]  # CLS token
                    doc_embedding = outputs.last_hidden_state.mean(
                        dim=1
                    )  # Mean pooling
                    score = torch.cosine_similarity(  # type: ignore[union-attr]
                        query_embedding, doc_embedding
                    ).item()

            scores.append({"index": i, "score": score})

        # Sort by score descending
        return sorted(scores, key=lambda x: x["score"], reverse=True)

    def _format_chat_messages(
        self, messages: list[dict[str, str]]
    ) -> str:  # pragma: no cover - formatting utility
        """Format messages for chat models"""
        formatted = []
        for msg in messages:
            role = msg["role"].title()
            content = msg["content"]
            formatted.append(f"{role}: {content}")

        formatted.append("Assistant: ")  # Prompt for response
        return "\n".join(formatted)

    def _format_vl_messages(
        self, messages: list[dict[str, str]]
    ) -> str:  # pragma: no cover - formatting utility
        """Format messages for vision-language models"""
        # Simple formatting for VL models
        return "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])

    def _estimate_tokens(self, text: str) -> int:  # pragma: no cover - rough estimate
        """Rough token estimation"""
        if self.tokenizer:
            return len(self.tokenizer.encode(text))
        return max(1, len(text) // 4)  # Fallback estimate


def main():  # pragma: no cover - CLI utility
    parser = argparse.ArgumentParser(description="Unified MLX model interface")
    parser.add_argument("input_data", nargs="*", help="Input text(s) or JSON messages")
    parser.add_argument("--model", required=True, help="Model name/path")
    parser.add_argument("--model-path", help="Local model path")
    parser.add_argument(
        "--embedding-mode", action="store_true", help="Generate embeddings"
    )
    parser.add_argument(
        "--batch-embedding-mode", action="store_true", help="Generate batch embeddings"
    )
    parser.add_argument(
        "--chat-mode", action="store_true", help="Generate chat completion"
    )
    parser.add_argument(
        "--rerank-mode", action="store_true", help="Generate reranking scores"
    )
    parser.add_argument(
        "--max-tokens",
        type=int,
        default=DEFAULT_MAX_TOKENS,
        help="Max tokens for generation",
    )
    parser.add_argument(
        "--temperature",
        type=float,
        default=DEFAULT_TEMPERATURE,
        help="Generation temperature",
    )
    parser.add_argument("--json-only", action="store_true", help="Output JSON only")

    args = parser.parse_args()

    # argparse provides -h/--help by default; no custom help flag handling required

    # If no explicit mode or input provided, fall back to embedding with test text
    if not args.input_data and not any(
        [
            args.embedding_mode,
            args.batch_embedding_mode,
            args.chat_mode,
            args.rerank_mode,
        ]
    ):
        # default to embedding mode using FALLBACK_TEST_TEXT to support CLI fallback tests
        args.embedding_mode = True
        args.input_data = [FALLBACK_TEST_TEXT]

    try:
        # Initialize model
        mlx_model = MLXUnified(args.model, args.model_path)
        mlx_model.load_model()

        # Process based on mode
        if args.embedding_mode:
            text = args.input_data[0] if args.input_data else FALLBACK_TEST_TEXT
            embedding = mlx_model.generate_embedding(text)
            result = [embedding]  # Return as array for consistency

        elif args.batch_embedding_mode:
            texts = args.input_data
            embeddings = mlx_model.generate_embeddings(texts)
            result = embeddings

        elif args.chat_mode:
            try:
                messages = json.loads(args.input_data[0])
            except (json.JSONDecodeError, IndexError):
                # Fallback: treat as simple prompt
                messages = [{"role": "user", "content": " ".join(args.input_data)}]

            result = mlx_model.generate_chat(
                messages, max_tokens=args.max_tokens, temperature=args.temperature
            )

        elif args.rerank_mode:
            query = args.input_data[0]
            try:
                documents = json.loads(args.input_data[1])
            except (json.JSONDecodeError, IndexError):
                documents = args.input_data[1:]

            result = {"scores": mlx_model.generate_reranking(query, documents)}

        else:
            # Default: single embedding mode
            text = args.input_data[0] if args.input_data else FALLBACK_TEST_TEXT
            embedding = mlx_model.generate_embedding(text)
            result = [embedding]

        # Output result
        if args.json_only:
            print(json.dumps(result))
        else:
            print(f"Model: {args.model}")
            print(f"Result: {json.dumps(result, indent=2)}")

    except Exception as e:
        if args.json_only:
            print(json.dumps({"error": str(e)}))
        else:
            logger.error("Error: %s", e)
        sys.exit(1)


if __name__ == "__main__":
    main()
