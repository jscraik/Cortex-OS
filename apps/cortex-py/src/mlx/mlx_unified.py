#!/usr/bin/env python3
"""
Unified MLX script for embeddings, chat, and reranking
Supports multiple model types and uses ExternalSSD cache
"""

import argparse
import json
import os
import sys
from typing import Any

# Constants
DEFAULT_MAX_LENGTH = 512
DEFAULT_MAX_TOKENS = 4096
DEFAULT_TEMPERATURE = 0.7
DEFAULT_CACHE_DIR = '/Volumes/ExternalSSD/huggingface_cache'
DEFAULT_MLX_CACHE_DIR = '/Volumes/ExternalSSD/ai-cache'
FALLBACK_TEST_TEXT = "test"

try:
    import mlx.core as mx
    import mlx_lm
    import mlx_vlm
    import numpy as np
    import torch
    from mlx_lm import generate, load
    from transformers import AutoModel, AutoTokenizer
except ImportError as e:
    print(f"Error importing MLX dependencies: {e}", file=sys.stderr)
    print("Please install with: pip install mlx mlx-lm mlx-vlm transformers torch numpy", file=sys.stderr)
    sys.exit(1)


# Configure cache directories
os.environ.setdefault('HF_HOME', DEFAULT_CACHE_DIR)
os.environ.setdefault('TRANSFORMERS_CACHE', DEFAULT_CACHE_DIR)
os.environ.setdefault('MLX_CACHE_DIR', DEFAULT_MLX_CACHE_DIR)


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
        if 'embedding' in model_name.lower():
            self.model_type = 'embedding'
        elif 'rerank' in model_name.lower():
            self.model_type = 'reranking'
        elif any(x in model_name.lower() for x in ['chat', 'instruct', 'coder', 'vl']):
            self.model_type = 'chat'
        else:
            self.model_type = 'chat'  # Default to chat

        print(f"Detected model type: {self.model_type} for {model_name}")

    def load_model(self) -> None:
        """Load the appropriate model based on type"""
        try:
            if self.model_type == 'embedding':
                self.model = AutoModel.from_pretrained(
                    self.model_path,
                    trust_remote_code=True,
                    cache_dir=os.environ.get('TRANSFORMERS_CACHE')
                )
                self.tokenizer = AutoTokenizer.from_pretrained(
                    self.model_path,
                    cache_dir=os.environ.get('TRANSFORMERS_CACHE')
                )
            elif self.model_type == 'chat':
                # Use MLX-LM for chat models
                if 'vl' in self.model_name.lower():
                    # Vision-language model
                    self.model = mlx_vlm.load(self.model_path)
                else:
                    # Regular chat model
                    self.model, self.tokenizer = mlx_lm.load(self.model_path)
            elif self.model_type == 'reranking':
                self.model = AutoModel.from_pretrained(
                    self.model_path,
                    trust_remote_code=True,
                    cache_dir=os.environ.get('TRANSFORMERS_CACHE')
                )
                self.tokenizer = AutoTokenizer.from_pretrained(
                    self.model_path,
                    cache_dir=os.environ.get('TRANSFORMERS_CACHE')
                )

            print(f"✅ Loaded {self.model_type} model: {self.model_name}")

        except Exception as e:
            print(f"❌ Failed to load model {self.model_name}: {e}", file=sys.stderr)
            raise

    def generate_embedding(self, text: str) -> list[float]:
        """Generate embedding for single text"""
        if not self.model or self.model_type != 'embedding':
            raise ValueError("Embedding model not loaded")

        if not text or not isinstance(text, str):
            raise ValueError("Text must be a non-empty string")

        inputs = self.tokenizer(text, return_tensors='pt', truncation=True, max_length=DEFAULT_MAX_LENGTH)

        with torch.no_grad():
            outputs = self.model(**inputs)
            # Use CLS token or mean pooling
            if hasattr(outputs, 'last_hidden_state'):
                embedding = outputs.last_hidden_state.mean(dim=1).squeeze()
            elif hasattr(outputs, 'pooler_output'):
                embedding = outputs.pooler_output.squeeze()
            else:
                embedding = outputs[0].mean(dim=1).squeeze()

        return embedding.numpy().tolist()

    def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts"""
        return [self.generate_embedding(text) for text in texts]

    def generate_chat(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = DEFAULT_MAX_TOKENS,
        temperature: float = DEFAULT_TEMPERATURE
    ) -> dict[str, str | dict[str, int]]:
        """Generate chat completion"""
        if not self.model or self.model_type != 'chat':
            raise ValueError("Chat model not loaded")

        if not messages or not isinstance(messages, list):
            raise ValueError("Messages must be a non-empty list")

        for msg in messages:
            if not isinstance(msg, dict) or 'role' not in msg or 'content' not in msg:
                raise ValueError("Each message must be a dict with 'role' and 'content' keys")

        # Format messages into prompt
        if 'vl' in self.model_name.lower():
            # Vision-language model - handle specially
            prompt = self._format_vl_messages(messages)
            response = mlx_vlm.generate(
                self.model,
                self.tokenizer,
                prompt,
                max_tokens=max_tokens,
                temp=temperature
            )
        else:
            # Regular chat model
            prompt = self._format_chat_messages(messages)
            response = mlx_lm.generate(
                self.model,
                self.tokenizer,
                prompt=prompt,
                max_tokens=max_tokens,
                temp=temperature,
                verbose=False
            )

        return {
            'content': response,
            'usage': {
                'prompt_tokens': self._estimate_tokens(prompt),
                'completion_tokens': self._estimate_tokens(response),
                'total_tokens': self._estimate_tokens(prompt + response),
            }
        }

    def generate_reranking(self, query: str, documents: list[str]) -> list[dict[str, int | float]]:
        """Generate reranking scores"""
        if not self.model or self.model_type != 'reranking':
            raise ValueError("Reranking model not loaded")

        scores = []
        for i, doc in enumerate(documents):
            # Create query-document pairs
            inputs = self.tokenizer(
                f"Query: {query} Document: {doc}",
                return_tensors='pt',
                truncation=True,
                max_length=DEFAULT_MAX_LENGTH
            )

            with torch.no_grad():
                outputs = self.model(**inputs)
                # Extract relevance score (model-specific logic)
                if hasattr(outputs, 'logits'):
                    score = torch.sigmoid(outputs.logits).item()
                else:
                    # Fallback: use similarity between query and document embeddings
                    query_embedding = outputs.last_hidden_state[:, 0, :]  # CLS token
                    doc_embedding = outputs.last_hidden_state.mean(dim=1)  # Mean pooling
                    score = torch.cosine_similarity(
                        query_embedding,
                        doc_embedding
                    ).item()

            scores.append({'index': i, 'score': score})

        # Sort by score descending
        return sorted(scores, key=lambda x: x['score'], reverse=True)

    def _format_chat_messages(self, messages: list[dict[str, str]]) -> str:
        """Format messages for chat models"""
        formatted = []
        for msg in messages:
            role = msg['role'].title()
            content = msg['content']
            formatted.append(f"{role}: {content}")

        formatted.append("Assistant: ")  # Prompt for response
        return "\n".join(formatted)

    def _format_vl_messages(self, messages: list[dict[str, str]]) -> str:
        """Format messages for vision-language models"""
        # Simple formatting for VL models
        return "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])

    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimation"""
        if self.tokenizer:
            return len(self.tokenizer.encode(text))
        return max(1, len(text) // 4)  # Fallback estimate


def main():
    parser = argparse.ArgumentParser(description="Unified MLX model interface")
    parser.add_argument('input_data', nargs='*', help='Input text(s) or JSON messages')
    parser.add_argument('--model', required=True, help='Model name/path')
    parser.add_argument('--model-path', help='Local model path')
    parser.add_argument('--embedding-mode', action='store_true', help='Generate embeddings')
    parser.add_argument('--batch-embedding-mode', action='store_true', help='Generate batch embeddings')
    parser.add_argument('--chat-mode', action='store_true', help='Generate chat completion')
    parser.add_argument('--rerank-mode', action='store_true', help='Generate reranking scores')
    parser.add_argument('--max-tokens', type=int, default=DEFAULT_MAX_TOKENS, help='Max tokens for generation')
    parser.add_argument('--temperature', type=float, default=DEFAULT_TEMPERATURE, help='Generation temperature')
    parser.add_argument('--json-only', action='store_true', help='Output JSON only')
    parser.add_argument('--help', action='store_true', help='Show help')

    args = parser.parse_args()

    if args.help:
        parser.print_help()
        return

    if not args.input_data and not any([args.embedding_mode, args.batch_embedding_mode, args.chat_mode, args.rerank_mode]):
        print("Error: No input data or mode specified", file=sys.stderr)
        sys.exit(1)

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
                messages,
                max_tokens=args.max_tokens,
                temperature=args.temperature
            )

        elif args.rerank_mode:
            query = args.input_data[0]
            try:
                documents = json.loads(args.input_data[1])
            except (json.JSONDecodeError, IndexError):
                documents = args.input_data[1:]

            result = {'scores': mlx_model.generate_reranking(query, documents)}

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
            print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
