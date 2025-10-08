"""CLI entrypoint invoked by the TypeScript bridge via `uv run --project`.

The script reads a JSON payload from stdin, performs a small subset of the
operations required for upgrade readiness, and prints a JSON response. It uses
:mod:`cortex_py.rag.llama_index_bridge` for the heavy lifting so the behaviour is
consistent with the in-process helpers.
"""

from __future__ import annotations

import asyncio
import json
import sys
from typing import Any, Dict

from .llama_index_bridge import build_settings, run_workflow


async def _dispatch(payload: Dict[str, Any]) -> Dict[str, Any]:
    operation = payload.get("operation", "settings")
    if operation == "settings":
        settings = build_settings(payload.get("config", {}))
        return {"status": "ok", "settings": settings, "runtime": "llama-index-bridge"}
    if operation == "workflow":
        workflow = payload.get("workflow")
        if not callable(workflow):
            return {
                "status": "error",
                "message": "workflow callable missing",
            }

        return await run_workflow(workflow)

    return {
        "status": "error",
        "message": f"Unsupported operation: {operation}",
    }


def main() -> None:
    raw = sys.stdin.read() or "{}"
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive branch
        print(json.dumps({"status": "error", "message": f"invalid json: {exc}"}))
        return

    result = asyncio.run(_dispatch(payload))
    print(json.dumps(result))


if __name__ == "__main__":  # pragma: no cover - smoke tested via TS bridge
    main()
