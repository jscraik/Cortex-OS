"""Unit tests for the Python MCP tool base classes."""

from __future__ import annotations

import pytest
from pydantic import BaseModel

from cortex_mlx.mcp import (
    BaseMCPTool,
    MCPToolExecutionError,
    MCPToolValidationError,
    ToolRegistry,
    ToolResponse,
)


class ExampleInput(BaseModel):
    """Input payload for the example tool used in unit tests."""

    message: str


class ExampleTool(BaseMCPTool[ExampleInput]):
    """Simple tool that uppercases the provided message."""

    name = "example"
    description = "Uppercase the provided message."
    InputModel = ExampleInput

    async def run(self, data: ExampleInput) -> ToolResponse:
        return ToolResponse(
            content=[{"type": "text", "text": data.message.upper()}],
            metadata={"length": len(data.message)},
        )


class FailingTool(ExampleTool):
    """Tool subclass that raises an exception to test error handling."""

    name = "failing"

    async def run(self, data: ExampleInput) -> ToolResponse:  # type: ignore[override]
        raise RuntimeError("boom")


def test_validate_input_returns_model_instance() -> None:
    tool = ExampleTool()
    parsed = tool.validate_input({"message": "hello"})
    assert isinstance(parsed, ExampleInput)
    assert parsed.message == "hello"


def test_validate_input_raises_domain_error() -> None:
    tool = ExampleTool()
    with pytest.raises(MCPToolValidationError) as exc:
        tool.validate_input({})
    assert "message" in str(exc.value)


@pytest.mark.asyncio
async def test_execute_wraps_runtime_errors() -> None:
    tool = FailingTool()
    with pytest.raises(MCPToolExecutionError) as exc:
        await tool.execute({"message": "whatever"})
    assert "failing" in str(exc.value)


def test_tool_definition_exposes_schema() -> None:
    tool = ExampleTool()
    definition = tool.definition()
    assert definition["name"] == "example"
    assert "properties" in definition["input_schema"]
    assert definition["input_schema"]["properties"]["message"]["type"] == "string"


@pytest.mark.asyncio
async def test_registry_executes_registered_tool() -> None:
    registry = ToolRegistry()
    registry.register(ExampleTool())
    result = await registry.call_tool("example", {"message": "hey"})
    assert result["content"][0]["text"] == "HEY"
    assert result["metadata"]["length"] == 3


def test_registry_rejects_duplicate_names() -> None:
    registry = ToolRegistry()
    registry.register(ExampleTool())
    with pytest.raises(ValueError):
        registry.register(ExampleTool())


def test_registry_lists_tool_definitions() -> None:
    registry = ToolRegistry()
    registry.register(ExampleTool())
    tools = registry.list_definitions()
    assert tools[0]["name"] == "example"
    assert tools[0]["input_schema"]["title"] == "ExampleInput"
