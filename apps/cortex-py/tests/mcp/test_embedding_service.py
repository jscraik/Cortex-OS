from __future__ import annotations

import time
from dataclasses import dataclass

import pytest


@dataclass
class RecordingGenerator:
    """Simple generator that records calls and simulates metadata."""

    dimensions: int = 3
    model_name: str = "dummy-model"

    def __post_init__(self) -> None:
        self.single_calls: list[str] = []
        self.batch_calls: list[list[str]] = []

    def generate_embedding(self, text: str) -> list[float]:
        self.single_calls.append(text)
        return [float(len(self.single_calls))] * self.dimensions

    def generate_embeddings(self, texts: list[str], normalize: bool = True) -> list[list[float]]:
        self.batch_calls.append(texts)
        base = float(len(self.batch_calls))
        return [[base] * self.dimensions for _ in texts]

    def get_model_info(self) -> dict[str, object]:
        return {
            "model_name": self.model_name,
            "dimensions": self.dimensions,
            "backend": "test",
        }


@pytest.fixture
def service() -> "EmbeddingService":
    from cortex_py.services import EmbeddingService

    generator = RecordingGenerator()
    return EmbeddingService(
        generator=generator,
        max_chars=32,
        cache_size=8,
        rate_limit_per_minute=100,
        rate_window_seconds=1.0,
    )


def test_generate_single_uses_cache_and_sanitizes(service: "EmbeddingService") -> None:
    from cortex_py.services import EmbeddingServiceResult

    result = service.generate_single("  hello  ")
    assert isinstance(result, EmbeddingServiceResult)
    assert result.embedding == [1.0, 1.0, 1.0]
    assert result.cached is False
    assert result.metadata["model_name"] == "dummy-model"

    # Second call should hit cache and avoid new generator invocation
    second = service.generate_single("hello")
    assert second.cached is True
    assert second.embedding == result.embedding
    assert service.generator.single_calls == ["hello"]


def test_generate_batch_validates_entries(service: "EmbeddingService") -> None:
    result = service.generate_batch(["a", "b"], normalize=False)
    assert len(result.embeddings) == 2
    assert all(vec == [1.0, 1.0, 1.0] for vec in result.embeddings)
    assert result.cached_hits == 0

    # Invalid entry should trigger validation error
    from cortex_py.services import ServiceValidationError

    with pytest.raises(ServiceValidationError):
        service.generate_batch(["ok", "   "], normalize=True)

    from cortex_py.services import SecurityViolation

    with pytest.raises(SecurityViolation):
        service.generate_batch(["ok", "file://etc/passwd"], normalize=True)


def test_rate_limit_enforced() -> None:
    from cortex_py.services import EmbeddingService, RateLimitExceeded

    generator = RecordingGenerator()
    svc = EmbeddingService(
        generator, max_chars=32, cache_size=4, rate_limit_per_minute=1, rate_window_seconds=1.0
    )

    svc.generate_single("one")
    with pytest.raises(RateLimitExceeded):
        svc.generate_single("two")

    # Advance time beyond rate window to allow another request
    time.sleep(1.1)
    svc.generate_single("three")


def test_security_checks_block_dangerous_payload(service: "EmbeddingService") -> None:
    from cortex_py.services import SecurityViolation

    with pytest.raises(SecurityViolation):
        service.generate_single("<script>alert('xss')</script>")

    with pytest.raises(SecurityViolation):
        service.generate_single("../../etc/passwd")


