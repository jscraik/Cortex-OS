"""
Hybrid Search for Multimodal Memories (Phase 3.2)

Combines semantic (vector) and keyword (text) search with configurable weights.

Following CODESTYLE.md:
- snake_case naming
- Type hints on all public functions
- Guard clauses for readability
- Functions ≤40 lines
- brAInwav branding in error messages
"""

from typing import List, Dict, Any, Optional


class SearchError(Exception):
    """brAInwav search error"""

    pass


def calculate_hybrid_score(
    semantic_score: float,
    keyword_score: float,
    semantic_weight: float = 0.6,
    keyword_weight: float = 0.4,
) -> float:
    """
    Calculate hybrid score from semantic and keyword components.
    
    Args:
        semantic_score: Vector similarity score (0-1)
        keyword_score: Text match score (0-1)
        semantic_weight: Weight for semantic component (default 0.6)
        keyword_weight: Weight for keyword component (default 0.4)
    
    Returns:
        Weighted hybrid score (0-1)
    
    Raises:
        SearchError: If weights don't sum to 1.0
    
    Following CODESTYLE.md: Guard clauses for validation
    """
    # Guard: weights must sum to 1.0
    weight_sum = semantic_weight + keyword_weight
    if abs(weight_sum - 1.0) > 0.001:
        raise SearchError(
            f"brAInwav: Weights must sum to 1.0, got {weight_sum:.3f}"
        )

    return semantic_weight * semantic_score + keyword_weight * keyword_score


class HybridSearch:
    """
    Hybrid search combining semantic and keyword matching.
    
    Supports modality filtering, source tracking (STM/LTM/remote),
    and performance optimization for <250ms P95 latency.
    """

    def __init__(
        self,
        semantic_weight: float = 0.6,
        keyword_weight: float = 0.4,
    ):
        """
        Initialize hybrid search.
        
        Args:
            semantic_weight: Weight for semantic scoring (default 0.6)
            keyword_weight: Weight for keyword scoring (default 0.4)
        """
        self.semantic_weight = semantic_weight
        self.keyword_weight = keyword_weight
        self._validate_weights()

    def _validate_weights(self) -> None:
        """Validate weights sum to 1.0"""
        weight_sum = self.semantic_weight + self.keyword_weight
        if abs(weight_sum - 1.0) > 0.001:
            raise SearchError(
                f"brAInwav: Weights must sum to 1.0, got {weight_sum:.3f}"
            )

    def semantic_search(
        self,
        query_embedding: List[float],
        limit: int = 10,
        threshold: float = 0.0,
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic (vector) search.
        
        Args:
            query_embedding: Query vector (512-dim for CLIP)
            limit: Maximum results to return
            threshold: Minimum similarity score
        
        Returns:
            List of results sorted by similarity score
        
        Following CODESTYLE.md: Guard clauses for validation
        """
        # Guard: embedding dimension
        if len(query_embedding) != 512:
            raise SearchError(
                f"brAInwav: Expected 512-dim embedding, got {len(query_embedding)}"
            )

        # Guard: negative limit
        if limit < 0:
            raise SearchError(
                f"brAInwav: Limit must be non-negative, got {limit}"
            )

        # Mock implementation for fast test mode
        # In production, would query vector database
        results = []

        # Sort by score descending
        results.sort(key=lambda x: x["score"], reverse=True)

        return results[:limit]

    def keyword_search(
        self, query: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Perform keyword (text) search.
        
        Args:
            query: Text query
            limit: Maximum results to return
        
        Returns:
            List of results sorted by relevance score
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: empty query
        if not query or not query.strip():
            return []

        # Guard: negative limit
        if limit < 0:
            raise SearchError(
                f"brAInwav: Limit must be non-negative, got {limit}"
            )

        # Mock implementation
        # In production, would use full-text search or Elasticsearch
        results = []

        return results[:limit]

    def hybrid_search(
        self,
        query_text: str,
        query_embedding: List[float],
        limit: int = 10,
        modality_filter: Optional[str] = None,
        prefer_recent: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Perform hybrid search combining semantic and keyword.
        
        Args:
            query_text: Text query for keyword matching
            query_embedding: Vector for semantic matching
            limit: Maximum results to return
            modality_filter: Filter by modality (TEXT/IMAGE/AUDIO/VIDEO)
            prefer_recent: Boost STM results for recency
        
        Returns:
            List of results sorted by hybrid score
        
        Raises:
            SearchError: If parameters are invalid
        
        Following CODESTYLE.md: Orchestration function ≤40 lines
        """
        # Guard: embedding dimension
        if len(query_embedding) != 512:
            raise SearchError(
                f"brAInwav: Expected 512-dim embedding, got {len(query_embedding)}"
            )

        # Guard: negative limit
        if limit < 0:
            raise SearchError(
                f"brAInwav: Limit must be non-negative, got {limit}"
            )

        # Get semantic results
        semantic_results = self.semantic_search(
            query_embedding, limit=limit * 2
        )

        # Get keyword results
        keyword_results = self.keyword_search(query_text, limit=limit * 2)

        # Combine and score
        results = self._combine_results(
            semantic_results,
            keyword_results,
            modality_filter,
            prefer_recent,
        )

        # Sort by hybrid score
        results.sort(key=lambda x: x["hybrid_score"], reverse=True)

        return results[:limit]

    def _combine_results(
        self,
        semantic_results: List[Dict[str, Any]],
        keyword_results: List[Dict[str, Any]],
        modality_filter: Optional[str],
        prefer_recent: bool,
    ) -> List[Dict[str, Any]]:
        """
        Combine semantic and keyword results into hybrid scores.
        
        Following CODESTYLE.md: Helper function ≤40 lines
        """
        # Create result map
        result_map: Dict[str, Dict[str, Any]] = {}

        # Add semantic results
        for result in semantic_results:
            result_id = result.get("id", "")
            result_map[result_id] = {
                **result,
                "semantic_score": result.get("score", 0.0),
                "keyword_score": 0.0,
                "source": result.get("source", "LTM"),
                "modality": result.get("modality", "TEXT"),
            }

        # Merge keyword results
        for result in keyword_results:
            result_id = result.get("id", "")
            if result_id in result_map:
                result_map[result_id]["keyword_score"] = result.get(
                    "score", 0.0
                )
            else:
                result_map[result_id] = {
                    **result,
                    "semantic_score": 0.0,
                    "keyword_score": result.get("score", 0.0),
                    "source": result.get("source", "LTM"),
                    "modality": result.get("modality", "TEXT"),
                }

        # Calculate hybrid scores
        combined = []
        for result_id, result in result_map.items():
            hybrid_score = calculate_hybrid_score(
                result["semantic_score"],
                result["keyword_score"],
                self.semantic_weight,
                self.keyword_weight,
            )

            # Apply recency boost for STM
            if prefer_recent and result["source"] == "STM":
                hybrid_score *= 1.2  # 20% boost for recent items

            result["hybrid_score"] = min(hybrid_score, 1.0)
            combined.append(result)

        # Apply modality filter
        if modality_filter:
            combined = [
                r for r in combined if r["modality"] == modality_filter
            ]

        return combined
