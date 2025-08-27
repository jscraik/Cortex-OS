/**
 * TypeScript Bridge for Graphiti Integration
 * Phase 4: Advanced Knowledge Graph Capabilities
 */

import { spawn } from 'child_process';
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
    this.pythonPath = '/Users/jamiecraik/.cortex-os/.venv/bin/python'; // Use configured Python environment
    this.scriptPath = path.join(__dirname, '..', 'cortex_graphiti_integration.py');
  }

  /**
   * Create a new knowledge graph
   */
  async createKnowledgeGraph(name: string, description: string): Promise<string> {
    const result = await this.executePython('create_knowledge_graph', {
      name,
      description,
    });
    return result.graph_id;
  }

  /**
   * Add an entity to a knowledge graph
   */
  async addEntity(graphId: string, entityData: Partial<GraphitiEntity>): Promise<string> {
    const result = await this.executePython('add_entity', {
      graph_id: graphId,
      entity_data: entityData,
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
    properties: Record<string, any> = {},
  ): Promise<string> {
    const result = await this.executePython('add_relationship', {
      graph_id: graphId,
      from_entity: fromEntity,
      to_entity: toEntity,
      relationship_type: relationshipType,
      properties,
    });
    return result.edge_id;
  }

  /**
   * Query the knowledge graph
   */
  async queryGraph(graphId: string, query: string): Promise<any[]> {
    const result = await this.executePython('query_graph', {
      graph_id: graphId,
      query,
    });
    return result.results;
  }

  /**
   * Get all relationships for a specific entity
   */
  async getEntityRelationships(graphId: string, entityId: string): Promise<GraphitiRelationship[]> {
    const result = await this.executePython('get_entity_relationships', {
      graph_id: graphId,
      entity_id: entityId,
    });
    return result.relationships;
  }

  /**
   * Integrate Mem0 memories into knowledge graph
   */
  async integrateWithMem0(graphId: string, memories: any[]): Promise<number> {
    const result = await this.executePython('integrate_with_mem0', {
      graph_id: graphId,
      mem0_memories: memories,
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
   * Initialize a knowledge graph (for unified memory manager)
   */
  async initializeKnowledgeGraph(graphId: string): Promise<boolean> {
    try {
      const result = await this.executePython('initialize_knowledge_graph', { graph_id: graphId });
      return result.success || false;
    } catch (error) {
      console.warn('Failed to initialize knowledge graph:', error);
      return false;
    }
  }

  /**
   * Search entities in knowledge graph
   */
  async searchEntities(
    graphId: string,
    query: string,
    limit: number = 10,
  ): Promise<GraphitiEntity[]> {
    try {
      const result = await this.executePython('search_entities', {
        graph_id: graphId,
        query,
        limit,
      });
      return result.entities || [];
    } catch (error) {
      console.warn('Failed to search entities:', error);
      return [];
    }
  }

  /**
   * Get all entities in knowledge graph (for unified memory manager)
   */
  async getEntities(graphId: string, limit: number = 100): Promise<GraphitiEntity[]> {
    try {
      const result = await this.executePython('get_entities', {
        graph_id: graphId,
        limit,
      });
      return result.entities || [];
    } catch (error) {
      console.warn('Failed to get entities:', error);
      return [];
    }
  }

  /**
   * Execute Python script with parameters
   */
  private async executePython(method: string, params: Record<string, any>): Promise<any> {
    return new Promise((resolve, reject) => {
      const python = spawn(this.pythonPath, [
        this.scriptPath,
        '--method',
        method,
        '--params',
        JSON.stringify(params),
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
            // Filter out Python warnings from stdout before parsing JSON
            const lines = stdout.split('\n');
            const jsonLines = lines.filter(
              (line) =>
                !line.startsWith('Warning:') && !line.includes('WARNING') && line.trim().length > 0,
            );
            const jsonOutput = jsonLines.join('\n');

            const result = JSON.parse(jsonOutput);
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse Python output: ${error}`));
          }
        } else {
          reject(new Error(`Python script failed: ${stderr}`));
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
  async syncMem0ToGraphiti(
    mem0Memories: any[],
    graphId: string,
  ): Promise<{
    entitiesCreated: number;
    relationshipsCreated: number;
  }> {
    console.log(`🔄 Syncing ${mem0Memories.length} memories to knowledge graph`);

    const entitiesCreated = await this.graphitiBridge.integrateWithMem0(graphId, mem0Memories);

    // Create temporal relationships between memories
    let relationshipsCreated = 0;
    const sortedMemories = mem0Memories.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    for (let i = 1; i < sortedMemories.length; i++) {
      try {
        await this.graphitiBridge.addRelationship(
          graphId,
          sortedMemories[i - 1].id,
          sortedMemories[i].id,
          'TEMPORAL_SEQUENCE',
          { sequence_order: i },
        );
        relationshipsCreated++;
      } catch (error) {
        console.warn(`Failed to create temporal relationship: ${error}`);
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
      'Test knowledge graph for Cortex OS integration',
    );
    console.log(`Created test graph: ${graphId}`);

    // Add test entities
    const entityId = await bridge.addEntity(graphId, {
      name: 'Test Entity',
      type: 'test',
      properties: { test: true },
    });
    console.log(`Added entity: ${entityId}`);

    // Get stats
    const stats = await bridge.getGraphStats(graphId);
    console.log(`Graph stats: ${JSON.stringify(stats, null, 2)}`);
  } catch (error) {
    console.error('Graphiti integration test failed:', error);
  }
}
