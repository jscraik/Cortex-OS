"""
brAInwav Cortex-OS: OpenAI Agents Python adapter (thin wrapper)
Functions <= 40 lines, explicit errors include brAInwav branding.
"""
from typing import Any, Dict, List, Protocol


class _ClientLike(Protocol):
    async def chat(self, *, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
        ...


class OpenAIAgentsPyAdapter:
    def __init__(self, client: _ClientLike) -> None:
        self._client = client

    async def chat(self, *, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
        try:
            return await self._client.chat(messages=messages, tools=tools)
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(
                f"brAInwav Cortex-OS: OpenAI Agents Python adapter error: {exc}") from exc
