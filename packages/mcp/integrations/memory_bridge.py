"""Memory system integration bridge for connecting MCP with Cortex-OS memory infrastructure."""

import json
import logging
import os
import re
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

# Optional heavy dependencies; import lazily to avoid failing at import time
try:  # pragma: no cover - import guard
    from neo4j import AsyncGraphDatabase  # type: ignore
except Exception:  # pragma: no cover - only used when feature is exercised
    AsyncGraphDatabase = None  # type: ignore

try:  # pragma: no cover - import guard
    from qdrant_client import QdrantClient  # type: ignore
    from qdrant_client.http import models as qdrant_models  # type: ignore
except Exception:  # pragma: no cover - only used when feature is exercised
    QdrantClient = None  # type: ignore
    qdrant_models = None  # type: ignore

from ..core.circuit_breakers import circuit_breaker

logger = logging.getLogger(__name__)


class MemoryType(Enum):
    """Types of memory storage."""

    CONVERSATIONAL = "conversational"
    FACTUAL = "factual"
    PROCEDURAL = "procedural"
    TOOL_CONTEXT = "tool_context"
    AGENT_STATE = "agent_state"


class ContextScope(Enum):
    """Context scoping for memory retrieval."""

    SESSION = "session"
    USER = "user"
    TOOL = "tool"
    GLOBAL = "global"


@dataclass
class MemoryNode:
    """Represents a memory node in the graph database."""

    node_id: str
    memory_type: MemoryType
    content: dict[str, Any]
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    embedding: list[float] | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "node_id": self.node_id,
            "memory_type": self.memory_type.value,
            "content": self.content,
            "metadata": self.metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "MemoryNode":
        """Create from dictionary."""
        return cls(
            node_id=data["node_id"],
            memory_type=MemoryType(data["memory_type"]),
            content=data["content"],
            metadata=data.get("metadata", {}),
            created_at=data.get("created_at", time.time()),
            updated_at=data.get("updated_at", time.time()),
        )


@dataclass
class ContextStore:
    """Context storage for tool executions and conversations."""

    context_id: str
    scope: ContextScope
    data: dict[str, Any]
    expires_at: float | None = None
    created_at: float = field(default_factory=time.time)

    @property
    def is_expired(self) -> bool:
        """Check if context has expired."""
        if self.expires_at is None:
            return False
        return time.time() > self.expires_at

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "context_id": self.context_id,
            "scope": self.scope.value,
            "data": self.data,
            "expires_at": self.expires_at,
            "created_at": self.created_at,
        }


