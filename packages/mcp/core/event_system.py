"""Event system for the MCP ecosystem."""

from collections.abc import Callable


class EventSystem:
    """Simple event system placeholder."""

    def __init__(self) -> None:
        self._listeners: dict[str, list[Callable]] = {}

    def on(self, event: str, handler: Callable) -> None:
        self._listeners.setdefault(event, []).append(handler)

    async def emit(self, event: str, *args, **kwargs) -> None:
        for handler in self._listeners.get(event, []):
            await handler(*args, **kwargs)
