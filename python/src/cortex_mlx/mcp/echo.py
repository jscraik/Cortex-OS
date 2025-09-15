"""Reference implementation of a simple MCP echo tool."""

from __future__ import annotations

from typing import Mapping

from pydantic import BaseModel, Field

from .base import BaseMCPTool, ToolResponse

__all__ = ["EchoInput", "EchoTool"]


class EchoInput(BaseModel):
    """Input payload accepted by :class:`EchoTool`."""

    message: str = Field(..., description="Text that will be echoed back to the caller.")
    uppercase: bool = Field(
        default=False,
        description="Return the echoed message in uppercase when set to true.",
    )
    repeat: int = Field(
        default=1,
        ge=1,
        le=5,
        description="Number of times to repeat the echoed message (max 5).",
    )


class EchoTool(BaseMCPTool[EchoInput]):
    """Echo the provided message, optionally uppercasing and repeating it."""

    name = "echo"
    description = (
        "Echo the provided message with optional uppercase transformation and repetition. "
        "This tool is intended as a reference implementation for building MCP tools using"
        " Cortex-OS primitives."
    )
    InputModel = EchoInput

    def metadata(self) -> Mapping[str, object]:
        return {"category": "examples", "version": "1.0.0"}

    async def run(self, data: EchoInput) -> ToolResponse:
        """Return the echoed message using :class:`ToolResponse`."""

        text = data.message.upper() if data.uppercase else data.message
        rendered = "\n".join(text for _ in range(data.repeat))
        return ToolResponse(
            content=[{"type": "text", "text": rendered}],
            metadata={"repeat": data.repeat, "uppercase": data.uppercase},
        )
