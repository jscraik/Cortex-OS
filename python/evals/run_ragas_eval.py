"""Compute retrieval QA heuristics and enforce thresholds."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Iterable

SUMMARY_PATH = Path("reports/evals/summary.md")


def parse_args() -> argparse.Namespace:
        parser = argparse.ArgumentParser(description="Run RAG evaluation heuristics")
        parser.add_argument("--dataset", required=True, help="Path to JSONL dataset")
        parser.add_argument("--out", required=True, help="Output JSON summary path")
        parser.add_argument("--faithfulness-threshold", type=float, default=0.85)
        parser.add_argument("--answer-relevancy-threshold", type=float, default=0.8)
        parser.add_argument("--context-precision-threshold", type=float, default=0.7)
        return parser.parse_args()


def load_records(path: Path) -> list[dict[str, Any]]:
        records: list[dict[str, Any]] = []
        for line in path.read_text(encoding="utf-8").splitlines():
                if not line.strip():
                        continue
                records.append(json.loads(line))
        return records


def keyword_hits(text: str) -> set[str]:
        cleaned: set[str] = set()
        for raw in text.split():
                token = raw.strip('.,:;!?()[]"\'').lower()
                if len(token) > 3:
                        cleaned.add(token)
        return cleaned


def ratio(count: int, total: int) -> float:
        if total == 0:
                return 0.0
        return count / total


def compute_metrics(records: Iterable[dict[str, Any]]) -> dict[str, float]:
        rows = list(records)
        total = len(rows)
        if total == 0:
                return {"faithfulness": 0.0, "answer_relevancy": 0.0, "context_precision": 0.0}
        faithful = 0
        relevant = 0
        precise = 0
        for row in rows:
                contexts = " ".join(row.get("contexts", []))
                answer = row.get("answer_ref", "")
                question = row.get("question", "")
                context_tokens = keyword_hits(contexts)
                answer_tokens = keyword_hits(answer)
                question_tokens = keyword_hits(question)
                if context_tokens & answer_tokens:
                        faithful += 1
                if answer_tokens & question_tokens:
                        relevant += 1
                if row.get("contexts"):
                        precise += 1
        return {
                "faithfulness": ratio(faithful, total),
                "answer_relevancy": ratio(relevant, total),
                "context_precision": ratio(precise, total),
        }


def ensure_summary_header(path: Path) -> None:
        if path.exists():
                return
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("# Evaluation Summary\n\n| Suite | Status | Details |\n| --- | --- | --- |\n", encoding="utf-8")


def append_summary_line(suite: str, status: str, details: str) -> None:
        ensure_summary_header(SUMMARY_PATH)
        with SUMMARY_PATH.open("a", encoding="utf-8") as handle:
                handle.write(f"| {suite} | {status} | {details} |\n")


def main() -> int:
        args = parse_args()
        dataset_path = Path(args.dataset)
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)

        records = load_records(dataset_path)
        metrics = compute_metrics(records)
        out_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

        failures = []
        if metrics["faithfulness"] < args.faithfulness_threshold:
                failures.append(f"faithfulness<{args.faithfulness_threshold}")
        if metrics["answer_relevancy"] < args.answer_relevancy_threshold:
                failures.append(f"answer_relevancy<{args.answer_relevancy_threshold}")
        if metrics["context_precision"] < args.context_precision_threshold:
                failures.append(f"context_precision<{args.context_precision_threshold}")

        status = "PASS" if not failures else "FAIL"
        detail = ", ".join(
                [
                        f"faithfulness={metrics['faithfulness']:.2f}",
                        f"answer={metrics['answer_relevancy']:.2f}",
                        f"precision={metrics['context_precision']:.2f}",
                ]
        )
        if failures:
                detail += f" (thresholds: {', '.join(failures)})"
        append_summary_line("rag-heuristic", status, detail)

        return 0 if status == "PASS" else 1


if __name__ == "__main__":
        raise SystemExit(main())
