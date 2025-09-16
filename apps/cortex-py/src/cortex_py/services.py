from __future__ import annotations

import logging
import threading
import time
from collections import OrderedDict, deque
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Iterable, Sequence

logger = logging.getLogger(__name__)


class ServiceError(RuntimeError):
    """Base class for embedding service errors."""

    DEFAULT_CODE = "INTERNAL_ERROR"

    def __init__(self, message: str, *, code: str | None = None) -> None:
        super().__init__(message)
        self.code = code or self.DEFAULT_CODE


class ServiceValidationError(ServiceError):
    """Raised when user input fails validation."""

    DEFAULT_CODE = "VALIDATION_ERROR"


class SecurityViolation(ServiceError):
    """Raised when potentially malicious payloads are detected."""

    DEFAULT_CODE = "SECURITY_VIOLATION"


class RateLimitExceeded(ServiceError):
    """Raised when the in-memory rate limiter denies a request."""

    DEFAULT_CODE = "RATE_LIMITED"


@dataclass(slots=True)
class EmbeddingServiceResult:
    """Container for single embedding generation results."""

    embedding: list[float]
    cached: bool
    metadata: dict[str, Any]


@dataclass(slots=True)
class BatchEmbeddingServiceResult:
    """Container for batch embedding generation results."""

    embeddings: list[list[float]]
    cached_hits: int
    metadata: dict[str, Any]


