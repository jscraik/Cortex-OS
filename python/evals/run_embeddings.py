#!/usr/bin/env python3
"""Simple embedding regression suite with logging and parallelization."""
from __future__ import annotations

import argparse
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from cortex_mlx.router import ModelRouter

logger = logging.getLogger(__name__)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--suite", default="embeddings", help="suite name under traces/v1 (default: embeddings)"
    )
    ap.add_argument("--out", default=None, help="write JSON results to this file")
    args = ap.parse_args()

    router = ModelRouter()
    suite_path = Path(__file__).with_name("traces").joinpath("v1", f"{args.suite}.json")
    suite = json.loads(Path(suite_path).read_text())

    def run(case: dict) -> dict:
        text = case["text"]
        try:
            a = router.embed(text)["embedding"]
            b = router.embed(text)["embedding"]
            ok = isinstance(a, list) and len(a) > 0 and a == b
            return {"name": case["name"], "ok": ok, "len": len(a)}
        except Exception as e:  # pragma: no cover - diagnostics only
            logger.error("embed failed for %s: %s", case["name"], e)
            return {"name": case["name"], "ok": False, "len": 0, "error": str(e)}

    with ThreadPoolExecutor() as ex:
        results = list(ex.map(run, suite))

    failures = sum(1 for r in results if not r["ok"])

    if args.out:
        Path(args.out).write_text(
            json.dumps({"suite": "embeddings", "failures": failures, "results": results}, indent=2)
        )
    print(f"[embeddings] completed with {failures} failures")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
