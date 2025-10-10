from __future__ import annotations

import logging
import math
import os
import time
from collections import Counter
from dataclasses import dataclass
from typing import Any, Dict, Optional, Protocol

import httpx

try:
    import instructor  # type: ignore[import-untyped]
except ImportError:
    instructor = None  # type: ignore[assignment]
from openai import OpenAI
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ModelAdapter(Protocol):
    """Protocol for model backends used by :class:`ModelRouter`."""

    name: str

    def available(self) -> bool: ...

    def chat(self, prompt: str, timeout: float) -> str: ...

    def embed(self, text: str, timeout: float) -> list[float]: ...

    def rerank(self, query: str, docs: list[str], timeout: float) -> list[int]: ...


@dataclass
class RouterConfig:
    """Configuration for :class:`ModelRouter`."""

    timeout_seconds: float = 20.0
    retries: int = 1
    budget_ms: int = 10_000


class MLXAdapter:
    """Adapter using local MLX models when available."""

    name = "mlx"

    def __init__(self) -> None:
        self._ok = False
        self._generate = None
        self._failure_reason: Optional[str] = None
        self._reported = False
        try:
            from mlx_lm import generate  # type: ignore[import-not-found]
        except ImportError as exc:  # pragma: no cover - optional dependency
            self._failure_reason = f"import error: {exc}"
            logger.info(
                "[brAInwav] MLX adapter unavailable: %s",
                self._failure_reason,
                extra={"brand": "brAInwav", "adapter": self.name},
            )
        except Exception as exc:  # pragma: no cover - defensive guard
            self._failure_reason = f"unexpected error: {exc}"
            logger.exception(
                "[brAInwav] Failed to initialize MLX adapter",
                extra={"brand": "brAInwav", "adapter": self.name},
            )
        else:
            self._generate = generate
            self._ok = True

    def available(self) -> bool:
        if not self._ok and not self._reported:
            logger.info(
                "[brAInwav] MLX adapter unavailable",
                extra={
                    "brand": "brAInwav",
                    "adapter": self.name,
                    "reason": self._failure_reason,
                },
            )
            self._reported = True
        return self._ok

    def chat(self, prompt: str, timeout: float) -> str:
        if not self._ok or self._generate is None:
            raise RuntimeError("MLX adapter is not available")
        start = time.time()
        out = self._generate(prompt, max_tokens=256, temp=0.2)
        if time.time() - start > timeout:
            raise TimeoutError("MLX chat timeout")
        return out

    def embed(self, text: str, timeout: float) -> list[float]:
        """Compute a lightweight bag-of-words embedding."""

        dim = 128
        vec = [0.0] * dim
        counts = Counter(text.lower().split())
        for token, c in counts.items():
            idx = hash(token) % dim
            vec[idx] += float(c)
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [x / norm for x in vec]

    def rerank(self, query: str, docs: list[str], timeout: float) -> list[int]:
        """Rerank documents by cosine similarity to the query."""

        q = self.embed(query, timeout)

        def cos(a: list[float], b: list[float]) -> float:
            dot = sum(x * y for x, y in zip(a, b))
            na = math.sqrt(sum(x * x for x in a)) or 1.0
            nb = math.sqrt(sum(x * x for x in b)) or 1.0
            return dot / (na * nb)

        scored = []
        for i, d in enumerate(docs):
            e = self.embed(d, timeout)
            scored.append((i, cos(q, e)))
        scored.sort(key=lambda x: x[1], reverse=True)
        return [i for i, _ in scored]


class _OllamaChat(BaseModel):
    response: str


