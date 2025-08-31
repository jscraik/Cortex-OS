#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

from cortex_mlx.router import ModelRouter


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--suite', default='embeddings', help='suite name under traces/v1 (default: embeddings)')
    ap.add_argument('--out', default=None, help='write JSON results to this file')
    args = ap.parse_args()

    router = ModelRouter()
    suite_path = Path(__file__).with_name('traces').joinpath('v1', f'{args.suite}.json')
    suite = json.loads(Path(suite_path).read_text())
    results = []
    failures = 0
    for case in suite:
        text = case['text']
        a = router.embed(text)["embedding"]
        b = router.embed(text)["embedding"]
        ok = isinstance(a, list) and len(a) > 0 and a == b
        if not ok:
            failures += 1
        results.append({ 'name': case['name'], 'ok': ok, 'len': len(a) })

    if args.out:
        Path(args.out).write_text(json.dumps({ 'suite': 'embeddings', 'failures': failures, 'results': results }, indent=2))
    print(f'[embeddings] completed with {failures} failures')
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