class Neo4jMemoryStore:
    """Neo4j-based graph memory storage for relationships and knowledge."""

    def __init__(
        self,
        uri: str = "bolt://localhost:7687",
        username: str = "neo4j",
        password: str | None = None,
        database: str = "mcp",
    ):
        self.uri = uri
        self.username = username

        # Get password from environment or parameter
        if password is not None:
            self.password = password
        elif "NEO4J_PASSWORD" in os.environ:
            self.password = os.environ["NEO4J_PASSWORD"]
        else:
            raise ValueError(
                "Neo4j password must be provided either via 'password' parameter "
                "or 'NEO4J_PASSWORD' environment variable. "
                "Hardcoded passwords are not allowed for security."
            )

        self.database = database
        self.driver: Any | None = None

        # Connection metrics
        self.connection_errors = 0
        self.query_count = 0
        self.last_query_time: float | None = None

        # Allowed relationship type pattern to prevent Cypher injection
        self._rel_type_pattern = re.compile(r"^[A-Z][A-Z0-9_]*$")

    async def initialize(self) -> None:
        """Initialize Neo4j connection."""
        if AsyncGraphDatabase is None:
            raise RuntimeError(
                "neo4j driver is not installed. Install 'neo4j' to enable Neo4jMemoryStore."
            )
        try:
            self.driver = AsyncGraphDatabase.driver(
                self.uri,
                auth=(self.username, self.password),
                database=self.database,
            )

            # Test connection
            async with self.driver.session() as session:
                result = await session.run("RETURN 1 as test")
                await result.single()

            # Create indexes for performance
            await self._create_indexes()

            logger.info("Neo4j memory store initialized successfully")

        except Exception as e:
            self.connection_errors += 1
            logger.error(f"Failed to initialize Neo4j: {e}")
            raise

    async def close(self) -> None:
        """Close Neo4j connection."""
        if self.driver:
            await self.driver.close()
            logger.info("Neo4j connection closed")

    async def _create_indexes(self) -> None:
        """Create necessary indexes for performance."""
        indexes = [
            "CREATE INDEX memory_node_id IF NOT EXISTS FOR (m:Memory) ON (m.node_id)",
            "CREATE INDEX memory_type IF NOT EXISTS FOR (m:Memory) ON (m.memory_type)",
            "CREATE INDEX memory_created IF NOT EXISTS FOR (m:Memory) ON (m.created_at)",
            "CREATE INDEX tool_execution_id IF NOT EXISTS FOR (t:ToolExecution) ON (t.execution_id)",
            "CREATE INDEX user_session_id IF NOT EXISTS FOR (s:Session) ON (s.session_id)",
        ]

        async with self.driver.session() as session:
            for index_query in indexes:
                try:
                    await session.run(index_query)
                except Exception as e:
                    logger.warning(f"Index creation warning: {e}")

    @circuit_breaker("neo4j_query")
    async def store_memory_node(self, memory_node: MemoryNode) -> None:
        """Store a memory node in Neo4j."""
        self.query_count += 1
        self.last_query_time = time.time()

        query = """
        MERGE (m:Memory {node_id: $node_id})
        SET m.memory_type = $memory_type,
            m.content = $content,
            m.metadata = $metadata,
            m.updated_at = $updated_at
        ON CREATE SET m.created_at = $created_at
        RETURN m
        """

        async with self.driver.session() as session:
            await session.run(
                query,
                node_id=memory_node.node_id,
                memory_type=memory_node.memory_type.value,
                content=json.dumps(memory_node.content),
                metadata=json.dumps(memory_node.metadata),
                created_at=memory_node.created_at,
                updated_at=memory_node.updated_at,
            )

    @circuit_breaker("neo4j_query")
    async def get_memory_node(self, node_id: str) -> MemoryNode | None:
        """Retrieve a memory node by ID."""
        self.query_count += 1
        self.last_query_time = time.time()

        query = """
        MATCH (m:Memory {node_id: $node_id})
        RETURN m.node_id as node_id,
               m.memory_type as memory_type,
               m.content as content,
               m.metadata as metadata,
               m.created_at as created_at,
               m.updated_at as updated_at
        """

        async with self.driver.session() as session:
            result = await session.run(query, node_id=node_id)
            record = await result.single()

            if record:
                return MemoryNode(
                    node_id=record["node_id"],
                    memory_type=MemoryType(record["memory_type"]),
                    content=json.loads(record["content"]),
                    metadata=json.loads(record["metadata"]),
                    created_at=record["created_at"],
                    updated_at=record["updated_at"],
                )

        return None

    @circuit_breaker("neo4j_query")
    async def create_relationship(
        self,
        from_node_id: str,
        to_node_id: str,
        relationship_type: str,
        properties: dict[str, Any] | None = None,
    ) -> None:
        """Create a relationship between memory nodes."""
        self.query_count += 1
        self.last_query_time = time.time()

        if not self._rel_type_pattern.match(relationship_type):
            raise ValueError(
                f"Invalid relationship type: '{relationship_type}'. "
                f"Expected pattern: '{self._rel_type_pattern.pattern}'."
            )

        query = (
            "MATCH (a:Memory {node_id: $from_node_id})\n"
            "MATCH (b:Memory {node_id: $to_node_id})\n"
            f"MERGE (a)-[r:{relationship_type}]->(b)\n"
            "SET r += $properties\n"
            "SET r.created_at = $created_at\n"
            "RETURN r"
        )

        async with self.driver.session() as session:
            await session.run(
                query,
                from_node_id=from_node_id,
                to_node_id=to_node_id,
                properties=properties or {},
                created_at=time.time(),
            )

    @circuit_breaker("neo4j_query")
    async def find_related_memories(
        self,
        node_id: str,
        relationship_types: list[str] | None = None,
        max_depth: int = 2,
        limit: int = 50,
    ) -> list[MemoryNode]:
        """Find memories related to a given node."""
        self.query_count += 1
        self.last_query_time = time.time()

        rel_filter = ""
        if relationship_types:
            sanitized = []
            for rel in relationship_types:
                if not self._rel_type_pattern.fullmatch(rel):
                    raise ValueError("Invalid relationship type")
                sanitized.append(rel)
            rel_filter = f"[r:{'|'.join(sanitized)}]"
        else:
            rel_filter = "[r]"

        query = f"""
        MATCH (start:Memory {{node_id: $node_id}})
        MATCH (start)-{rel_filter}*1..{max_depth}-(related:Memory)
        WHERE related.node_id <> $node_id
        RETURN DISTINCT related.node_id as node_id,
               related.memory_type as memory_type,
               related.content as content,
               related.metadata as metadata,
               related.created_at as created_at,
               related.updated_at as updated_at
        ORDER BY related.updated_at DESC
        LIMIT $limit
        """

        memories = []
        async with self.driver.session() as session:
            result = await session.run(query, node_id=node_id, limit=limit)
            async for record in result:
                memories.append(
                    MemoryNode(
                        node_id=record["node_id"],
                        memory_type=MemoryType(record["memory_type"]),
                        content=json.loads(record["content"]),
                        metadata=json.loads(record["metadata"]),
                        created_at=record["created_at"],
                        updated_at=record["updated_at"],
                    )
                )

        return memories

    async def get_memory_stats(self) -> dict[str, Any]:
        """Get memory store statistics."""
        query = """
        MATCH (m:Memory)
        RETURN count(m) as total_nodes,
               collect(DISTINCT m.memory_type) as memory_types
        """

        async with self.driver.session() as session:
            result = await session.run(query)
            record = await result.single()

            return {
                "total_nodes": record["total_nodes"] if record else 0,
                "memory_types": record["memory_types"] if record else [],
                "connection_errors": self.connection_errors,
                "query_count": self.query_count,
                "last_query_time": self.last_query_time,
            }


