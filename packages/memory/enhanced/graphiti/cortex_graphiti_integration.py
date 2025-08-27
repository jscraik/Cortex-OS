"""
Graphiti Integration for Cortex OS Enhanced Memory System
Phase 4: Advanced Knowledge Graph Capabilities
"""

import os
import json
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from pathlib import Path

try:
    from graphiti import Graphiti
    from graphiti.nodes import EntityNode, MemoryNode
    from graphiti.edges import RelationshipEdge
    import networkx as nx
    from neo4j import GraphDatabase
except ImportError as e:
    print(f"Warning: Graphiti dependencies not installed: {e}")
    print("Run: pip install -r requirements-graphiti.txt")

class CortexGraphitiIntegration:
    """Enhanced knowledge graph integration using Graphiti library."""
    
    def __init__(self, config_path: str = None):
        """Initialize Graphiti integration with Cortex OS configuration."""
        self.config = self._load_config(config_path)
        self.graphiti = None
        self.neo4j_driver = None
        self._initialize_graphiti()
        
    def _load_config(self, config_path: str = None) -> Dict[str, Any]:
        """Load Graphiti configuration from JSON file."""
        if config_path is None:
            config_path = os.path.join(
                os.path.dirname(__file__), 
                'config.json'
            )
        
        with open(config_path, 'r') as f:
            return json.load(f)
    
    def _initialize_graphiti(self) -> None:
        """Initialize Graphiti with Cortex OS storage configuration."""
        try:
            # Ensure storage directories exist
            os.makedirs(self.config['storage']['ssd_graph_path'], exist_ok=True)
            os.makedirs(self.config['storage']['hdd_index_path'], exist_ok=True)
            
            # Initialize Neo4j driver
            self.neo4j_driver = GraphDatabase.driver(
                self.config['storage']['database_url'],
                auth=("neo4j", "cortex_graphiti_2025")
            )
            
            # Initialize Graphiti
            self.graphiti = Graphiti(
                graph_db_uri=self.config['storage']['database_url'],
                graph_db_user="neo4j",
                graph_db_password="cortex_graphiti_2025"
            )
            
            print("✅ Graphiti initialized successfully")
            
        except Exception as e:
            print(f"⚠️  Graphiti initialization failed: {e}")
            print("Note: Ensure Neo4j is running and accessible")
    
    async def create_knowledge_graph(self, name: str, description: str) -> str:
        """Create a new knowledge graph."""
        if not self.graphiti:
            raise RuntimeError("Graphiti not initialized")
        
        graph_id = await self.graphiti.create_graph(
            name=name,
            description=description
        )
        
        print(f"📊 Created knowledge graph: {name} (ID: {graph_id})")
        return graph_id
    
    async def add_entity(self, graph_id: str, entity_data: Dict[str, Any]) -> str:
        """Add an entity to a knowledge graph."""
        if not self.graphiti:
            raise RuntimeError("Graphiti not initialized")
        
        entity = EntityNode(
            name=entity_data.get('name'),
            entity_type=entity_data.get('type', 'generic'),
            properties=entity_data.get('properties', {})
        )
        
        entity_id = await self.graphiti.add_node(graph_id, entity)
        print(f"🏷️  Added entity: {entity.name} (ID: {entity_id})")
        return entity_id
    
    async def add_relationship(self, graph_id: str, from_entity: str, to_entity: str, 
                             relationship_type: str, properties: Dict[str, Any] = None) -> str:
        """Add a relationship between entities."""
        if not self.graphiti:
            raise RuntimeError("Graphiti not initialized")
        
        relationship = RelationshipEdge(
            relationship_type=relationship_type,
            properties=properties or {},
            created_at=datetime.now()
        )
        
        edge_id = await self.graphiti.add_edge(
            graph_id, 
            from_entity, 
            to_entity, 
            relationship
        )
        
        print(f"🔗 Added relationship: {from_entity} -> {to_entity} ({relationship_type})")
        return edge_id
    
    async def query_graph(self, graph_id: str, query: str) -> List[Dict[str, Any]]:
        """Query the knowledge graph using Cypher or natural language."""
        if not self.graphiti:
            raise RuntimeError("Graphiti not initialized")
        
        results = await self.graphiti.query(graph_id, query)
        return results
    
    async def get_entity_relationships(self, graph_id: str, entity_id: str) -> List[Dict[str, Any]]:
        """Get all relationships for a specific entity."""
        if not self.graphiti:
            raise RuntimeError("Graphiti not initialized")
        
        relationships = await self.graphiti.get_relationships(graph_id, entity_id)
        return relationships
    
    async def integrate_with_mem0(self, mem0_memories: List[Dict[str, Any]], graph_id: str) -> int:
        """Integrate Mem0 memories into knowledge graph."""
        if not self.graphiti:
            raise RuntimeError("Graphiti not initialized")
        
        entities_created = 0
        
        for memory in mem0_memories:
            # Extract entities from memory data
            entities = self._extract_entities_from_memory(memory)
            
            for entity_data in entities:
                entity_id = await self.add_entity(graph_id, entity_data)
                entities_created += 1
                
                # Link to memory node
                memory_node = MemoryNode(
                    content=memory.get('data', ''),
                    source='mem0',
                    created_at=memory.get('created_at', datetime.now())
                )
                
                memory_id = await self.graphiti.add_node(graph_id, memory_node)
                await self.add_relationship(
                    graph_id, 
                    entity_id, 
                    memory_id, 
                    'EXTRACTED_FROM'
                )
        
        print(f"🔗 Integrated {entities_created} entities from Mem0 memories")
        return entities_created
    
    def _extract_entities_from_memory(self, memory: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract entities from memory data using NLP."""
        # Simplified entity extraction - in practice, use NER models
        content = memory.get('data', '')
        entities = []
        
        # Basic entity patterns (replace with proper NER)
        import re
        
        # Extract potential entities (capitalized words)
        potential_entities = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', content)
        
        for entity in potential_entities:
            entities.append({
                'name': entity,
                'type': 'extracted',
                'properties': {
                    'source_memory': memory.get('id'),
                    'confidence': 0.7,
                    'extraction_method': 'regex_pattern'
                }
            })
        
        return entities
    
    async def get_graph_stats(self, graph_id: str) -> Dict[str, Any]:
        """Get statistics for a knowledge graph."""
        if not self.graphiti:
            raise RuntimeError("Graphiti not initialized")
        
        stats = await self.graphiti.get_graph_stats(graph_id)
        
        return {
            'nodes': stats.get('node_count', 0),
            'edges': stats.get('edge_count', 0),
            'storage_path': self.config['storage']['ssd_graph_path'],
            'index_path': self.config['storage']['hdd_index_path'],
            'version': self.config['version']
        }
    
    def close(self):
        """Close connections and cleanup."""
        if self.neo4j_driver:
            self.neo4j_driver.close()
        
        if self.graphiti:
            # Cleanup Graphiti resources
            pass

# Example usage
async def main():
    # Initialize Cortex Graphiti integration
    cortex_graphiti = CortexGraphitiIntegration()
    
    try:
        # Create a sample knowledge graph
        graph_id = await cortex_graphiti.create_knowledge_graph(
            "cortex_main", 
            "Main Cortex OS knowledge graph"
        )
        
        # Add sample entities
        user_id = await cortex_graphiti.add_entity(graph_id, {
            'name': 'Cortex User',
            'type': 'person',
            'properties': {'role': 'system_user'}
        })
        
        system_id = await cortex_graphiti.add_entity(graph_id, {
            'name': 'Cortex OS',
            'type': 'system',
            'properties': {'version': '4.0.0'}
        })
        
        # Add relationship
        await cortex_graphiti.add_relationship(
            graph_id, 
            user_id, 
            system_id, 
            'INTERACTS_WITH'
        )
        
        # Get statistics
        stats = await cortex_graphiti.get_graph_stats(graph_id)
        print(f"Graph stats: {stats}")
        
    except Exception as e:
        print(f"Error in main: {e}")
    finally:
        cortex_graphiti.close()

if __name__ == "__main__":
    asyncio.run(main())
