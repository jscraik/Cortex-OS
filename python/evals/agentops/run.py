#!/usr/bin/env python3
import os
import sys
from pathlib import Path

import yaml

from cortex_mlx.router import ModelRouter


def run_scenario(path: Path) -> dict:
    data = yaml.safe_load(path.read_text())
    router = ModelRouter()
    results = []
    for step in data.get("steps", []):
        if step.get("type") == "chat":
            out = router.chat(step.get("input", ""))
            results.append({"type": "chat", "ok": isinstance(out.get("text"), str)})
        else:
            results.append({"type": step.get("type"), "ok": False})
    failures = sum(1 for r in results if not r["ok"])
    return {"name": data.get("name"), "failures": failures, "results": results}


def main():
    api_key = os.getenv("AGENTOPS_API_KEY")
    if not api_key:
        print("[agentops] Skipping: AGENTOPS_API_KEY not set")
        return 0
    scenarios_dir = Path(__file__).parent / "scenarios"
    all_results = []
    for p in scenarios_dir.glob("*.yaml"):
        all_results.append(run_scenario(p))
    total_failures = sum(r["failures"] for r in all_results)
    print("[agentops] Results:", all_results)
    return 1 if total_failures else 0


if __name__ == "__main__":
    sys.exit(main())
