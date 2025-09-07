"""JSON Schema validation helpers for MCP messages."""

from __future__ import annotations

from typing import Any

from jsonschema import validate

MCP_MESSAGE_SCHEMA: dict[str, Any] = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
        "jsonrpc": {"type": "string", "const": "2.0"},
        "id": {"type": "string"},
        "method": {"type": "string"},
        "params": {"type": "object"},
        "result": {"type": "object"},
        "error": {"type": "object"},
        "type": {
            "type": "string",
            "enum": ["request", "response", "notification", "error"],
        },
    },
    "required": ["type", "jsonrpc"],
    "allOf": [
        {
            "if": {
                "properties": {
                    "type": {
                        "enum": ["request", "response"]
                    }
                }
            },
            "then": {
                "required": ["id"]
            }
        }
    ],
    "additionalProperties": True,
}


def validate_mcp_message(data: dict[str, Any]) -> None:
    """Validate MCP message against JSON Schema."""
    validate(instance=data, schema=MCP_MESSAGE_SCHEMA)
