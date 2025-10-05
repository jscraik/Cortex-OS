"""
GraphRAG Tool for brAInwav Cortex-OS MCP Server

This tool provides graph-enhanced retrieval-augmented generation capabilities
through the MCP protocol, following the established cortex-mcp patterns.

Features:
- Integration with memory-core GraphRAG service
- brAInwav branding compliance in all outputs
- Structured parameter validation using Pydantic
- Comprehensive error handling and logging
- Citation formatting for traceability
"""

import logging
from datetime import datetime
from typing import Any

import httpx
from pydantic import BaseModel, Field, validator

# Configure logging with brAInwav branding
logger = logging.getLogger(__name__)


class GraphRAGQueryParams(BaseModel):
    """Parameters for GraphRAG query requests"""

    question: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="The question to query against the brAInwav knowledge graph",
    )
    k: int = Field(
        default=8,
        ge=1,
        le=50,
        description="Number of initial results to retrieve (default: 8)",
    )
    max_hops: int = Field(
        default=1,
        ge=1,
        le=3,
        description="Maximum graph hops for expansion (default: 1)",
    )
    max_chunks: int = Field(
        default=24,
        ge=1,
        le=100,
        description="Maximum context chunks to include (default: 24)",
    )
    threshold: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Relevance threshold for filtering results (optional)",
    )
    include_citations: bool = Field(
        default=True,
        description="Include source citations in the response (default: true)",
    )
    include_vectors: bool = Field(
        default=False,
        description="Include vector embeddings in response (default: false)",
    )
    namespace: str | None = Field(
        default=None, description="Knowledge namespace to search within (optional)"
    )

    @validator("question")
    def validate_question(cls, v):
        """Validate question content"""
        if not v.strip():
            raise ValueError("Question cannot be empty or whitespace only")
        return v.strip()


