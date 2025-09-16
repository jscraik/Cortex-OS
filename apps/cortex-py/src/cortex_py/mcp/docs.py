from __future__ import annotations

from typing import Any

from .server import TOOL_CONTRACTS
from .tools import ERROR_DESCRIPTIONS, TOOL_SUMMARY


def _example_for(tool_name: str) -> Any:
    if tool_name == "embedding.generate":
        return {"text": "The quick brown fox", "normalize": True}
    if tool_name == "embedding.batch":
        return {"texts": ["alpha", "beta", "gamma"], "normalize": True}
    return {}


TOOL_DOCUMENTATION: dict[str, dict[str, Any]] = {}
for name, meta in TOOL_SUMMARY.items():
    TOOL_DOCUMENTATION[name] = {
        "description": meta["description"],
        "usage": {
            "example": _example_for(name),
            "input_schema": TOOL_CONTRACTS[name]["input"],
            "output_schema": TOOL_CONTRACTS[name]["output"],
        },
        "errors": meta.get("error_codes", ERROR_DESCRIPTIONS),
    }

