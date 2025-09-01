import argparse
import json
import re
from pathlib import Path

import jsonschema  # type: ignore

from cortex_mlx.router import ModelRouter


def load_suite(name: str):
    root = Path(__file__).parent
    path = root / "traces" / "v1" / f"{name}.json"
    with path.open() as f:
        suite = json.load(f)
    schema_path = root / "schema.json"
    with schema_path.open() as f:
        schema = json.load(f)
    jsonschema.validate(instance=suite, schema=schema)
    return suite


def match_expected(text: str, expected: dict) -> bool:
    if "contains" in expected:
        return expected["contains"].lower() in text.lower()
    if "regex" in expected:
        return re.search(expected["regex"], text) is not None
    return False


def run_suite(name: str):
    router = ModelRouter()
    suite = load_suite(name)
    results = []
    failures = 0
    for case in suite:
        if name == "chat" and "input" in case:
            out = router.chat(case["input"])
            ok = match_expected(out.get("text", ""), case["expected"])
            result = {
                "name": case["name"],
                "adapter": out.get("adapter"),
                "ok": ok,
                "snippet": out.get("text", "")[:160],
            }
        elif name == "rerank" and "query" in case:
            out = router.rerank(case["query"], case["docs"])
            order = out.get("order", [])
            is_perm = sorted(order) == list(range(len(case["docs"])))
            ok = case["expected"].get("isPermutation") is True and is_perm
            result = {"name": case["name"], "adapter": out.get("adapter"), "ok": ok, "order": order}
        else:
            ok = False
            result = {"name": case.get("name", "?"), "ok": False, "error": "Unknown case type"}
        results.append(result)
        if not ok:
            failures += 1
            print(f"[golden:{name}] FAIL {result['name']} -> {result}")
    print(f"[golden:{name}] completed with {failures} failures")
    return failures, results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--suite", default="chat", help="suite name under traces/v1 (chat|rerank)")
    ap.add_argument("--out", default=None, help="write JSON results to this file")
    args = ap.parse_args()
    failures, results = run_suite(args.suite)
    if args.out:
        out_path = Path(args.out)
        out_path.write_text(
            json.dumps({"suite": args.suite, "failures": failures, "results": results}, indent=2)
        )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