class EmbeddingService:
    """Domain service bridging FastAPI endpoints and MCP tooling."""

    _SECURITY_BLOCKLIST = (
        "<script",
        "file://",
        "..",
        "${",
        "`",
        "os.system",
    )

    def __init__(
        self,
        generator: Any,
        *,
        generator_provider: Callable[[], Any] | None = None,
        max_chars: int = 8_192,
        cache_size: int = 128,
        rate_limit_per_minute: int = 120,
        audit_logger: logging.Logger | None = None,
        rate_window_seconds: float = 60.0,
    ) -> None:
        self._generator = generator
        self._generator_provider = generator_provider
        self.max_chars = max_chars
        self.cache_size = cache_size
        self.rate_limit_per_minute = max(rate_limit_per_minute, 0)
        self.audit_logger = audit_logger or logger.getChild("audit")
        self.rate_window_seconds = rate_window_seconds

        self._cache: "OrderedDict[tuple[str, bool], tuple[list[float], dict[str, Any]]]" = (
            OrderedDict()
        )
        self._lock = threading.RLock()
        self._requests: deque[float] = deque()
        self._metrics = {
            "cache_hits": 0,
            "cache_misses": 0,
            "rate_limited": 0,
        }

    @property
    def generator(self) -> Any:
        """Return the active embedding generator, resolving lazily when needed."""

        if self._generator_provider is not None:
            generator = self._generator_provider()
            if generator is not None:
                self._generator = generator
        return self._generator

    def set_generator(self, generator: Any) -> None:
        """Update the backing generator instance."""

        self._generator = generator
        self._generator_provider = None

    # Public API -----------------------------------------------------------------

    def generate_single(self, text: str, *, normalize: bool = True) -> EmbeddingServiceResult:
        sanitized = self._sanitize_text(text)
        self._run_security_checks([sanitized])

        key = (sanitized, bool(normalize))
        cached = self._from_cache(key)
        if cached is not None:
            embedding, metadata = cached
            metadata = {**metadata, "cached": True, "source": "cache"}
            self._metrics["cache_hits"] += 1
            return EmbeddingServiceResult(embedding=list(embedding), cached=True, metadata=metadata)

        self._metrics["cache_misses"] += 1
        self._enforce_rate_limit()
        generator = self.generator
        self._audit("embedding.single", [sanitized])

        try:
            embedding = generator.generate_embedding(sanitized)
        except Exception as exc:  # pragma: no cover - delegated failure
            raise ServiceError(f"embedding generation failed: {exc}") from exc

        metadata = self._build_metadata(generator, embedding, cached=False)
        self._store_cache(key, embedding, metadata)
        return EmbeddingServiceResult(embedding=list(embedding), cached=False, metadata=metadata)

    def generate_batch(self, texts: Sequence[str], *, normalize: bool = True) -> BatchEmbeddingServiceResult:
        if not isinstance(texts, Iterable):
            raise ServiceValidationError("texts must be an iterable of strings")

        sanitized_items: list[str] = []
        for idx, raw in enumerate(texts):
            if not isinstance(raw, str):
                raise ServiceValidationError(f"texts[{idx}] must be a string")
            sanitized = self._sanitize_text(raw)
            sanitized_items.append(sanitized)
        if not sanitized_items:
            raise ServiceValidationError("texts must contain at least one entry")

        self._run_security_checks(sanitized_items)

        embeddings: list[list[float] | None] = [None] * len(sanitized_items)
        pending: list[tuple[int, str, tuple[str, bool]]] = []
        cached_hits = 0
        for idx, sanitized in enumerate(sanitized_items):
            key = (sanitized, bool(normalize))
            cached = self._from_cache(key)
            if cached is not None:
                vector, metadata = cached
                metadata = {**metadata, "cached": True, "source": "cache"}
                self._metrics["cache_hits"] += 1
                cached_hits += 1
                embeddings[idx] = list(vector)
            else:
                self._metrics["cache_misses"] += 1
                pending.append((idx, sanitized, key))

        generator = self.generator
        if pending:
            self._enforce_rate_limit()
            self._audit("embedding.batch", sanitized_items)
            try:
                payload = [item[1] for item in pending]
                computed = generator.generate_embeddings(payload, normalize=normalize)
            except TypeError:
                computed = generator.generate_embeddings([item[1] for item in pending])
            except Exception as exc:  # pragma: no cover - delegated failure
                raise ServiceError(f"batch embedding generation failed: {exc}") from exc

            for (idx, _sanitized, key), vector in zip(pending, computed, strict=True):
                metadata = self._build_metadata(generator, vector, cached=False)
                self._store_cache(key, vector, metadata)
                embeddings[idx] = list(vector)

        assert all(vec is not None for vec in embeddings)
        metadata = self._build_metadata(
            generator,
            embeddings[0] if embeddings else [],
            cached=cached_hits == len(embeddings),
            batch_count=len(embeddings),
            cached_hits=cached_hits,
        )
        return BatchEmbeddingServiceResult(
            embeddings=[list(vec) for vec in embeddings if vec is not None],
            cached_hits=cached_hits,
            metadata=metadata,
        )

    def get_model_info(self) -> dict[str, Any]:
        generator = self.generator
        try:
            info = generator.get_model_info()
            if isinstance(info, dict):
                return info
        except AttributeError:
            pass
        return {
            "model_name": getattr(generator, "model_name", "unknown"),
            "dimensions": getattr(generator, "dimensions", None),
            "backend": getattr(generator, "backend", None),
            "model_loaded": getattr(generator, "model_loaded", False),
        }

    def health_status(self) -> dict[str, Any]:
        generator = self.generator
        return {
            "status": "healthy",
            "backends_available": {
                "mlx": getattr(generator, "can_use_mlx", False),
                "sentence_transformers": getattr(
                    generator, "can_use_sentence_transformers", False
                ),
            },
            "rate_limit": self.rate_limit_per_minute,
            "cache_size": self.cache_size,
            "metrics": self.get_metrics(),
        }

    def get_metrics(self) -> dict[str, int]:
        return dict(self._metrics)

    # Internal helpers -----------------------------------------------------------

    def _sanitize_text(self, text: str) -> str:
        if not isinstance(text, str):
            raise ServiceValidationError("text must be a string")
        sanitized = text.strip()
        if not sanitized:
            raise ServiceValidationError("text must not be empty or whitespace")
        if len(sanitized) > self.max_chars:
            raise ServiceValidationError(
                f"text exceeds max length of {self.max_chars} characters",
                code="TEXT_TOO_LONG",
            )
        if any(ord(char) < 32 and char not in {"\n", "\r", "\t"} for char in sanitized):
            raise SecurityViolation("text contains control characters")
        return sanitized

    def _run_security_checks(self, texts: Sequence[str]) -> None:
        for text in texts:
            lower = text.lower()
            if any(token in lower for token in self._SECURITY_BLOCKLIST):
                raise SecurityViolation("text contains disallowed patterns")

    def _enforce_rate_limit(self) -> None:
        if not self.rate_limit_per_minute:
            return
        now = time.monotonic()
        window = self.rate_window_seconds
        with self._lock:
            while self._requests and now - self._requests[0] > window:
                self._requests.popleft()
            if len(self._requests) >= self.rate_limit_per_minute:
                self._metrics["rate_limited"] += 1
                raise RateLimitExceeded("rate limit exceeded")
            self._requests.append(now)

    def _from_cache(self, key: tuple[str, bool]) -> tuple[list[float], dict[str, Any]] | None:
        with self._lock:
            cached = self._cache.get(key)
            if cached is None:
                return None
            self._cache.move_to_end(key)
            vector, metadata = cached
            return list(vector), dict(metadata)

    def _store_cache(
        self, key: tuple[str, bool], embedding: Sequence[float], metadata: dict[str, Any]
    ) -> None:
        with self._lock:
            self._cache[key] = (list(embedding), dict(metadata))
            self._cache.move_to_end(key)
            while len(self._cache) > self.cache_size:
                self._cache.popitem(last=False)

    def _build_metadata(
        self,
        generator: Any,
        embedding: Sequence[float],
        *,
        cached: bool,
        batch_count: int | None = None,
        cached_hits: int | None = None,
    ) -> dict[str, Any]:
        generated_at = datetime.now(timezone.utc)
        info = {}
        try:
            info = generator.get_model_info() or {}
        except Exception:  # pragma: no cover - generator optional
            info = {}
        metadata = {
            "model_name": info.get("model_name") if isinstance(info, dict) else None,
            "dimensions": info.get("dimensions") if isinstance(info, dict) else len(embedding),
            "backend": info.get("backend") if isinstance(info, dict) else None,
            "generated_at": generated_at,
            "cached": cached,
            "source": "cache" if cached else "generator",
            "metrics": self.get_metrics(),
        }
        if batch_count is not None:
            metadata["count"] = batch_count
        if cached_hits is not None:
            metadata["cached_hits"] = cached_hits
            if batch_count is not None and 0 < cached_hits < batch_count:
                metadata["source"] = "mixed"
        return metadata

    def _audit(self, action: str, payload: Sequence[str] | str) -> None:
        if not self.audit_logger:
            return
        if isinstance(payload, str):
            items = [payload]
        else:
            items = list(payload)
        redacted = [self._redact_text(text) for text in items]
        self.audit_logger.debug(
            "cortex_py.audit", extra={"action": action, "sample": redacted[:3]}
        )

    @staticmethod
    def _redact_text(text: str) -> str:
        return text[:32] + ("…" if len(text) > 32 else "")


