"""Simple reranker used for MLX tests"""

import json
import sys
from typing import Any, Dict, List, Union


def validate_input_data(data: Any) -> Dict[str, Any]:
    """Validate and sanitize input data."""
    if not isinstance(data, dict):
        raise ValueError("Input must be a JSON object")
    
    # Validate required fields
    if "query" not in data:
        raise ValueError("Missing required field: query")
    if "docs" not in data:
        raise ValueError("Missing required field: docs")
    
    # Validate data types
    query = data["query"]
    if not isinstance(query, str):
        raise ValueError("Query must be a string")
    
    docs = data["docs"]
    if not isinstance(docs, list):
        raise ValueError("Docs must be a list")
    
    # Validate document strings
    for i, doc in enumerate(docs):
        if not isinstance(doc, str):
            raise ValueError(f"Document {i} must be a string")
    
    # Validate and sanitize top_k
    top_k = data.get("top_k", len(docs))
    if not isinstance(top_k, int) or top_k < 1:
        top_k = len(docs)
    top_k = min(top_k, 100)  # Reasonable limit
    
    # Sanitize strings (remove null bytes, limit length)
    clean_query = query.replace('\x00', '')[:1000]
    clean_docs = [doc.replace('\x00', '')[:2000] for doc in docs[:50]]  # Limit docs
    
    return {
        "query": clean_query,
        "docs": clean_docs,
        "top_k": top_k
    }


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
        # Validate command line arguments
        if len(sys.argv) != 2:
            raise ValueError("Expected exactly one JSON argument")
        
        # Parse and validate JSON input
        raw_data = json.loads(sys.argv[1])
        data = validate_input_data(raw_data)
        
        query = data["query"]
        docs = data["docs"]
        top_k = data["top_k"]
        
        result = rerank(query, docs, top_k)
        print(json.dumps(result))
    except (json.JSONDecodeError, ValueError) as e:
        print(json.dumps({"error": f"Input validation error: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Processing error: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
