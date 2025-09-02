import asyncio
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum


class MessageType(Enum):
    REQUEST = "request"
    RESPONSE = "response"
    NOTIFICATION = "notification"
    ERROR = "error"


@dataclass
class MCPMessage:
    type: MessageType
    id: str
    method: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[Dict[str, Any]] = None
    jsonrpc: str = "2.0"

    def to_json(self) -> str:
        return json.dumps({
            "jsonrpc": self.jsonrpc,
            "id": self.id,
            "method": self.method,
            "params": self.params,
            "result": self.result,
            "error": self.error
        })

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
            jsonrpc=data.get("jsonrpc", "2.0")
        )




@dataclass
class Tool:
    name: str
    description: str
    parameters: Dict[str, Any]


class MCPProtocolHandler:
    def __init__(self):
        self.message_handlers = {}
        self.request_counter = 0

    def register_handler(self, method: str, handler):
        self.message_handlers[method] = handler

    async def handle_message(self, message: MCPMessage) -> MCPMessage:
        if message.type == MessageType.REQUEST:
            return await self._handle_request(message)
        elif message.type == MessageType.NOTIFICATION:
            return await self._handle_notification(message)
        else:
            return MCPMessage(
                type=MessageType.ERROR,
                id=message.id,
                error={"code": -32601, "message": "Method not found"}
            )

    async def _handle_request(self, message: MCPMessage) -> MCPMessage:
        handler = self.message_handlers.get(message.method)
        if not handler:
            return MCPMessage(
                type=MessageType.ERROR,
                id=message.id,
                error={"code": -32601, "message": "Method not found"}
            )

        try:
            result = await handler(message.params)
            return MCPMessage(
                type=MessageType.RESPONSE,
                id=message.id,
                result=result
            )
        except Exception as e:  # noqa: BLE001
            return MCPMessage(
                type=MessageType.ERROR,
                id=message.id,
                error={
                    "code": -32603,
                    "message": str(e),
                    "data": {"exception": str(type(e))}
                }
            )

    async def _handle_notification(self, message: MCPMessage) -> None:
        handler = self.message_handlers.get(message.method)
        if handler:
            await handler(message.params)

    def create_request(self, method: str, params: Optional[Dict[str, Any]] = None) -> MCPMessage:
        self.request_counter += 1
        return MCPMessage(
            type=MessageType.REQUEST,
            id=str(self.request_counter),
            method=method,
            params=params or {}
        )