class QdrantVectorStore:
    """Qdrant-based vector storage for semantic similarity search."""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 6333,
        collection_name: str = "mcp_memories",
        vector_size: int = 1536,  # OpenAI embedding size
    ):
        self.host = host
        self.port = port
        self.collection_name = collection_name
        self.vector_size = vector_size
        self.client: QdrantClient | None = None

        # Metrics
        self.search_count = 0
        self.insert_count = 0
        self.connection_errors = 0

    async def initialize(self) -> None:
        """Initialize Qdrant connection and collection."""
        if QdrantClient is None or qdrant_models is None:
            raise RuntimeError(
                "qdrant-client is not installed. Install 'qdrant-client' to enable QdrantVectorStore."
            )
        try:
            self.client = QdrantClient(host=self.host, port=self.port)

            # Create collection if it doesn't exist
            collections = self.client.get_collections().collections
            collection_names = [c.name for c in collections]

            if self.collection_name not in collection_names:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=qdrant_models.VectorParams(
                        size=self.vector_size,
                        distance=qdrant_models.Distance.COSINE,
                    ),
                )
                logger.info(f"Created Qdrant collection: {self.collection_name}")

            logger.info("Qdrant vector store initialized successfully")

        except Exception as e:
            self.connection_errors += 1
            logger.error(f"Failed to initialize Qdrant: {e}")
            raise

    @circuit_breaker("qdrant_operation")
    async def store_embedding(
        self,
        memory_id: str,
        embedding: list[float],
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Store an embedding vector with metadata."""
        self.insert_count += 1
        if qdrant_models is None or self.client is None:
            raise RuntimeError("Vector store not initialized or missing qdrant models")

        point = qdrant_models.PointStruct(
            id=memory_id,
            vector=embedding,
            payload=metadata or {},
        )

        self.client.upsert(
            collection_name=self.collection_name,
            points=[point],
        )

    @circuit_breaker("qdrant_operation")
    async def search_similar(
        self,
        query_vector: list[float],
        limit: int = 10,
        score_threshold: float = 0.7,
        filter_conditions: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Search for similar embeddings."""
        self.search_count += 1
        if qdrant_models is None or self.client is None:
            raise RuntimeError("Vector store not initialized or missing qdrant models")

        search_filter = None
        if filter_conditions:
            # Convert filter conditions to Qdrant filter format
            search_filter = qdrant_models.Filter(
                must=[
                    qdrant_models.FieldCondition(
                        key=key,
                        match=qdrant_models.MatchValue(value=value),
                    )
                    for key, value in filter_conditions.items()
                ]
            )

        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=limit,
            score_threshold=score_threshold,
            query_filter=search_filter,
        )

        return [
            {
                "memory_id": result.id,
                "score": result.score,
                "metadata": result.payload,
            }
            for result in results
        ]

    async def retrieve(self, memory_id: str) -> dict[str, Any] | None:
        """Retrieve a stored embedding payload by memory ID."""
        if self.client is None:
            raise RuntimeError("Vector store not initialized")
        try:
            result = self.client.retrieve(
                collection_name=self.collection_name,
                ids=[memory_id],
            )
            if not result:
                return None
            point = result[0]
            return {
                "memory_id": str(point.id),
                "metadata": point.payload or {},
            }
        except Exception as e:
            logger.error(f"Failed to retrieve memory {memory_id}: {e}")
            return None

    async def retrieve_many(self, memory_ids: list[str]) -> list[dict[str, Any]]:
        """Batch retrieve payloads by memory IDs."""
        if self.client is None:
            raise RuntimeError("Vector store not initialized")
        if not memory_ids:
            return []
        try:
            results = self.client.retrieve(
                collection_name=self.collection_name,
                ids=memory_ids,
            )
            mapped: list[dict[str, Any]] = []
            for point in results or []:
                mapped.append(
                    {
                        "memory_id": str(point.id),
                        "metadata": point.payload or {},
                    }
                )
            return mapped
        except Exception as e:
            logger.error(f"Failed to batch retrieve memories: {e}")
            return []

    async def delete_embedding(self, memory_id: str) -> None:
        """Delete an embedding by memory ID."""
        if self.client is None or qdrant_models is None:
            raise RuntimeError("Vector store not initialized")
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=qdrant_models.PointIdsList(
                points=[memory_id],
            ),
        )

    async def get_vector_stats(self) -> dict[str, Any]:
        """Get vector store statistics."""
        try:
            if self.client is None:
                raise RuntimeError("Vector store not initialized")
            collection_info = self.client.get_collection(self.collection_name)

            return {
                "collection_name": self.collection_name,
                "vector_count": collection_info.points_count,
                "vector_size": self.vector_size,
                "search_count": self.search_count,
                "insert_count": self.insert_count,
                "connection_errors": self.connection_errors,
            }
        except Exception as e:
            logger.error(f"Failed to get vector stats: {e}")
            return {"error": str(e)}


