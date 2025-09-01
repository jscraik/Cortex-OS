from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Dict, Optional, Protocol

import httpx


class ModelAdapter(Protocol):
    name: str

    def available(self) -> bool: ...
    def chat(self, prompt: str, timeout: float) -> str: ...
    def embed(self, text: str, timeout: float) -> list[float]: ...
    def rerank(self, query: str, docs: list[str], timeout: float) -> list[int]: ...


@dataclass
class RouterConfig:
    timeout_seconds: float = 20.0
    retries: int = 1
    budget_ms: int = 10_000


class MLXAdapter:
    name = "mlx"

    def __init__(self) -> None:
        try:
            pass  # type: ignore
        except Exception:  # pragma: no cover - gated by availability
            self._ok = False
        else:
            self._ok = True

    def available(self) -> bool:
        return self._ok

    def chat(self, prompt: str, timeout: float) -> str:
        from mlx_lm import generate  # type: ignore

        start = time.time()
        out = generate(prompt, max_tokens=256, temp=0.2)
        if time.time() - start > timeout:
            raise TimeoutError("MLX chat timeout")
        return out

    def embed(self, text: str, timeout: float) -> list[float]:
        # Placeholder embedding using simple hashing to keep deterministic without model load
        # Not a semantic embedding; for smoke tests only
        return [((hash(text) >> i) & 0xFFFF) / 65535.0 for i in range(0, 64, 4)]

    def rerank(self, query: str, docs: list[str], timeout: float) -> list[int]:
        # Naive rerank by length similarity to query
        scored = sorted(enumerate(docs), key=lambda x: abs(len(x[1]) - len(query)))
        return [i for i, _ in scored]


class OllamaAdapter:
    name = "ollama"

    def __init__(self, base_url: str = "http://localhost:11434") -> None:
        self.base_url = base_url

    def available(self) -> bool:
        try:
            r = httpx.get(self.base_url + "/api/tags", timeout=1.5)
            return r.status_code == 200
        except Exception:
            return False

    def chat(self, prompt: str, timeout: float) -> str:
        r = httpx.post(
            self.base_url + "/api/generate",
            json={"model": "llama3", "prompt": prompt, "stream": False},
            timeout=timeout,
        )
        r.raise_for_status()
        data = r.json()
        return data.get("response", "")

    def embed(self, text: str, timeout: float) -> list[float]:
        r = httpx.post(
            self.base_url + "/api/embeddings",
            json={"model": "nomic-embed-text", "prompt": text},
            timeout=timeout,
        )
        r.raise_for_status()
        return r.json().get("embedding", [])

    def rerank(self, query: str, docs: list[str], timeout: float) -> list[int]:
        # Basic strategy: embed and cosine similarity
        import math

        q = self.embed(query, timeout)

        def cos(a: list[float], b: list[float]) -> float:
            dot = sum(x * y for x, y in zip(a, b))
            na = math.sqrt(sum(x * x for x in a))
            nb = math.sqrt(sum(x * x for x in b))
            return dot / (na * nb + 1e-9)

        scored = []
        for i, d in enumerate(docs):
            e = self.embed(d, timeout)
            scored.append((i, cos(q, e)))
        scored.sort(key=lambda x: x[1], reverse=True)
        return [i for i, _ in scored]


class ModelRouter:
    def __init__(self, config: Optional[RouterConfig] = None) -> None:
        self.config = config or RouterConfig()
        self.chain: list[ModelAdapter] = [MLXAdapter(), OllamaAdapter()]

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
