#!/usr/bin/env node
/* eslint-disable no-console */
// tools/graphiti-integration-phase4.ts
// Phase 4: Graphiti Integration for Enhanced Memory System

import * as fs from 'fs';
import * as path from 'path';

interface GraphitiConfig {
  version: string;
  enabled: boolean;
  storage: {
    ssd_graph_path: string;
    hdd_index_path: string;
    database_url: string;
  };
  features: {
    knowledge_graphs: boolean;
    entity_extraction: boolean;
    relationship_mapping: boolean;
    temporal_graphs: boolean;
  };
  performance: {
    max_nodes: number;
    max_edges: number;
    index_type: string;
    cache_size: number;
  };
  integration: {
    mem0_bridge: boolean;
    cortex_memory_sync: boolean;
  };
}

interface GraphitiIntegration {
  timestamp: string;
  phase: string;
  installation: {
    package: string;
    version: string;
    dependencies: string[];
  };
  configuration: GraphitiConfig;
  integrationFiles: string[];
  bridgeFiles: string[];
  testFiles: string[];
  knowledgeGraphs: {
    cortex_main: string;
    user_interactions: string;
    system_memory: string;
  };
}

interface StorageConfig {
  devices?: Array<{
    name: string;
    path: string;
    type: string;
  }>;
}

class GraphitiIntegrator {
  private workspaceRoot: string;
  private storageConfig: StorageConfig;

  constructor() {
    this.workspaceRoot = process.cwd();
    this.storageConfig = {};
    this.loadStorageConfig();
  }

  private loadStorageConfig(): void {
    try {
      const configPath = path.join(this.workspaceRoot, 'cortex-memories', 'storage-config.json');
      const configData = fs.readFileSync(configPath, 'utf-8');
      this.storageConfig = JSON.parse(configData);
      console.log('📊 Loaded storage configuration from Phase 2');
    } catch (error) {
      console.error('❌ Failed to load storage config:', error);
      process.exit(1);
    }
  }

