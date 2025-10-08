"""Utilities that prepare Cortex-Py for the llama-index 0.14 API surface.

The helpers in this module are intentionally lightweight so they can be executed
inside tests without requiring the full llama-index dependency graph. They
mirror the behaviour we expect once the Settings refactor lands in 0.14 while
keeping a legacy path for the 0.12 line that is currently pinned.
"""

from __future__ import annotations

import asyncio
from typing import Any, Awaitable, Callable, Dict

try:  # pragma: no cover - exercised via tests when monkeypatched
    from llama_index.core import Settings  # type: ignore
except Exception:  # pragma: no cover - legacy fallback path for 0.12
    Settings = None

Workflow = Callable[..., Awaitable[Any]]


def build_settings(config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize configuration for llama-index across 0.12 and 0.14 APIs."""

    provider = config.get("provider", "openai")
    llm = config.get("llm")
    embed_model = config.get("embed_model")
    callback_manager = config.get("callback_manager")

    if Settings is not None:
        if llm is not None:
            setattr(Settings, "llm", llm)
        if embed_model is not None:
            setattr(Settings, "embed_model", embed_model)
        if callback_manager is not None:
            setattr(Settings, "callback_manager", callback_manager)
        return {
            "mode": "settings",
            "provider": provider,
            "llm": getattr(Settings, "llm", None),
            "embed_model": getattr(Settings, "embed_model", None),
        }

    legacy_config = {
        "llm": llm,
        "embed_model": embed_model,
        "callback_manager": callback_manager,
        "provider": provider,
    }
    return {"mode": "legacy", "config": legacy_config}


async def run_workflow(workflow: Workflow, *args: Any, **kwargs: Any) -> Dict[str, Any]:
    """Execute a workflow and translate cancellation into branded metadata."""

    try:
        result = await workflow(*args, **kwargs)
        return {"status": "completed", "result": result}
    except asyncio.CancelledError as exc:
        return {
            "status": "cancelled",
            "reason": f"brAInwav workflow cancelled: {exc}",
        }


__all__ = ["build_settings", "run_workflow"]
