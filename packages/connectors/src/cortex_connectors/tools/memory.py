"""Metadata describing the memory hybrid search connector tool."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class ToolDefinition:
	"""Immutable description of an Apps connector tool."""

	name: str
	description: str
	scopes: Sequence[str]


MEMORY_HYBRID_TOOL = ToolDefinition(
	name="memory.hybrid_search",
	description="Perform hybrid semantic + keyword retrieval against Cortex-OS memory stores.",
	scopes=("memory.read", "memory.search"),
)


def build_memory_tool() -> ToolDefinition:
	"""Return the definition for the memory hybrid search tool."""

	return MEMORY_HYBRID_TOOL