class GraphRAGTool:
    """
    GraphRAG Tool for brAInwav MCP Server

    Provides graph-enhanced knowledge retrieval with hybrid search
    and 1-hop graph expansion through the memory-core service.
    """

    def __init__(self, memory_core_endpoint: str = None):
        self.name = "graphrag.query"
        self.description = (
            "Query the brAInwav GraphRAG knowledge graph with hybrid search "
            "and graph expansion for enhanced retrieval-augmented generation"
        )

        # Configure memory-core endpoint
        self.memory_core_endpoint = memory_core_endpoint or "http://localhost:3000"
        self.client = httpx.AsyncClient(timeout=30.0)

        # brAInwav branding configuration
        self.branding = {
            "source": "brAInwav Cortex-OS GraphRAG",
            "powered_by": "brAInwav",
            "service": "brAInwav MCP GraphRAG Tool",
        }

        logger.info(f"brAInwav GraphRAG tool initialized: {self.memory_core_endpoint}")

    async def execute(self, params: dict[str, Any]) -> dict[str, Any]:
        """
        Execute GraphRAG query with comprehensive error handling

        Args:
            params: Query parameters dictionary

        Returns:
            Structured response with results, metadata, and brAInwav branding
        """
        start_time = datetime.utcnow()

        try:
            # Validate and parse parameters
            validated_params = GraphRAGQueryParams(**params)

            logger.info(
                f"brAInwav GraphRAG query started: '{validated_params.question[:50]}...'"
            )

            # Call memory-core GraphRAG service
            response = await self._call_memory_core_service(validated_params)

            # Format response with brAInwav branding
            result = self._format_response(response, validated_params, start_time)

            logger.info(
                f"brAInwav GraphRAG query completed: "
                f"{result['data']['graph_context']['total_chunks']} chunks, "
                f"{result['data']['metadata']['retrieval_duration_ms']}ms"
            )

            return result

        except httpx.TimeoutException:
            error_msg = "brAInwav GraphRAG service timeout - please try again"
            logger.error(
                f"GraphRAG timeout for question: {params.get('question', 'unknown')}"
            )
            return self._format_error_response(error_msg, start_time)

        except httpx.HTTPStatusError as e:
            error_msg = (
                f"brAInwav GraphRAG service error: HTTP {e.response.status_code}"
            )
            logger.error(f"GraphRAG HTTP error: {e}")
            return self._format_error_response(error_msg, start_time)

        except ValueError as e:
            error_msg = f"brAInwav GraphRAG parameter validation failed: {e!s}"
            logger.error(f"GraphRAG validation error: {e}")
            return self._format_error_response(error_msg, start_time)

        except Exception as e:
            error_msg = f"brAInwav GraphRAG unexpected error: {e!s}"
            logger.error(f"GraphRAG unexpected error: {e}", exc_info=True)
            return self._format_error_response(error_msg, start_time)

    async def _call_memory_core_service(
        self, params: GraphRAGQueryParams
    ) -> dict[str, Any]:
        """Call the memory-core GraphRAG service endpoint"""

        request_payload = {
            "question": params.question,
            "k": params.k,
            "maxHops": params.max_hops,
            "maxChunks": params.max_chunks,
            "threshold": params.threshold,
            "includeCitations": params.include_citations,
            "includeVectors": params.include_vectors,
            "namespace": params.namespace,
        }

        # Remove None values
        request_payload = {k: v for k, v in request_payload.items() if v is not None}

        endpoint_url = f"{self.memory_core_endpoint.rstrip('/')}/api/v1/graphrag/query"

        response = await self.client.post(
            endpoint_url,
            json=request_payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "brAInwav-MCP-GraphRAG/1.0",
                "X-brAInwav-Service": "MCP-GraphRAG-Tool",
            },
        )

        response.raise_for_status()
        return response.json()

    def _format_response(
        self,
        service_response: dict[str, Any],
        params: GraphRAGQueryParams,
        start_time: datetime,
    ) -> dict[str, Any]:
        """Format the successful response with brAInwav branding"""

        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

        payload = service_response.get("data", service_response)

        # Extract core data from service response
        sources = payload.get("sources", [])
        graph_context = payload.get("graphContext", payload.get("graph_context", {}))
        metadata = payload.get("metadata", {})
        citations = payload.get("citations", []) if params.include_citations else None

        # Format sources with brAInwav indexing metadata
        formatted_sources = [
            {
                **source,
                "brainwav_indexed": True,
                "brainwav_source": self.branding["source"],
            }
            for source in sources
        ]

        # Format citations with brAInwav metadata
        formatted_citations = None
        if citations:
            formatted_citations = [
                {
                    **citation,
                    "brainwav_indexed": True,
                    "brainwav_authority": "brAInwav Cortex-OS",
                }
                for citation in citations
            ]

        return {
            "success": True,
            "data": {
                "sources": formatted_sources,
                "graph_context": {**graph_context, "brainwav_enhanced": True},
                "metadata": {
                    **metadata,
                    "brainwav_powered": True,
                    "brainwav_service": self.branding["service"],
                    "mcp_tool_duration_ms": duration_ms,
                    "query_timestamp": start_time.isoformat(),
                    "brainwav_authority": self.branding["powered_by"],
                },
                "citations": formatted_citations,
                "query_info": {
                    "question": params.question,
                    "parameters": {
                        "k": params.k,
                        "max_hops": params.max_hops,
                        "max_chunks": params.max_chunks,
                        "threshold": params.threshold,
                    },
                    "brainwav_processed": True,
                },
            },
            "brainwav_brand": self.branding["powered_by"],
            "tool_metadata": {
                "tool_name": self.name,
                "brainwav_source": self.branding["source"],
                "execution_time_ms": duration_ms,
                "timestamp": start_time.isoformat(),
            },
        }

    def _format_error_response(
        self, error_message: str, start_time: datetime
    ) -> dict[str, Any]:
        """Format error response with brAInwav branding"""

        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

        return {
            "success": False,
            "error": {
                "message": error_message,
                "brainwav_service": self.branding["service"],
                "timestamp": start_time.isoformat(),
                "duration_ms": duration_ms,
            },
            "brainwav_brand": self.branding["powered_by"],
            "tool_metadata": {
                "tool_name": self.name,
                "brainwav_source": self.branding["source"],
                "error_handled": True,
            },
        }

    def get_schema(self) -> dict[str, Any]:
        """Get the tool schema for MCP server registration"""

        return {
            "name": self.name,
            "description": self.description,
            "inputSchema": {
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "The question to query against the brAInwav knowledge graph",
                        "minLength": 1,
                        "maxLength": 1000,
                    },
                    "k": {
                        "type": "integer",
                        "description": "Number of initial results to retrieve",
                        "default": 8,
                        "minimum": 1,
                        "maximum": 50,
                    },
                    "max_hops": {
                        "type": "integer",
                        "description": "Maximum graph hops for expansion",
                        "default": 1,
                        "minimum": 1,
                        "maximum": 3,
                    },
                    "max_chunks": {
                        "type": "integer",
                        "description": "Maximum context chunks to include",
                        "default": 24,
                        "minimum": 1,
                        "maximum": 100,
                    },
                    "threshold": {
                        "type": "number",
                        "description": "Relevance threshold for filtering results",
                        "minimum": 0.0,
                        "maximum": 1.0,
                    },
                    "include_citations": {
                        "type": "boolean",
                        "description": "Include source citations in the response",
                        "default": True,
                    },
                    "include_vectors": {
                        "type": "boolean",
                        "description": "Include vector embeddings in response",
                        "default": False,
                    },
                    "namespace": {
                        "type": "string",
                        "description": "Knowledge namespace to search within",
                    },
                },
                "required": ["question"],
                "additionalProperties": False,
            },
            "brainwav_metadata": {
                "source": self.branding["source"],
                "powered_by": self.branding["powered_by"],
                "capabilities": [
                    "hybrid_search",
                    "graph_expansion",
                    "citation_generation",
                    "brainwav_branding",
                ],
            },
        }

    async def health_check(self) -> dict[str, Any]:
        """Check the health of the GraphRAG service"""

        try:
            response = await self.client.get(
                f"{self.memory_core_endpoint}/api/graphrag/health", timeout=5.0
            )
            response.raise_for_status()
            service_health = response.json()

            return {
                "status": "healthy",
                "service_health": service_health,
                "brainwav_source": self.branding["source"],
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"brAInwav GraphRAG health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "brainwav_source": self.branding["source"],
                "timestamp": datetime.utcnow().isoformat(),
            }

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
        logger.info("brAInwav GraphRAG tool client closed")


# Factory function for easy instantiation
def create_graphrag_tool(memory_core_endpoint: str = None) -> GraphRAGTool:
    """Create a GraphRAG tool instance with optional endpoint override"""
    return GraphRAGTool(memory_core_endpoint)
