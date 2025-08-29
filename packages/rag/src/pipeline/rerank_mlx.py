"""MLX-based cross-encoder reranker"""
from __future__ import annotations
import json
from typing import List, Tuple
import mlx.core as mx
from transformers import AutoTokenizer, AutoModelForSequenceClassification

MODEL_NAME = "Qwen/Qwen3-Reranker-4B"

def rerank(query: str, docs: List[str], top_k: int = 20) -> List[Tuple[str, float]]:
    """Score and rerank documents relative to a query.

    Args:
        query: search query string
        docs: list of document texts
        top_k: number of top documents to return
    Returns:
        List of (doc, score) tuples sorted by score descending
    """
    if not docs:
        return []

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, trust_remote_code=True)

    scores: List[float] = []
    for doc in docs:
        inputs = tokenizer(query, doc, return_tensors="np", padding=True, truncation=True, max_length=512)
        input_ids = mx.array(inputs["input_ids"])
        attention_mask = mx.array(inputs["attention_mask"])
        logits = model(input_ids=input_ids, attention_mask=attention_mask).logits
        score = float(mx.sigmoid(logits)[0][0])
        scores.append(score)

    paired = list(zip(docs, scores))
    paired.sort(key=lambda x: x[1], reverse=True)
    return paired[:top_k]
