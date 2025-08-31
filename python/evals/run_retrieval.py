#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import List, Tuple

from cortex_mlx.router import ModelRouter


def load_corpus(path: Path) -> List[Tuple[str, str]]:
    docs: List[Tuple[str, str]] = []
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            docs.append((obj["id"], obj["text"]))
    return docs


def cosine(a: list[float], b: list[float]) -> float:
    import math

    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    denom = (na * nb) or 1e-9
    return dot / denom


def retrieve(router: ModelRouter, query: str, docs: List[Tuple[str, str]], top_k: int) -> List[str]:
    q = router.embed(query)["embedding"]
    scored: List[Tuple[str, float]] = []
    for doc_id, text in docs:
        e = router.embed(text)["embedding"]
        scored.append((doc_id, cosine(q, e)))
    scored.sort(key=lambda x: x[1], reverse=True)
    return [doc_id for doc_id, _ in scored[:top_k]]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--suite', default='rag', help='suite name under traces/v1 (default: rag)')
    ap.add_argument('--out', default=None, help='write JSON results to this file')
    args = ap.parse_args()

    router = ModelRouter()
    suite_path = Path(__file__).with_name('traces').joinpath('v1', f'{args.suite}.json')
    suite = json.loads(Path(suite_path).read_text())
    results = []
    failures = 0
    for case in suite:
        corpus_path = Path(__file__).with_name(case['corpus'])
        corpus = load_corpus(corpus_path)
        top_k = int(case.get('topK', 1))
        predicted = retrieve(router, case['query'], corpus, top_k)
        ok = predicted and predicted[0] == case['expectedTopId']
        if not ok:
            failures += 1
        results.append({ 'name': case['name'], 'ok': ok, 'predicted': predicted, 'expectedTopId': case['expectedTopId'] })

    if args.out:
        Path(args.out).write_text(json.dumps({ 'suite': 'rag', 'failures': failures, 'results': results }, indent=2))
    print(f'[retrieval] completed with {failures} failures')
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
