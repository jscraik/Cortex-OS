"""Metadata describing the task lifecycle connector tool."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class ToolDefinition:
	"""Immutable description of an Apps connector tool."""

	name: str
	description: str
	scopes: Sequence[str]


TASK_LIFECYCLE_TOOL = ToolDefinition(
	name="tasks.lifecycle",
	description="Interact with Cortex-OS task lifecycle APIs (create, update, resolve).",
	scopes=("tasks.read", "tasks.write"),
)


def build_tasks_tool() -> ToolDefinition:
	"""Return the definition for the task lifecycle tool."""

	return TASK_LIFECYCLE_TOOL
