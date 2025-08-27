"""
Letta Integration for Cortex OS Enhanced Memory System
Phase 5: Persistent Memory and Context Management
"""

import asyncio
import json
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

try:
    import lz4.frame
    import redis.asyncio as redis
    import sqlalchemy as sa
    import zstandard as zstd
    from letta import LettaClient, create_client
    from letta.schemas.memory import ArchivalMemory, ChatMemory
    from letta.schemas.message import Message
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

    LETTA_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Letta dependencies not installed: {e}")
    print("Run: pip install -r requirements-letta.txt")
    LETTA_AVAILABLE = False

    # Mock objects for graceful degradation
    class MockClient:
        pass

    LettaClient = MockClient
    zstd = None


class CortexLettaIntegration:
    """Enhanced persistent memory integration using Letta library."""

    def __init__(self, config_path: Optional[str] = None):
        """Initialize Letta integration with Cortex OS configuration."""
        self.config = self._load_config(config_path)
        self.client: Optional[LettaClient] = None
        self.db_engine = None
        self.redis_client = None

        # Only initialize compression if zstd is available
        if LETTA_AVAILABLE and zstd is not None:
            self.compressor = zstd.ZstdCompressor(level=3)
            self.decompressor = zstd.ZstdDecompressor()
        else:
            self.compressor = None
            self.decompressor = None

        if LETTA_AVAILABLE:
            asyncio.create_task(self._initialize_letta())

    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load Letta configuration from JSON file."""
        if config_path is None:
            config_path = os.path.join(os.path.dirname(__file__), "config.json")

        with open(config_path, "r") as f:
            return json.load(f)

    async def _initialize_letta(self) -> None:
        """Initialize Letta with Cortex OS storage configuration."""
        try:
            # Ensure storage directories exist
            os.makedirs(self.config["storage"]["ssd_memory_path"], exist_ok=True)
            os.makedirs(self.config["storage"]["hdd_context_path"], exist_ok=True)

            # Initialize database engine
            self.db_engine = create_async_engine(
                self.config["storage"]["database_url"], echo=False, pool_size=10
            )

            # Initialize Redis for caching
            self.redis_client = redis.from_url(
                "redis://localhost:6379/0", decode_responses=True
            )

            # Initialize Letta client
            self.client = create_client(
                base_url="http://localhost:8283", token="cortex_letta_token"
            )

            print("✅ Letta initialized successfully")

        except Exception as e:
            print(f"⚠️  Letta initialization failed: {e}")
            print("Note: Ensure Letta server and PostgreSQL are running")

    async def create_memory_agent(self, name: str, system_prompt: str = None) -> str:
        """Create a new memory agent with persistent storage."""
        if not self.client:
            raise RuntimeError("Letta client not initialized")

        agent = await self.client.create_agent(
            name=name,
            system=system_prompt
            or "You are a helpful assistant with persistent memory.",
            memory_type="chat",
            llm_config="gpt-4",
            embedding_config="text-embedding-ada-002",
        )

        print(f"🤖 Created memory agent: {name} (ID: {agent.id})")
        return agent.id

    async def store_persistent_memory(
        self, agent_id: str, content: str, metadata: Dict[str, Any] = None
    ) -> str:
        """Store content in persistent memory with compression."""
        if not self.client:
            raise RuntimeError("Letta client not initialized")

        # Compress content for efficient storage
        compressed_content = self.compressor.compress(content.encode("utf-8"))

        # Store in archival memory
        memory_id = await self.client.insert_archival_memory(
            agent_id=agent_id, content=content, metadata=metadata or {}
        )

        # Cache compressed version
        if self.redis_client:
            cache_key = f"memory:{agent_id}:{memory_id}"
            await self.redis_client.setex(
                cache_key, timedelta(hours=24).total_seconds(), compressed_content
            )

        print(f"💾 Stored persistent memory: {memory_id}")
        return memory_id

    async def retrieve_memory(
        self, agent_id: str, query: str, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Retrieve memories using semantic search."""
        if not self.client:
            raise RuntimeError("Letta client not initialized")

        # Search archival memory
        memories = await self.client.get_archival_memory(
            agent_id=agent_id, query=query, limit=limit
        )

        return [
            {
                "id": memory.id,
                "content": memory.content,
                "metadata": memory.metadata,
                "created_at": memory.created_at,
                "relevance_score": getattr(memory, "score", 0.0),
            }
            for memory in memories
        ]

    async def update_context_window(self, agent_id: str, context: str) -> None:
        """Update the agent's context window."""
        if not self.client:
            raise RuntimeError("Letta client not initialized")

        # Get current context
        agent = await self.client.get_agent(agent_id)

        # Update chat memory
        await self.client.update_agent(
            agent_id=agent_id,
            memory=ChatMemory(
                human=context, persona=agent.memory.persona if agent.memory else ""
            ),
        )

        print(f"🔄 Updated context window for agent: {agent_id}")

    async def compress_old_memories(self, agent_id: str, days_old: int = 30) -> int:
        """Compress memories older than specified days."""
        if not self.client:
            raise RuntimeError("Letta client not initialized")

        cutoff_date = datetime.now() - timedelta(days=days_old)

        # Get old memories
        all_memories = await self.client.get_archival_memory(
            agent_id=agent_id, limit=1000
        )

        compressed_count = 0

        for memory in all_memories:
            if memory.created_at < cutoff_date:
                # Compress and move to long-term storage
                compressed_content = self.compressor.compress(
                    memory.content.encode("utf-8")
                )

                # Store in HDD path
                storage_path = os.path.join(
                    self.config["storage"]["hdd_context_path"],
                    f"compressed_{memory.id}.zst",
                )

                with open(storage_path, "wb") as f:
                    f.write(compressed_content)

                compressed_count += 1

        print(f"🗜️  Compressed {compressed_count} old memories")
        return compressed_count

    async def sync_with_mem0(
        self, agent_id: str, mem0_memories: List[Dict[str, Any]]
    ) -> int:
        """Sync Mem0 memories into Letta persistent storage."""
        if not self.client:
            raise RuntimeError("Letta client not initialized")

        synced_count = 0

        for memory in mem0_memories:
            await self.store_persistent_memory(
                agent_id=agent_id,
                content=memory.get("data", ""),
                metadata={
                    "source": "mem0",
                    "mem0_id": memory.get("id"),
                    "user_id": memory.get("user_id"),
                    "original_created_at": memory.get("created_at"),
                },
            )
            synced_count += 1

        print(f"🔄 Synced {synced_count} memories from Mem0")
        return synced_count

    async def sync_with_graphiti(
        self, agent_id: str, graph_entities: List[Dict[str, Any]]
    ) -> int:
        """Sync Graphiti entities into Letta knowledge base."""
        if not self.client:
            raise RuntimeError("Letta client not initialized")

        synced_count = 0

        for entity in graph_entities:
            entity_description = (
                f"Entity: {entity.get('name')} (Type: {entity.get('type')})"
            )
            if entity.get("properties"):
                entity_description += f" Properties: {entity['properties']}"

            await self.store_persistent_memory(
                agent_id=agent_id,
                content=entity_description,
                metadata={
                    "source": "graphiti",
                    "entity_id": entity.get("id"),
                    "entity_type": entity.get("type"),
                    "graph_id": entity.get("graph_id"),
                },
            )
            synced_count += 1

        print(f"🔄 Synced {synced_count} entities from Graphiti")
        return synced_count

    async def get_agent_stats(self, agent_id: str) -> Dict[str, Any]:
        """Get comprehensive statistics for a memory agent."""
        if not self.client:
            raise RuntimeError("Letta client not initialized")

        agent = await self.client.get_agent(agent_id)
        memories = await self.client.get_archival_memory(agent_id=agent_id, limit=10000)

        return {
            "agent_id": agent_id,
            "agent_name": agent.name,
            "total_memories": len(memories),
            "context_window_size": self.config["performance"]["context_window_size"],
            "memory_retention_days": self.config["performance"][
                "memory_retention_days"
            ],
            "storage_path": self.config["storage"]["ssd_memory_path"],
            "cache_path": self.config["storage"]["hdd_context_path"],
            "version": self.config["version"],
        }

    async def close(self):
        """Close connections and cleanup."""
        if self.redis_client:
            await self.redis_client.close()

        if self.db_engine:
            await self.db_engine.dispose()

        # Letta client cleanup handled automatically


# Example usage
async def main():
    # Initialize Cortex Letta integration
    cortex_letta = CortexLettaIntegration()

    try:
        # Create a sample memory agent
        agent_id = await cortex_letta.create_memory_agent(
            "cortex_main_agent",
            "You are the main memory agent for Cortex OS with persistent memory capabilities.",
        )

        # Store sample persistent memory
        memory_id = await cortex_letta.store_persistent_memory(
            agent_id,
            "Phase 5 Letta integration completed successfully with persistent memory storage",
            {"phase": 5, "integration": "letta"},
        )

        # Retrieve memories
        memories = await cortex_letta.retrieve_memory(agent_id, "Phase 5 integration")
        print(f"Retrieved memories: {len(memories)}")

        # Get statistics
        stats = await cortex_letta.get_agent_stats(agent_id)
        print(f"Agent stats: {stats}")

    except Exception as e:
        print(f"Error in main: {e}")
    finally:
        await cortex_letta.close()


if __name__ == "__main__":
    asyncio.run(main())
