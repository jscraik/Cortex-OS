import json
import sys


def compute_scores(query: str, documents: list[str]) -> list[float]:
    """Compute simple relevance scores based on word overlap."""
    q_words = set(query.lower().split())
    scores: list[float] = []
    for doc in documents:
        d_words = set(doc.lower().split())
        score = len(q_words.intersection(d_words))
        scores.append(float(score))
    return scores


def main() -> None:
    try:
        data = json.load(sys.stdin)
        query = data.get("query", "")
        documents = data.get("documents", [])
        scores = compute_scores(query, documents)
        print(json.dumps({"scores": scores}))
    except Exception as exc:  # pragma: no cover - defensive
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
