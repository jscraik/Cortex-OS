from __future__ import annotations

import logging
import os
from typing import Any

from fastmcp import FastMCP

from cortex_py.generator import build_embedding_generator
from cortex_py.services import EmbeddingService

from .models import (
    BatchEmbeddingToolInput,
    BatchEmbeddingToolResponse,
    EmbeddingToolInput,
    EmbeddingToolResponse,
    HealthStatusResponse,
    ModelInfoResponse,
    ToolErrorResponse,
)
from .tools import CortexPyMCPTools, TOOL_SUMMARY

LOGGER = logging.getLogger(__name__)

SERVER_INSTRUCTIONS = """\
The cortex-py MCP server exposes high quality text embedding tools along with
model diagnostics and health information. Use `embedding.generate` for single
texts, `embedding.batch` for multi-text workloads, `model.info` to inspect the
active backend, and `health.status` for cache/rate limit state.
"""

TOOL_CONTRACTS: dict[str, dict[str, Any]] = {
    "embedding.generate": {
        "description": TOOL_SUMMARY["embedding.generate"]["description"],
        "input": EmbeddingToolInput.model_json_schema(),
        "output": EmbeddingToolResponse.model_json_schema(),
        "error": ToolErrorResponse.model_json_schema(),
    },
    "embedding.batch": {
        "description": TOOL_SUMMARY["embedding.batch"]["description"],
        "input": BatchEmbeddingToolInput.model_json_schema(),
        "output": BatchEmbeddingToolResponse.model_json_schema(),
        "error": ToolErrorResponse.model_json_schema(),
    },
    "model.info": {
        "description": TOOL_SUMMARY["model.info"]["description"],
        "input": {"type": "object", "properties": {}, "title": "ModelInfoRequest"},
        "output": ModelInfoResponse.model_json_schema(),
        "error": ToolErrorResponse.model_json_schema(),
    },
    "health.status": {
        "description": TOOL_SUMMARY["health.status"]["description"],
        "input": {"type": "object", "properties": {}, "title": "HealthStatusRequest"},
        "output": HealthStatusResponse.model_json_schema(),
        "error": ToolErrorResponse.model_json_schema(),
    },
}


def create_mcp_server(
    *,
    service: EmbeddingService | None = None,
    generator: Any | None = None,
    max_chars: int | None = None,
    cache_size: int | None = None,
    rate_limit_per_minute: int | None = None,
) -> FastMCP:
    """Create and configure the cortex-py FastMCP server."""

    if service is None:
        resolved_generator = build_embedding_generator(generator=generator)
        service = EmbeddingService(
            resolved_generator,
            generator_provider=lambda: resolved_generator,
            max_chars=max_chars or int(os.getenv("EMBED_MAX_CHARS", "8192")),
            cache_size=cache_size or int(os.getenv("EMBED_CACHE_SIZE", "256")),
            rate_limit_per_minute=rate_limit_per_minute or int(
                os.getenv("EMBED_RATE_LIMIT_PER_MINUTE", "120")
            ),
        )

    tools = CortexPyMCPTools(service)
    mcp = FastMCP(name="cortex-py", instructions=SERVER_INSTRUCTIONS)

    @mcp.tool(name="embedding.generate", description=TOOL_CONTRACTS["embedding.generate"]["description"])
    async def embedding_generate(text: str, normalize: bool = True) -> dict[str, Any]:
        result = await tools.embedding_generate(text=text, normalize=normalize)
        return result.model_dump()

    @mcp.tool(name="embedding.batch", description=TOOL_CONTRACTS["embedding.batch"]["description"])
    async def embedding_batch(texts: list[str], normalize: bool = True) -> dict[str, Any]:
        result = await tools.embedding_batch(texts=texts, normalize=normalize)
        return result.model_dump()

    @mcp.tool(name="model.info", description=TOOL_CONTRACTS["model.info"]["description"])
    async def model_info() -> dict[str, Any]:
        result = await tools.model_info()
        return result.model_dump()

    @mcp.tool(name="health.status", description=TOOL_CONTRACTS["health.status"]["description"])
    async def health_status() -> dict[str, Any]:
        result = await tools.health()
        return result.model_dump()

    LOGGER.info("cortex-py MCP server initialised with tools: %s", list(TOOL_CONTRACTS))
    return mcp


__all__ = ["create_mcp_server", "TOOL_CONTRACTS", "SERVER_INSTRUCTIONS"]


