"""Tests for tool capability discovery and allowlist enforcement."""

import pytest

from mcp.tasks.task_queue import TaskQueue, TaskRegistry, tool_execution_task


class TestTaskRegistryAllowlist:
    """Validate capability queries honor the allowlist."""

    def test_list_functions_respects_allowlist(self):
        """Only allowlisted tools should be discoverable."""
        registry = TaskRegistry(allowed_tools=["allowed"])

        async def allowed_tool() -> str:  # pragma: no cover - simple stub
            return "allowed"

        async def forbidden_tool() -> str:  # pragma: no cover - simple stub
            return "forbidden"

        registry.register("allowed", allowed_tool)
        registry.register("forbidden", forbidden_tool)

        assert registry.list_functions() == ["allowed"]
        assert registry.get("allowed") is allowed_tool
        with pytest.raises(PermissionError):
            registry.get("forbidden")


@pytest.mark.asyncio
async def test_tool_execution_enforces_allowlist():
    """Tool execution should fail for non-allowlisted tools."""
    queue = TaskQueue(allowed_tools=["allowed"], enable_celery=False)

    async def allowed_tool() -> str:
        return "ok"

    async def forbidden_tool() -> str:
        return "no"

    queue.registry.register("allowed", allowed_tool)
    queue.registry.register("forbidden", forbidden_tool)

    result = await tool_execution_task(queue, "allowed", {})
    assert result["result"] == "ok"

    with pytest.raises(PermissionError):
        await tool_execution_task(queue, "forbidden", {})
