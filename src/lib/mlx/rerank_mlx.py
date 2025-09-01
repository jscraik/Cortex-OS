"""Simple reranker used for MLX tests"""

import json
import sys


def rerank(query, docs, top_k):
    q_words = set(query.lower().split())
    scored = []
    for doc in docs:
        d_words = set(doc.lower().split())
        overlap = len(q_words & d_words)
        union = len(q_words | d_words) or 1
        score = overlap / union
        scored.append({"text": doc, "score": score})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]


if __name__ == "__main__":
    try:
        data = json.loads(sys.argv[1])
        query = data["query"]
        docs = data["docs"]
        top_k = data.get("top_k", len(docs))
        result = rerank(query, docs, top_k)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