  public async integrateGraphiti(): Promise<GraphitiIntegration> {
    console.log('🚀 Starting Phase 4: Graphiti Integration');

    // Install Graphiti package
    await this.installGraphitiPackage();

    // Create Graphiti configuration
    const graphitiConfig = this.createGraphitiConfig();

    // Create integration files
    const integrationFiles = await this.createIntegrationFiles(graphitiConfig);

    // Create TypeScript bridge files
    const bridgeFiles = await this.createBridgeFiles(graphitiConfig);

    // Create test files
    const testFiles = await this.createTestFiles(graphitiConfig);

    // Setup knowledge graphs
    const knowledgeGraphs = await this.setupKnowledgeGraphs(graphitiConfig);

    const integration: GraphitiIntegration = {
      timestamp: new Date().toISOString(),
      phase: 'Phase 4: Graphiti Integration',
      installation: {
        package: 'graphiti-core',
        version: 'latest',
        dependencies: ['networkx', 'neo4j', 'rdflib', 'sparqlwrapper'],
      },
      configuration: graphitiConfig,
      integrationFiles,
      bridgeFiles,
      testFiles,
      knowledgeGraphs,
    };

    // Save integration report
    const reportPath = path.join(this.workspaceRoot, 'phase4-graphiti-integration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(integration, null, 2));

    console.log('✅ Phase 4 Graphiti integration complete!');
    console.log(`📄 Report saved to: ${reportPath}`);

    return integration;
  }

  private async installGraphitiPackage(): Promise<void> {
    console.log('📦 Setting up Graphiti package installation...');

    // Create Python requirements file for Graphiti
    const requirementsContent = `# Graphiti Knowledge Graph Dependencies
# Phase 4: Graphiti Integration

# Core Graphiti library
graphiti-core>=0.3.0

# Graph databases and processing
networkx>=3.0
neo4j>=5.0.0
rdflib>=6.3.0
sparqlwrapper>=2.0.0

# Machine learning for graph analysis
scikit-learn>=1.3.0
torch>=2.0.0
transformers>=4.30.0

# Data processing and utilities
pandas>=2.0.0
numpy>=1.24.0
python-dateutil>=2.8.0

# Async and performance
asyncio-extras>=1.3.0
uvloop>=0.17.0

# Visualization (optional)
matplotlib>=3.7.0
plotly>=5.15.0
`;

    const reqPath = path.join(this.workspaceRoot, 'requirements-graphiti.txt');
    fs.writeFileSync(reqPath, requirementsContent);
    console.log(`  📄 Created: ${reqPath}`);

    // Create package.json additions for TypeScript integration
    const packageAdditions = {
      devDependencies: {
        '@types/node': '^20.0.0',
        typescript: '^5.0.0',
        'neo4j-driver': '^5.0.0',
      },
      scripts: {
        'graphiti:install': 'pip install -r requirements-graphiti.txt',
        'graphiti:test': 'python -m pytest cortex-memories/graphiti/tests/',
        'graphiti:bridge:test': 'vitest cortex-memories/graphiti/bridge/',
        'graphiti:graph:init': 'python cortex-memories/graphiti/scripts/init-graphs.py',
      },
    };

    const additionsPath = path.join(this.workspaceRoot, 'package-graphiti-additions.json');
    fs.writeFileSync(additionsPath, JSON.stringify(packageAdditions, null, 2));
    console.log(`  📄 Created: ${additionsPath}`);
  }

  private createGraphitiConfig(): GraphitiConfig {
    console.log('⚙️  Creating Graphiti configuration...');

    // Get storage paths from Phase 2
    const ssdPath = '/Volumes/ExternalSSD'; // From storage config
    const hddPath = '/Volumes/ExternalHDD'; // From storage config

    const config: GraphitiConfig = {
      version: '4.0.0',
      enabled: true,
      storage: {
        ssd_graph_path: `${ssdPath}/cortex-data/graphiti`,
        hdd_index_path: `${hddPath}/cortex-cache/graphiti`,
        database_url: `bolt://localhost:7687`, // Neo4j default
      },
      features: {
        knowledge_graphs: true,
        entity_extraction: true,
        relationship_mapping: true,
        temporal_graphs: true,
      },
      performance: {
        max_nodes: 100000,
        max_edges: 500000,
        index_type: 'BTREE',
        cache_size: 2048,
      },
      integration: {
        mem0_bridge: true,
        cortex_memory_sync: true,
      },
    };

    return config;
  }

  private async createIntegrationFiles(config: GraphitiConfig): Promise<string[]> {
    console.log('📝 Creating Graphiti integration files...');

    const files: string[] = [];

    // Create Graphiti directory structure
    const graphitiDir = path.join(this.workspaceRoot, 'cortex-memories', 'graphiti');
    if (!fs.existsSync(graphitiDir)) {
      fs.mkdirSync(graphitiDir, { recursive: true });
    }

    // 1. Graphiti configuration file
    const configPath = path.join(graphitiDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    files.push(configPath);

    // 2. Python Graphiti integration
    const pythonIntegration = `"""
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
        potential_entities = re.findall(r'\\b[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\b', content)
        
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
`;

    const pythonPath = path.join(graphitiDir, 'cortex_graphiti_integration.py');
    fs.writeFileSync(pythonPath, pythonIntegration);
    files.push(pythonPath);

    console.log(`  ✅ Created ${files.length} integration files`);
    return files;
  }

  private async createBridgeFiles(_config: GraphitiConfig): Promise<string[]> {
    console.log('🌉 Creating TypeScript bridge files...');

    const files: string[] = [];
    const bridgeDir = path.join(this.workspaceRoot, 'cortex-memories', 'graphiti', 'bridge');

    if (!fs.existsSync(bridgeDir)) {
      fs.mkdirSync(bridgeDir, { recursive: true });
    }

    // TypeScript bridge for Graphiti integration
    const tsBridge = `/**
 * TypeScript Bridge for Graphiti Integration
 * Phase 4: Advanced Knowledge Graph Capabilities
 */

import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

export interface GraphitiEntity {
  id: string;
  name: string;
  type: string;
  properties: Record<string, any>;
  created_at: string;
}

export interface GraphitiRelationship {
  id: string;
  from_entity: string;
  to_entity: string;
  relationship_type: string;
  properties: Record<string, any>;
  created_at: string;
}

export interface GraphitiGraph {
  id: string;
  name: string;
  description: string;
  node_count: number;
  edge_count: number;
  created_at: string;
}

export interface GraphitiStats {
  nodes: number;
  edges: number;
  storage_path: string;
  index_path: string;
  version: string;
}

export class CortexGraphitiBridge {
  private pythonPath: string;
  private scriptPath: string;
  
  constructor() {
    this.pythonPath = 'python3'; // Default Python path
    this.scriptPath = path.join(__dirname, '..', 'cortex_graphiti_integration.py');
  }
  
  /**
   * Create a new knowledge graph
   */
  async createKnowledgeGraph(name: string, description: string): Promise<string> {
    const result = await this.executePython('create_knowledge_graph', { 
      name, 
      description 
    });
    return result.graph_id;
  }
  
  /**
   * Add an entity to a knowledge graph
   */
  async addEntity(graphId: string, entityData: Partial<GraphitiEntity>): Promise<string> {
    const result = await this.executePython('add_entity', { 
      graph_id: graphId, 
      entity_data: entityData 
    });
    return result.entity_id;
  }
  
  /**
   * Add a relationship between entities
   */
  async addRelationship(
    graphId: string,
    fromEntity: string,
    toEntity: string,
    relationshipType: string,
    properties: Record<string, any> = {}
  ): Promise<string> {
    const result = await this.executePython('add_relationship', { 
      graph_id: graphId,
      from_entity: fromEntity,
      to_entity: toEntity,
      relationship_type: relationshipType,
      properties
    });
    return result.edge_id;
  }
  
  /**
   * Query the knowledge graph
   */
  async queryGraph(graphId: string, query: string): Promise<any[]> {
    const result = await this.executePython('query_graph', { 
      graph_id: graphId, 
      query 
    });
    return result.results;
  }
  
  /**
   * Get all relationships for a specific entity
   */
  async getEntityRelationships(graphId: string, entityId: string): Promise<GraphitiRelationship[]> {
    const result = await this.executePython('get_entity_relationships', { 
      graph_id: graphId, 
      entity_id: entityId 
    });
    return result.relationships;
  }
  
  /**
   * Integrate Mem0 memories into knowledge graph
   */
  async integrateWithMem0(graphId: string, memories: any[]): Promise<number> {
    const result = await this.executePython('integrate_with_mem0', { 
      graph_id: graphId, 
      mem0_memories: memories 
    });
    return result.entities_created;
  }
  
  /**
   * Get knowledge graph statistics
   */
  async getGraphStats(graphId: string): Promise<GraphitiStats> {
    const result = await this.executePython('get_graph_stats', { graph_id: graphId });
    return result.stats;
  }
  
  /**
   * Execute Python script with parameters
   */
  private async executePython(method: string, params: Record<string, any>): Promise<any> {
    return new Promise((resolve, reject) => {
      const python = spawn(this.pythonPath, [
        this.scriptPath,
        '--method', method,
        '--params', JSON.stringify(params)
      ]);
      
      let stdout = '';
      let stderr = '';
      
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            reject(new Error(\`Failed to parse Python output: \${error}\`));
          }
        } else {
          reject(new Error(\`Python script failed: \${stderr}\`));
        }
      });
    });
  }
}

// Integration with Mem0
export class Mem0GraphitiIntegration {
  private graphitiBridge: CortexGraphitiBridge;
  
  constructor() {
    this.graphitiBridge = new CortexGraphitiBridge();
  }
  
  /**
   * Sync Mem0 memories to Graphiti knowledge graph
   */
  async syncMem0ToGraphiti(mem0Memories: any[], graphId: string): Promise<{
    entitiesCreated: number;
    relationshipsCreated: number;
  }> {
    console.log(\`🔄 Syncing \${mem0Memories.length} memories to knowledge graph\`);
    
    const entitiesCreated = await this.graphitiBridge.integrateWithMem0(graphId, mem0Memories);
    
    // Create temporal relationships between memories
    let relationshipsCreated = 0;
    const sortedMemories = mem0Memories.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    for (let i = 1; i < sortedMemories.length; i++) {
      try {
        await this.graphitiBridge.addRelationship(
          graphId,
          sortedMemories[i-1].id,
          sortedMemories[i].id,
          'TEMPORAL_SEQUENCE',
          { sequence_order: i }
        );
        relationshipsCreated++;
      } catch (error) {
        console.warn(\`Failed to create temporal relationship: \${error}\`);
      }
    }
    
    return { entitiesCreated, relationshipsCreated };
  }
}

// Example usage
export async function testGraphitiIntegration(): Promise<void> {
  const bridge = new CortexGraphitiBridge();
  
  try {
    // Create a test knowledge graph
    const graphId = await bridge.createKnowledgeGraph(
      'test_cortex_graph',
      'Test knowledge graph for Cortex OS integration'
    );
    console.log(\`Created test graph: \${graphId}\`);
    
    // Add test entities
    const entityId = await bridge.addEntity(graphId, {
      name: 'Test Entity',
      type: 'test',
      properties: { test: true }
    });
    console.log(\`Added entity: \${entityId}\`);
    
    // Get stats
    const stats = await bridge.getGraphStats(graphId);
    console.log(\`Graph stats: \${JSON.stringify(stats, null, 2)}\`);
    
  } catch (error) {
    console.error('Graphiti integration test failed:', error);
  }
}
`;

    const bridgePath = path.join(bridgeDir, 'cortex-graphiti-bridge.ts');
    fs.writeFileSync(bridgePath, tsBridge);
    files.push(bridgePath);

    console.log(`  ✅ Created ${files.length} bridge files`);
    return files;
  }

  private async createTestFiles(config: GraphitiConfig): Promise<string[]> {
    console.log('🧪 Creating Graphiti test files...');

    const files: string[] = [];
    const testDir = path.join(this.workspaceRoot, 'cortex-memories', 'graphiti', 'tests');

    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // TypeScript test file
    const tsTest = `/**
 * Tests for Graphiti Integration
 * Phase 4: Advanced Knowledge Graph Capabilities
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { CortexGraphitiBridge, Mem0GraphitiIntegration } from '../bridge/cortex-graphiti-bridge';

describe('Graphiti Integration Tests', () => {
  let graphitiBridge: CortexGraphitiBridge;
  let mem0Integration: Mem0GraphitiIntegration;
  let testGraphId: string;
  
  beforeAll(async () => {
    graphitiBridge = new CortexGraphitiBridge();
    mem0Integration = new Mem0GraphitiIntegration();
    
    // Create test knowledge graph
    testGraphId = await graphitiBridge.createKnowledgeGraph(
      'test_integration_graph',
      'Test graph for integration testing'
    );
  });
  
  test('should create and manage knowledge graphs', async () => {
    expect(testGraphId).toBeDefined();
    expect(typeof testGraphId).toBe('string');
    
    const stats = await graphitiBridge.getGraphStats(testGraphId);
    expect(stats).toHaveProperty('nodes');
    expect(stats).toHaveProperty('edges');
    expect(stats.version).toBe('${config.version}');
  });
  
  test('should add entities to knowledge graph', async () => {
    const entityData = {
      name: 'Test User',
      type: 'person',
      properties: { role: 'tester', active: true }
    };
    
    const entityId = await graphitiBridge.addEntity(testGraphId, entityData);
    
    expect(entityId).toBeDefined();
    expect(typeof entityId).toBe('string');
    
    const stats = await graphitiBridge.getGraphStats(testGraphId);
    expect(stats.nodes).toBeGreaterThan(0);
  });
  
  test('should create relationships between entities', async () => {
    const entity1Id = await graphitiBridge.addEntity(testGraphId, {
      name: 'Entity 1',
      type: 'test_entity'
    });
    
    const entity2Id = await graphitiBridge.addEntity(testGraphId, {
      name: 'Entity 2',
      type: 'test_entity'
    });
    
    const relationshipId = await graphitiBridge.addRelationship(
      testGraphId,
      entity1Id,
      entity2Id,
      'CONNECTED_TO',
      { strength: 0.8 }
    );
    
    expect(relationshipId).toBeDefined();
    expect(typeof relationshipId).toBe('string');
    
    const relationships = await graphitiBridge.getEntityRelationships(testGraphId, entity1Id);
    expect(Array.isArray(relationships)).toBe(true);
    expect(relationships.length).toBeGreaterThan(0);
  });
  
  test('should query knowledge graph', async () => {
    const query = 'MATCH (n) RETURN count(n) as node_count';
    const results = await graphitiBridge.queryGraph(testGraphId, query);
    
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });
  
  test('should integrate with Mem0 memories', async () => {
    const mockMemories = [
      {
        id: 'mem1',
        data: 'User completed Phase 4 Graphiti integration',
        user_id: 'cortex_system',
        created_at: new Date().toISOString()
      },
      {
        id: 'mem2',
        data: 'Graphiti knowledge graph shows excellent performance',
        user_id: 'cortex_system',
        created_at: new Date().toISOString()
      }
    ];
    
    const result = await mem0Integration.syncMem0ToGraphiti(mockMemories, testGraphId);
    
    expect(result).toHaveProperty('entitiesCreated');
    expect(result).toHaveProperty('relationshipsCreated');
    expect(result.entitiesCreated).toBeGreaterThan(0);
  });
  
  test('should get comprehensive graph statistics', async () => {
    const stats = await graphitiBridge.getGraphStats(testGraphId);
    
    expect(stats).toHaveProperty('nodes');
    expect(stats).toHaveProperty('edges');
    expect(stats).toHaveProperty('storage_path');
    expect(stats).toHaveProperty('index_path');
    expect(stats).toHaveProperty('version');
    
    expect(typeof stats.nodes).toBe('number');
    expect(typeof stats.edges).toBe('number');
    expect(stats.storage_path).toContain('cortex-data');
    expect(stats.index_path).toContain('cortex-cache');
  });
});

describe('Knowledge Graph Performance Tests', () => {
  test('should handle large entity creation efficiently', async () => {
    const bridge = new CortexGraphitiBridge();
    const graphId = await bridge.createKnowledgeGraph(
      'performance_test_graph',
      'Graph for performance testing'
    );
    
    const startTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < 10; i++) {
      promises.push(bridge.addEntity(graphId, {
        name: \`Entity \${i}\`,
        type: 'performance_test',
        properties: { index: i }
      }));
    }
    
    await Promise.all(promises);
    const endTime = Date.now();
    
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    
    const stats = await bridge.getGraphStats(graphId);
    expect(stats.nodes).toBeGreaterThanOrEqual(10);
  });
});
`;

    const testPath = path.join(testDir, 'graphiti-integration.test.ts');
    fs.writeFileSync(testPath, tsTest);
    files.push(testPath);

    console.log(`  ✅ Created ${files.length} test files`);
    return files;
  }

  private async setupKnowledgeGraphs(config: GraphitiConfig): Promise<{
    cortex_main: string;
    user_interactions: string;
    system_memory: string;
  }> {
    console.log('📊 Setting up default knowledge graphs...');

    // Create initialization script
    const scriptsDir = path.join(this.workspaceRoot, 'cortex-memories', 'graphiti', 'scripts');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }

    const initScript = `#!/usr/bin/env python3
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
            'version': '${config.version}',
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
`;

    const scriptPath = path.join(scriptsDir, 'init-graphs.py');
    fs.writeFileSync(scriptPath, initScript);

    // Make script executable
    try {
      require('fs').chmodSync(scriptPath, 0o755);
    } catch (error) {
      console.warn('Could not make script executable:', error);
    }

    // Return placeholder graph IDs (would be generated when script runs)
    return {
      cortex_main: 'cortex_main_graph_placeholder',
      user_interactions: 'user_interactions_graph_placeholder',
      system_memory: 'system_memory_graph_placeholder',
    };
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const integrator = new GraphitiIntegrator();
  integrator
    .integrateGraphiti()
    .then(() => {
      console.log('🎯 Phase 4 complete! Ready for Phase 5: Letta Integration');
    })
    .catch((error) => {
      console.error('❌ Phase 4 failed:', error);
      process.exit(1);
    });
}

export { GraphitiIntegrator };
export type { GraphitiConfig, GraphitiIntegration };