class OllamaAdapter:
    """Adapter for an Ollama server."""

    name = "ollama"

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        models: Optional[list[str]] = None,
        embed_models: Optional[list[str]] = None,
        api_key: str = "ollama",
    ) -> None:
        """Configure access to an Ollama instance.

        Args:
            base_url: The base URL for the Ollama instance.
            models: Optional list of chat models. Falls back to ``OLLAMA_MODELS``
                environment variable or ``["qwen3-coder:30b"]`` if unset.
            embed_models: Optional list of embedding models. Falls back to
                ``OLLAMA_EMBED_MODELS`` environment variable or
                ``["nomic-embed-text:v1.5"]``.
            api_key: The API key for authentication. Default is "ollama", which
                is expected for local Ollama instances.
        """

        chat_env = os.getenv("OLLAMA_MODELS")
        if models is None:
            if chat_env:
                models = [m.strip() for m in chat_env.split(",") if m.strip()]
            else:
                models = ["qwen3-coder:30b"]

        embed_env = os.getenv("OLLAMA_EMBED_MODELS")
        if embed_models is None:
            if embed_env:
                embed_models = [m.strip() for m in embed_env.split(",") if m.strip()]
            else:
                embed_models = ["nomic-embed-text:v1.5"]

        self.base_url = base_url
        self.models = models
        self.embed_models = embed_models
        if instructor is not None:
            self._client = instructor.from_openai(
                OpenAI(base_url=f"{base_url}/v1", api_key=api_key),
                mode=instructor.Mode.JSON,
            )
        else:
            self._client = OpenAI(base_url=f"{base_url}/v1", api_key=api_key)

    def available(self) -> bool:
        try:
            r = httpx.get(self.base_url + "/api/tags", timeout=1.5)
            return r.status_code == 200
        except Exception:
            return False

    def chat(self, prompt: str, timeout: float) -> str:
        last_err: Exception | None = None
        for model in self.models:
            try:
                if instructor is not None:
                    res = self._client.chat.completions.create(  # type: ignore[misc]
                        model=model,
                        response_model=_OllamaChat,
                        messages=[{"role": "user", "content": prompt}],
                        timeout=timeout,
                    )
                    return res.response  # type: ignore[return-value]
                else:
                    res = self._client.chat.completions.create(
                        model=model,
                        messages=[{"role": "user", "content": prompt}],
                        timeout=timeout,
                    )
                    return res.choices[0].message.content or ""
            except Exception as exc:  # pragma: no cover - depends on model availability
                last_err = exc
                logger.warning("chat model %s failed: %s", model, exc)
        raise RuntimeError(f"All chat models failed: {last_err}")

    def embed(self, text: str, timeout: float) -> list[float]:
        last_err: Exception | None = None
        for model in self.embed_models:
            try:
                res = self._client.embeddings.create(
                    model=model,
                    input=text,
                    timeout=timeout,
                )
                return res.data[0].embedding
            except Exception as exc:  # pragma: no cover - depends on model availability
                last_err = exc
                logger.warning("embed model %s failed: %s", model, exc)
        raise RuntimeError(f"All embed models failed: {last_err}")

    def rerank(self, query: str, docs: list[str], timeout: float) -> list[int]:
        q = self.embed(query, timeout)

        def cos(a: list[float], b: list[float]) -> float:
            dot = sum(x * y for x, y in zip(a, b))
            na = math.sqrt(sum(x * x for x in a)) or 1.0
            nb = math.sqrt(sum(x * x for x in b)) or 1.0
            return dot / (na * nb)

        scored = []
        for i, d in enumerate(docs):
            e = self.embed(d, timeout)
            scored.append((i, cos(q, e)))
        scored.sort(key=lambda x: x[1], reverse=True)
        return [i for i, _ in scored]


class ModelRouter:
    """Route requests to the first available model adapter."""

    def __init__(
        self,
        config: Optional[RouterConfig] = None,
        adapters: Optional[list[ModelAdapter]] = None,
    ) -> None:
        self.config = config or RouterConfig()
        self.chain: list[ModelAdapter] = adapters or [MLXAdapter(), OllamaAdapter()]

    def _first_available(self) -> Optional[ModelAdapter]:
        for a in self.chain:
            if a.available():
                return a
        return None

    def chat(self, prompt: str) -> Dict[str, Any]:
        start = time.time()
        last_err: Optional[str] = None
        for attempt in range(self.config.retries + 1):
            adapter = self._first_available()
            if adapter is None:
                last_err = "No adapters available"
                break
            try:
                text = adapter.chat(prompt, self.config.timeout_seconds)
                elapsed = int((time.time() - start) * 1000)
                return {
                    "adapter": adapter.name,
                    "text": text,
                    "elapsed_ms": elapsed,
                }
            except Exception as e:  # pragma: no cover
                last_err = str(e)
                logger.exception("chat failed via %s", adapter.name)
        raise RuntimeError(last_err or "Unknown router error")

    def embed(self, text: str) -> Dict[str, Any]:
        adapter = self._first_available()
        if adapter is None:
            raise RuntimeError("No adapters available")
        vec = adapter.embed(text, self.config.timeout_seconds)
        return {"adapter": adapter.name, "embedding": vec}

    def rerank(self, query: str, docs: list[str]) -> Dict[str, Any]:
        adapter = self._first_available()
        if adapter is None:
            raise RuntimeError("No adapters available")
        order = adapter.rerank(query, docs, self.config.timeout_seconds)
        return {"adapter": adapter.name, "order": order}


__all__ = [
    "ModelRouter",
    "RouterConfig",
    "MLXAdapter",
    "OllamaAdapter",
]
