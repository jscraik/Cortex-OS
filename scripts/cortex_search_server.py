from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse

DATA_FILE = Path("data/cortex-search-index.json")
API_KEY_FILE = Path("config/cortex-search.key")

app = FastAPI(title="Cortex Search", version="1.0.0")


def ensure_dataset() -> list[dict[str, Any]]:
    if not DATA_FILE.exists():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Search index missing. Upload data/cortex-search-index.json",
        )
    with DATA_FILE.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def require_api_key(request: Request) -> None:
    if not API_KEY_FILE.exists():
        # When no key is configured, operate in open mode (internal-only).
        return
    token = (request.headers.get("Authorization") or "").removeprefix("Bearer ").strip()
    expected = API_KEY_FILE.read_text(encoding="utf-8").strip()
    if token != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "documents": str(DATA_FILE)}


@app.get("/search")
def search(
    request: Request,
    q: str = Query("", min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=50),
) -> JSONResponse:
    require_api_key(request)
    documents = ensure_dataset()
    lowered = q.lower()
    results: list[dict[str, Any]] = []
    for entry in documents:
        text = entry.get("text", "")
        if lowered in text.lower():
            results.append(
                {
                    "id": entry.get("id"),
                    "title": entry.get("title"),
                    "snippet": entry.get("snippet") or text[:200],
                    "url": entry.get("url", ""),
                    "source": entry.get("source", "cortex"),
                    "score": entry.get("score", 0.5),
                }
            )
    payload = {
        "query": q,
        "results": results[:limit],
        "total_found": len(results),
    }
    return JSONResponse(payload)


@app.get("/documents/{doc_id}")
def fetch_document(request: Request, doc_id: str) -> JSONResponse:
    require_api_key(request)
    documents = ensure_dataset()
    for entry in documents:
        if entry.get("id") == doc_id:
            payload = {
                "id": entry.get("id"),
                "title": entry.get("title"),
                "text": entry.get("text", ""),
                "metadata": entry.get("metadata", {}),
                "url": entry.get("url", ""),
            }
            return JSONResponse(payload)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "scripts.cortex_search_server:app",
        host="0.0.0.0",
        port=3124,
        reload=False,
    )