class MemoryBridge:
    """Unified bridge for memory operations across Neo4j and Qdrant."""

    def __init__(
        self,
        neo4j_store: Neo4jMemoryStore | None = None,
        vector_store: QdrantVectorStore | None = None,
        embedding_function: Callable | None = None,
    ):
        self.neo4j_store = neo4j_store or Neo4jMemoryStore()
        self.vector_store = vector_store or QdrantVectorStore()
        self.embedding_function = embedding_function or self._default_embedding

        # Context storage
        self.context_cache: dict[str, ContextStore] = {}

        # Metrics
        self.operations_count = 0
        self.cache_hits = 0
        self.cache_misses = 0

    async def initialize(self) -> None:
        """Initialize both memory stores."""
        await self.neo4j_store.initialize()
        await self.vector_store.initialize()
        logger.info("Memory bridge initialized successfully")

    async def close(self) -> None:
        """Close connections to both stores."""
        await self.neo4j_store.close()
        logger.info("Memory bridge closed")

    def _default_embedding(self, text: str) -> list[float]:
        """Default embedding function (placeholder)."""
        # In production, use OpenAI embeddings or similar
        # This is a simple hash-based embedding for testing
        import hashlib

        hash_obj = hashlib.md5(text.encode())
        hash_bytes = hash_obj.digest()

        # Convert to float array (not semantically meaningful)
        embedding = []
        for i in range(0, len(hash_bytes), 4):
            chunk = hash_bytes[i : i + 4]
            if len(chunk) == 4:
                value = int.from_bytes(chunk, byteorder="big")
                embedding.append(float(value) / (2**32))

        # Pad or truncate to required size
        while len(embedding) < 128:  # Smaller size for testing
            embedding.append(0.0)

        return embedding[:128]

    async def store_tool_context(
        self,
        tool_name: str,
        execution_id: str,
        context_data: dict[str, Any],
        user_id: str | None = None,
    ) -> str:
        """Store tool execution context."""
        self.operations_count += 1

        memory_node = MemoryNode(
            node_id=f"tool_context:{execution_id}",
            memory_type=MemoryType.TOOL_CONTEXT,
            content={
                "tool_name": tool_name,
                "execution_id": execution_id,
                "context_data": context_data,
                "user_id": user_id,
            },
            metadata={
                "tool_name": tool_name,
                "user_id": user_id,
                "execution_timestamp": time.time(),
            },
        )

        # Store in Neo4j
        await self.neo4j_store.store_memory_node(memory_node)

        # Create embedding and store in Qdrant
        context_text = f"{tool_name} execution: {json.dumps(context_data)}"
        embedding = self.embedding_function(context_text)

        await self.vector_store.store_embedding(
            memory_id=memory_node.node_id,
            embedding=embedding,
            metadata=memory_node.metadata,
        )

        return memory_node.node_id

    async def store_conversation_context(
        self,
        session_id: str,
        user_id: str,
        message_content: str,
        message_role: str = "user",
    ) -> str:
        """Store conversation context."""
        self.operations_count += 1

        memory_node = MemoryNode(
            node_id=f"conversation:{session_id}:{int(time.time())}",
            memory_type=MemoryType.CONVERSATIONAL,
            content={
                "session_id": session_id,
                "user_id": user_id,
                "message_content": message_content,
                "message_role": message_role,
            },
            metadata={
                "session_id": session_id,
                "user_id": user_id,
                "message_role": message_role,
            },
        )

        # Store in Neo4j
        await self.neo4j_store.store_memory_node(memory_node)

        # Create embedding for semantic search
        embedding = self.embedding_function(message_content)

        await self.vector_store.store_embedding(
            memory_id=memory_node.node_id,
            embedding=embedding,
            metadata=memory_node.metadata,
        )

        return memory_node.node_id

    async def retrieve_similar_contexts(
        self,
        query_text: str,
        context_type: MemoryType | None = None,
        user_id: str | None = None,
        limit: int = 5,
    ) -> list[MemoryNode]:
        """Retrieve contextually similar memories."""
        self.operations_count += 1

        # Create query embedding
        query_embedding = self.embedding_function(query_text)

        # Search in Qdrant
        filter_conditions = {}
        if context_type:
            filter_conditions["memory_type"] = context_type.value
        if user_id:
            filter_conditions["user_id"] = user_id

        similar_results = await self.vector_store.search_similar(
            query_vector=query_embedding,
            limit=limit,
            filter_conditions=filter_conditions,
        )

        # Retrieve full memory nodes from Neo4j
        memories = []
        for result in similar_results:
            memory_node = await self.neo4j_store.get_memory_node(result["memory_id"])
            if memory_node:
                memories.append(memory_node)

        return memories

    async def store_session_context(
        self,
        session_id: str,
        context_data: dict[str, Any],
        expires_in_minutes: int | None = 60,
    ) -> None:
        """Store session-scoped context."""
        expires_at = None
        if expires_in_minutes:
            expires_at = time.time() + (expires_in_minutes * 60)

        context_store = ContextStore(
            context_id=session_id,
            scope=ContextScope.SESSION,
            data=context_data,
            expires_at=expires_at,
        )

        self.context_cache[session_id] = context_store

    async def get_session_context(self, session_id: str) -> dict[str, Any] | None:
        """Retrieve session-scoped context."""
        context_store = self.context_cache.get(session_id)

        if not context_store:
            self.cache_misses += 1
            return None

        if context_store.is_expired:
            del self.context_cache[session_id]
            self.cache_misses += 1
            return None

        self.cache_hits += 1
        return context_store.data

    async def create_tool_relationship(
        self,
        from_tool_execution: str,
        to_tool_execution: str,
        relationship_type: str = "TRIGGERS",
        properties: dict[str, Any] | None = None,
    ) -> None:
        """Create relationship between tool executions."""
        await self.neo4j_store.create_relationship(
            from_node_id=f"tool_context:{from_tool_execution}",
            to_node_id=f"tool_context:{to_tool_execution}",
            relationship_type=relationship_type,
            properties=properties,
        )

    async def get_tool_execution_history(
        self,
        tool_name: str,
        user_id: str | None = None,
        limit: int = 10,
    ) -> list[MemoryNode]:
        """Get execution history for a specific tool."""
        # Create a temporary query node to find related tool executions
        query_text = f"tool execution history for {tool_name}"

        filter_conditions = {"tool_name": tool_name}
        if user_id:
            filter_conditions["user_id"] = user_id

        query_embedding = self.embedding_function(query_text)

        similar_results = await self.vector_store.search_similar(
            query_vector=query_embedding,
            limit=limit,
            filter_conditions=filter_conditions,
        )

        memories = []
        for result in similar_results:
            memory_node = await self.neo4j_store.get_memory_node(result["memory_id"])
            if memory_node and memory_node.memory_type == MemoryType.TOOL_CONTEXT:
                memories.append(memory_node)

        return memories

    async def cleanup_expired_contexts(self) -> int:
        """Clean up expired contexts from cache."""
        expired_keys = []
        for key, context in self.context_cache.items():
            if context.is_expired:
                expired_keys.append(key)

        for key in expired_keys:
            del self.context_cache[key]

        logger.info(f"Cleaned up {len(expired_keys)} expired contexts")
        return len(expired_keys)

    async def get_memory_statistics(self) -> dict[str, Any]:
        """Get comprehensive memory statistics."""
        neo4j_stats = await self.neo4j_store.get_memory_stats()
        qdrant_stats = await self.vector_store.get_vector_stats()

        return {
            "graph_storage": neo4j_stats,
            "vector_storage": qdrant_stats,
            "bridge_stats": {
                "operations_count": self.operations_count,
                "cache_hits": self.cache_hits,
                "cache_misses": self.cache_misses,
                "cache_hit_rate": (
                    self.cache_hits / (self.cache_hits + self.cache_misses)
                    if (self.cache_hits + self.cache_misses) > 0
                    else 0
                ),
                "active_contexts": len(self.context_cache),
            },
        }

    async def health_check(self) -> dict[str, Any]:
        """Perform health check on memory systems."""
        health_status = {
            "status": "healthy",
            "neo4j_healthy": False,
            "qdrant_healthy": False,
            "errors": [],
        }

        # Test Neo4j
        try:
            await self.neo4j_store.get_memory_stats()
            health_status["neo4j_healthy"] = True
        except Exception as e:
            health_status["errors"].append(f"Neo4j error: {str(e)}")

        # Test Qdrant
        try:
            await self.vector_store.get_vector_stats()
            health_status["qdrant_healthy"] = True
        except Exception as e:
            health_status["errors"].append(f"Qdrant error: {str(e)}")

        # Overall health
        if not (health_status["neo4j_healthy"] and health_status["qdrant_healthy"]):
            health_status["status"] = "unhealthy"

        return health_status
