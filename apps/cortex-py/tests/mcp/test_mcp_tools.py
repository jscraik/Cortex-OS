from __future__ import annotations

import asyncio
from dataclasses import dataclass

import pytest


@dataclass
class CountingGenerator:
    dimensions: int = 3
    model_name: str = "dummy-model"

    def __post_init__(self) -> None:
        self.single_calls = 0
        self.batch_calls = 0

    def generate_embedding(self, text: str) -> list[float]:
        self.single_calls += 1
        return [float(self.single_calls)] * self.dimensions

    def generate_embeddings(self, texts: list[str], normalize: bool = True) -> list[list[float]]:
        self.batch_calls += 1
        base = float(self.batch_calls)
        return [[base] * self.dimensions for _ in texts]

    def get_model_info(self) -> dict[str, object]:
        return {
            "model_name": self.model_name,
            "dimensions": self.dimensions,
            "backend": "test",
            "sentence_transformers_available": False,
        }


@pytest.fixture
def tools() -> "CortexPyMCPTools":
    from cortex_py.services import EmbeddingService
    from cortex_py.mcp.tools import CortexPyMCPTools

    generator = CountingGenerator()
    service = EmbeddingService(
        generator=generator,
        max_chars=64,
        cache_size=16,
        rate_limit_per_minute=50,
        rate_window_seconds=1.0,
    )
    return CortexPyMCPTools(service)


def _run(coro):
    return asyncio.run(coro)


def test_embedding_tool_returns_metadata(tools: "CortexPyMCPTools") -> None:
    from cortex_py.mcp.models import EmbeddingToolResponse

    response = _run(tools.embedding_generate(text="hello"))
    assert isinstance(response, EmbeddingToolResponse)
    assert response.embedding == [1.0, 1.0, 1.0]
    assert response.metadata.cached is False
    assert response.metadata.model_name == "dummy-model"

    cached = _run(tools.embedding_generate(text="hello"))
    assert cached.metadata.cached is True


def test_batch_tool_handles_multiple_inputs(tools: "CortexPyMCPTools") -> None:
    from cortex_py.mcp.models import BatchEmbeddingToolResponse

    response = _run(tools.embedding_batch(texts=["one", "two"], normalize=False))
    assert isinstance(response, BatchEmbeddingToolResponse)
    assert response.metadata.count == 2
    assert response.metadata.cached_hits == 0
    assert response.embeddings[0] == [1.0, 1.0, 1.0]


def test_tool_validation_errors_reported(tools: "CortexPyMCPTools") -> None:
    from cortex_py.mcp.models import ToolErrorResponse

    error = _run(tools.embedding_generate(text=""))
    assert isinstance(error, ToolErrorResponse)
    assert error.code == "VALIDATION_ERROR"
    assert "invalid payload" in error.message.lower() or "empty" in error.message.lower()

    error = _run(tools.embedding_batch(texts=["ok", "  "], normalize=True))
    assert error.code == "VALIDATION_ERROR"


def test_rate_limit_error_exposed() -> None:
    from cortex_py.mcp.models import ToolErrorResponse
    from cortex_py.mcp.tools import CortexPyMCPTools
    from cortex_py.services import EmbeddingService

    service = EmbeddingService(
        generator=CountingGenerator(),
        max_chars=32,
        cache_size=4,
        rate_limit_per_minute=1,
        rate_window_seconds=1.0,
    )
    tools = CortexPyMCPTools(service)

    _run(tools.embedding_generate(text="one"))
    error = _run(tools.embedding_generate(text="two"))
    assert isinstance(error, ToolErrorResponse)
    assert error.code == "RATE_LIMITED"


def test_create_mcp_server_registers_tools() -> None:
    from fastmcp import FastMCP

    from cortex_py.mcp.server import TOOL_CONTRACTS, create_mcp_server
    from cortex_py.services import EmbeddingService

    service = EmbeddingService(
        generator=CountingGenerator(),
        max_chars=64,
        cache_size=8,
        rate_limit_per_minute=20,
    )

    server = create_mcp_server(service=service)
    assert isinstance(server, FastMCP)
    assert "embedding.generate" in TOOL_CONTRACTS
    assert TOOL_CONTRACTS["embedding.generate"]["input"]["title"] == "EmbeddingToolInput"
    assert "error" in TOOL_CONTRACTS["embedding.generate"]


def test_tool_documentation_contains_examples() -> None:
    from cortex_py.mcp.docs import TOOL_DOCUMENTATION

    assert "embedding.generate" in TOOL_DOCUMENTATION
    doc = TOOL_DOCUMENTATION["embedding.generate"]
    assert "usage" in doc
    assert "errors" in doc
    assert "example" in doc["usage"]


