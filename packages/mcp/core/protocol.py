import json
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from enum import Enum
from typing import Any


class MessageType(Enum):
    REQUEST = "request"
    RESPONSE = "response"
    NOTIFICATION = "notification"
    ERROR = "error"


METHOD_NOT_FOUND_MSG = "Method not found"


@dataclass
class MCPMessage:
    type: MessageType
    id: str
    method: str | None = None
    params: dict[str, Any] | None = None
    result: dict[str, Any] | None = None
    error: dict[str, Any] | None = None
    jsonrpc: str = "2.0"

    def to_json(self) -> str:
        # Build payload and omit fields that are None to keep JSON compact
        payload: dict[str, Any] = {
            "jsonrpc": self.jsonrpc,
            "id": self.id,
        }
        if self.method is not None:
            payload["method"] = self.method
        if self.params is not None:
            payload["params"] = self.params
        if self.result is not None:
            payload["result"] = self.result
        if self.error is not None:
            payload["error"] = self.error

        return json.dumps(payload)

    @classmethod
    def from_json(cls, json_str: str) -> "MCPMessage":
        data = json.loads(json_str)
        return cls(
            type=MessageType(data.get("type", "request")),
            id=data.get("id"),
            method=data.get("method"),
            params=data.get("params"),
            result=data.get("result"),
            error=data.get("error"),
            jsonrpc=data.get("jsonrpc", "2.0"),
        )


@dataclass
class Tool:
    name: str
    description: str
    parameters: dict[str, Any]


class MCPProtocolHandler:
    def __init__(self) -> None:
        # Handlers are async callables taking optional params dict and returning any JSON-serializable result
        self.message_handlers: dict[
            str, Callable[[dict[str, Any] | None], Awaitable[Any]]
        ] = {}
        self.request_counter: int = 0

    def register_handler(
        self, method: str, handler: Callable[[dict[str, Any] | None], Awaitable[Any]]
    ) -> None:
        self.message_handlers[method] = handler

    async def handle_message(self, message: MCPMessage) -> MCPMessage | None:
        if message.type == MessageType.REQUEST:
            return await self._handle_request(message)
        elif message.type == MessageType.NOTIFICATION:
            await self._handle_notification(message)
            return None
        else:
            return MCPMessage(
                type=MessageType.ERROR,
                id=message.id,
                error={"code": -32601, "message": METHOD_NOT_FOUND_MSG},
            )

    async def _handle_request(self, message: MCPMessage) -> MCPMessage:
        # Ensure method is provided and a handler exists
        if message.method is None:
            return MCPMessage(
                type=MessageType.ERROR,
                id=message.id,
                error={"code": -32601, "message": METHOD_NOT_FOUND_MSG},
            )

        handler = self.message_handlers.get(message.method)
        if handler is None:
            return MCPMessage(
                type=MessageType.ERROR,
                id=message.id,
                error={"code": -32601, "message": METHOD_NOT_FOUND_MSG},
            )

        try:
            result = await handler(message.params)
            return MCPMessage(type=MessageType.RESPONSE, id=message.id, result=result)
        except Exception as e:  # noqa: BLE001
            return MCPMessage(
                type=MessageType.ERROR,
                id=message.id,
                error={
                    "code": -32603,
                    "message": str(e),
                    "data": {"exception": str(type(e))},
                },
            )

    async def _handle_notification(self, message: MCPMessage) -> None:
        if message.method is None:
            return
        handler = self.message_handlers.get(message.method)
        if handler is not None:
            await handler(message.params)

    def create_request(
        self, method: str, params: dict[str, Any] | None = None
    ) -> MCPMessage:
        self.request_counter += 1
        return MCPMessage(
            type=MessageType.REQUEST,
            id=str(self.request_counter),
            method=method,
            params=params or {},
        )
