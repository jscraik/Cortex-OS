"""
Mem0 Integration for Cortex OS Enhanced Memory System
Phase 3: Advanced Memory Capabilities
"""

import json
import os
import tempfile
from typing import Any, Dict, List

from mem0 import Memory


class CortexMem0Integration:
    """Enhanced memory integration using Mem0 library."""

    def __init__(self, config_path: str = None):
        """Initialize Mem0 integration with Cortex OS configuration."""
        self.config = self._load_config(config_path)
        self.memory = self._initialize_memory()

    def _load_config(self, config_path: str = None) -> Dict[str, Any]:
        """Load Mem0 configuration from JSON file."""
        if config_path is None:
            config_path = os.path.join(os.path.dirname(__file__), "config.json")

        with open(config_path, "r") as f:
            return json.load(f)

    def _initialize_memory(self) -> Memory:
        """Initialize Mem0 with Cortex OS storage configuration."""

        # Resolve storage paths to be test-friendly. Allow overrides via env vars
        def _resolve_path(configured_path: str, env_var: str) -> str:
            # 1) env var override
            env_val = os.environ.get(env_var)
            if env_val:
                return env_val

            # 2) avoid attempting to create macOS /Volumes mounts in CI or on machines
            try:
                # If configured path points to /Volumes or parent dir is not writable,
                # fall back to a workspace-local tmp directory so tests don't require external volumes.
                parent = os.path.dirname(configured_path) or os.getcwd()
                if configured_path.startswith("/Volumes") or not os.access(
                    parent, os.W_OK
                ):
                    fallback_base = os.path.join(os.getcwd(), "tmp", "mem0")
                    os.makedirs(fallback_base, exist_ok=True)
                    return os.path.join(
                        fallback_base, os.path.basename(configured_path).lstrip("/")
                    )
            except Exception:
                # On any issue, use a system temp directory
                return os.path.join(
                    tempfile.gettempdir(),
                    "cortex_mem0",
                    os.path.basename(configured_path).lstrip("/"),
                )

            # 3) default to configured path
            return configured_path

        ssd_path = _resolve_path(self.config["storage"]["ssd_path"], "MEM0_SSD_PATH")
        hdd_path = _resolve_path(self.config["storage"]["hdd_path"], "MEM0_HDD_PATH")

        # Ensure storage directories exist
        os.makedirs(ssd_path, exist_ok=True)
        os.makedirs(hdd_path, exist_ok=True)

        # Configure Mem0 with external storage
        memory_config = {
            "vector_store": {
                "provider": "chroma",
                "config": {"path": ssd_path, "collection_name": "cortex_memories"},
            },
            "embedder": {
                "provider": "sentence_transformers",
                "config": {"model": "all-MiniLM-L6-v2"},
            },
            "version": self.config["version"],
        }

        return Memory.from_config(memory_config)

    def add_memory(self, data: str, user_id: str = "cortex_system") -> str:
        """Add a memory to the Mem0 system."""
        return self.memory.add(data, user_id=user_id)

    def search_memories(
        self, query: str, user_id: str = "cortex_system", limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Search memories using semantic similarity."""
        return self.memory.search(query, user_id=user_id, limit=limit)

    def get_all_memories(self, user_id: str = "cortex_system") -> List[Dict[str, Any]]:
        """Get all memories for a user."""
        return self.memory.get_all(user_id=user_id)

    def update_memory(self, memory_id: str, data: str) -> str:
        """Update an existing memory."""
        return self.memory.update(memory_id, data)

    def delete_memory(self, memory_id: str) -> bool:
        """Delete a memory by ID."""
        return self.memory.delete(memory_id)

    def get_stats(self) -> Dict[str, Any]:
        """Get memory system statistics."""
        return {
            "total_memories": len(self.memory.get_all()),
            "storage_path": ssd_path,
            "cache_path": hdd_path,
            "version": self.config["version"],
        }


# Example usage
if __name__ == "__main__":
    # Initialize Cortex Mem0 integration
    cortex_mem0 = CortexMem0Integration()

    # Add a sample memory
    memory_id = cortex_mem0.add_memory(
        "User completed Phase 3 Mem0 integration successfully"
    )
    print(f"Added memory: {memory_id}")

    # Search for memories
    results = cortex_mem0.search_memories("Phase 3 integration")
    print(f"Search results: {results}")

    # Get statistics
    stats = cortex_mem0.get_stats()
    print(f"Memory stats: {stats}")
