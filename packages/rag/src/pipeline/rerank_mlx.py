# Cross-encoder: score(query, doc) with MLX; batch for speed
def rerank(query: str, docs: list[str], top_k: int = 20):
    # tokenize pairs → forward → softmax/logits → sort → return [(doc,score)]
    return []
