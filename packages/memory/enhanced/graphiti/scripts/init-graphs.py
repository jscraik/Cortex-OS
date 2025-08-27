#!/usr/bin/env python3
"""
Initialize default knowledge graphs for Cortex OS
Phase 4: Graphiti Integration
"""

import asyncio
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from cortex_graphiti_integration import CortexGraphitiIntegration

async def initialize_graphs():
    """Initialize default knowledge graphs."""
    print("🚀 Initializing Cortex OS knowledge graphs...")
    
    integration = CortexGraphitiIntegration()
    
    try:
        # Main Cortex graph
        cortex_main = await integration.create_knowledge_graph(
            "cortex_main",
            "Main Cortex OS knowledge graph for system entities and relationships"
        )
        print(f"✅ Created cortex_main graph: {cortex_main}")
        
        # User interactions graph
        user_interactions = await integration.create_knowledge_graph(
            "user_interactions",
            "User interaction patterns and behavior analysis"
        )
        print(f"✅ Created user_interactions graph: {user_interactions}")
        
        # System memory graph
        system_memory = await integration.create_knowledge_graph(
            "system_memory",
            "System memory and performance tracking"
        )
        print(f"✅ Created system_memory graph: {system_memory}")
        
        # Add some initial entities
        await setup_initial_entities(integration, cortex_main)
        
        print("🎉 Knowledge graphs initialized successfully!")
        
        return {
            "cortex_main": cortex_main,
            "user_interactions": user_interactions,
            "system_memory": system_memory
        }
        
    except Exception as e:
        print(f"❌ Failed to initialize graphs: {e}")
        return None
    finally:
        integration.close()

async def setup_initial_entities(integration, graph_id):
    """Setup initial system entities."""
    print("🏗️  Setting up initial entities...")
    
    # Core system entity
    system_id = await integration.add_entity(graph_id, {
        'name': 'Cortex OS',
        'type': 'system',
        'properties': {
            'version': '4.0.0',
            'phase': 'Phase 4 - Graphiti Integration',
            'features': ['mem0', 'graphiti', 'external_storage']
        }
    })
    
    # Memory system entity
    memory_id = await integration.add_entity(graph_id, {
        'name': 'Enhanced Memory System',
        'type': 'subsystem',
        'properties': {
            'components': ['mem0', 'graphiti', 'letta'],
            'storage': ['ssd', 'hdd'],
            'status': 'active'
        }
    })
    
    # Create relationship
    await integration.add_relationship(
        graph_id,
        system_id,
        memory_id,
        'CONTAINS',
        {'relationship_type': 'composition'}
    )
    
    print("✅ Initial entities setup complete")

if __name__ == "__main__":
    result = asyncio.run(initialize_graphs())
    if result:
        print(f"📄 Graph IDs: {result}")
    else:
        print("❌ Initialization failed")
        sys.exit(1)
