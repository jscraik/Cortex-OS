"""Adapter to align ChatGPT connector with the shared MemoryBridge vector store.

This adapter uses the QdrantVectorStore from packages/mcp/integrations/memory_bridge.py
to store and search documents, while providing a simple async API compatible with the
ChatGPT connector server.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

# Use the MemoryBridge Qdrant vector store (async API)
from ...integrations.memory_bridge import QdrantVectorStore as BridgeQdrantVectorStore  # type: ignore

logger = logging.getLogger(__name__)


class SearchResultCompat:
    def __init__(self, id: str, title: str, content_preview: str, url: str | None, similarity: float, metadata: dict[str, Any]):
        self.id = id
        self.title = title
        self.content_preview = content_preview
        self.url = url
        self.similarity = similarity
        self.metadata = metadata


class MemoryBridgeVectorAdapter:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        # Local Qdrant impl used for typing shapes only
        self._model_name = model_name
        # Embedding model for adapter (patched to a stub in tests)
        from sentence_transformers import SentenceTransformer  # patched in tests

        self._embedder = SentenceTransformer(model_name)

        # Bridge vector store (async)
        self._vs = BridgeQdrantVectorStore()
        self._initialized = False

    async def initialize(self) -> None:
        if not self._initialized:
            await self._vs.initialize()
            self._initialized = True

    def _embed(self, text: str) -> List[float]:
        vec = self._embedder.encode(text)
        # SentenceTransformer may return numpy array; ensure JSON-serializable list
        return vec.tolist() if hasattr(vec, "tolist") else list(vec)

    async def add_document(
        self, *, content: str, metadata: Optional[Dict[str, Any]] = None, doc_id: Optional[str] = None
    ) -> str:
        await self.initialize()
        embedding = self._embed(content)
        payload = {"content": content}
        if metadata:
            payload.update(metadata)
        await self._vs.store_embedding(memory_id=doc_id or "", embedding=embedding, metadata=payload)
        # Bridge store does not return ID; use provided doc_id as canonical
        return doc_id or ""

    async def search(
        self, query: str, top_k: int = 5, score_threshold: float = 0.5
    ) -> List[SearchResultCompat]:
        await self.initialize()
        qvec = self._embed(query)
        results = await self._vs.search_similar(
            query_vector=qvec,
            limit=top_k,
            score_threshold=score_threshold,
            filter_conditions=None,
        )

        # Map bridge result into local SearchResult-like objects
        mapped: List[SearchResultCompat] = []
        for r in results:
            md = r.get("metadata", {})
            content = md.get("content", "")
            preview = content[:200] + "..." if len(content) > 200 else content
            mapped.append(SearchResultCompat(
                id=str(r.get("memory_id")),
                title=md.get("title", "Untitled"),
                content_preview=preview,
                url=md.get("url"),
                similarity=float(r.get("score", 0.0)),
                metadata={
                    "category": md.get("category"),
                    "author": md.get("author"),
                    "tags": md.get("tags", []),
                    "created_at": md.get("created_at"),
                    "updated_at": md.get("updated_at"),
                },
            ))

        return mapped

    async def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve document by ID via bridge API."""
        await self.initialize()
        got = await self._vs.retrieve(memory_id=doc_id)
        if not got:
            return None
        payload = got.get("metadata", {})
        return {
            "id": got.get("memory_id", doc_id),
            "content": payload.get("content", ""),
            "metadata": payload,
        }

    async def get_statistics(self) -> Dict[str, Any]:
        await self.initialize()
        return await self._vs.get_vector_stats()

    async def get_documents(self, ids: list[str]) -> list[Dict[str, Any]]:
        """Batch fetch documents by IDs using bridge retrieve_many."""
        await self.initialize()
        if not ids:
            return []
        rows = await self._vs.retrieve_many(memory_ids=ids)
        out: list[Dict[str, Any]] = []
        for row in rows:
            payload = row.get("metadata", {})
            out.append({
                "id": row.get("memory_id"),
                "content": payload.get("content", ""),
                "metadata": payload,
            })
        return out
