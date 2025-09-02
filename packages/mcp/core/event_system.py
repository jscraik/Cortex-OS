"""Event system for the MCP ecosystem."""

from typing import Callable, Dict, List


class EventSystem:
    """Simple event system placeholder."""

    def __init__(self) -> None:
        self._listeners: Dict[str, List[Callable]] = {}

    def on(self, event: str, handler: Callable) -> None:
        self._listeners.setdefault(event, []).append(handler)

    async def emit(self, event: str, *args, **kwargs) -> None:
        for handler in self._listeners.get(event, []):
            await handler(*args, **kwargs)
