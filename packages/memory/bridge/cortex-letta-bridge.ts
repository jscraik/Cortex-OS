/**
 * TypeScript Bridge for Letta Integration
 * Phase 5: Persistent Memory and Context Management
 */

import { spawn } from 'child_process';
import * as path from 'path';

export interface LettaAgent {
  id: string;
  name: string;
  system_prompt: string;
  created_at: string;
  memory_type: string;
}

export interface LettaMemory {
  id: string;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
  relevance_score?: number;
}

export interface LettaStats {
  agent_id: string;
  agent_name: string;
  total_memories: number;
  context_window_size: number;
  memory_retention_days: number;
  storage_path: string;
  cache_path: string;
  version: string;
}

export class CortexLettaBridge {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    this.pythonPath = '/Users/jamiecraik/.cortex-os/.venv/bin/python'; // Use configured Python environment
    this.scriptPath = path.join(__dirname, '..', 'cortex_letta_integration.py');
  }

  /**
   * Create a new memory agent with persistent storage
   */
  async createMemoryAgent(name: string, systemPrompt?: string): Promise<string> {
    const result = await this.executePython('create_memory_agent', {
      name,
      system_prompt: systemPrompt,
    });
    return result.agent_id;
  }

  /**
   * Store content in persistent memory with compression
   */
  async storePersistentMemory(
    agentId: string,
    content: string,
    metadata: Record<string, any> = {},
  ): Promise<string> {
    const result = await this.executePython('store_persistent_memory', {
      agent_id: agentId,
      content,
      metadata,
    });
    return result.memory_id;
  }

  /**
   * Retrieve memories using semantic search
   */
  async retrieveMemory(agentId: string, query: string, limit: number = 10): Promise<LettaMemory[]> {
    const result = await this.executePython('retrieve_memory', {
      agent_id: agentId,
      query,
      limit,
    });
    return result.memories;
  }

  /**
   * Update the agent's context window
   */
  async updateContextWindow(agentId: string, context: string): Promise<void> {
    await this.executePython('update_context_window', {
      agent_id: agentId,
      context,
    });
  }

  /**
   * Compress memories older than specified days
   */
  async compressOldMemories(agentId: string, daysOld: number = 30): Promise<number> {
    const result = await this.executePython('compress_old_memories', {
      agent_id: agentId,
      days_old: daysOld,
    });
    return result.compressed_count;
  }

  /**
   * Sync Mem0 memories into Letta persistent storage
   */
  async syncWithMem0(agentId: string, mem0Memories: any[]): Promise<number> {
    const result = await this.executePython('sync_with_mem0', {
      agent_id: agentId,
      mem0_memories: mem0Memories,
    });
    return result.synced_count;
  }

  /**
   * Sync Graphiti entities into Letta knowledge base
   */
  async syncWithGraphiti(agentId: string, graphEntities: any[]): Promise<number> {
    const result = await this.executePython('sync_with_graphiti', {
      agent_id: agentId,
      graph_entities: graphEntities,
    });
    return result.synced_count;
  }

  /**
   * Get comprehensive statistics for a memory agent
   */
  async getAgentStats(agentId: string): Promise<LettaStats> {
    const result = await this.executePython('get_agent_stats', { agent_id: agentId });
    return result.stats;
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

// Unified Memory System Integration
export class UnifiedMemorySystem {
  private lettaBridge: CortexLettaBridge;

  constructor() {
    this.lettaBridge = new CortexLettaBridge();
  }

  /**
   * Initialize unified memory system with all integrations
   */
  async initialize(): Promise<{
    lettaAgent: string;
    memoryStats: LettaStats;
  }> {
    console.log('🚀 Initializing Unified Memory System...');

    // Create main memory agent
    const lettaAgent = await this.lettaBridge.createMemoryAgent(
      'cortex_unified_memory',
      'You are the unified memory system for Cortex OS, integrating Mem0, Graphiti, and Letta capabilities.',
    );

    // Store initialization memory
    await this.lettaBridge.storePersistentMemory(
      lettaAgent,
      'Unified Memory System initialized with Mem0, Graphiti, and Letta integration',
      {
        system: 'cortex_os',
        phase: 5,
        components: ['mem0', 'graphiti', 'letta'],
        status: 'initialized',
      },
    );

    const memoryStats = await this.lettaBridge.getAgentStats(lettaAgent);

    console.log('✅ Unified Memory System initialized successfully');
    return { lettaAgent, memoryStats };
  }

  /**
   * Sync all memory systems together
   */
  async syncAllMemorySystems(
    agentId: string,
    mem0Memories: any[] = [],
    graphitiEntities: any[] = [],
  ): Promise<{
    mem0Synced: number;
    graphitiSynced: number;
    totalMemories: number;
  }> {
    console.log('🔄 Syncing all memory systems...');

    const mem0Synced =
      mem0Memories.length > 0 ? await this.lettaBridge.syncWithMem0(agentId, mem0Memories) : 0;

    const graphitiSynced =
      graphitiEntities.length > 0
        ? await this.lettaBridge.syncWithGraphiti(agentId, graphitiEntities)
        : 0;

    const stats = await this.lettaBridge.getAgentStats(agentId);

    return {
      mem0Synced,
      graphitiSynced,
      totalMemories: stats.total_memories,
    };
  }
}

// Example usage
export async function testLettaIntegration(): Promise<void> {
  const bridge = new CortexLettaBridge();

  try {
    // Create a test memory agent
    const agentId = await bridge.createMemoryAgent(
      'test_letta_agent',
      'You are a test agent for Letta integration verification',
    );
    console.log(`Created test agent: ${agentId}`);

    // Store test memory
    const memoryId = await bridge.storePersistentMemory(
      agentId,
      'This is a test memory for Phase 5 Letta integration',
      { test: true, phase: 5 },
    );
    console.log(`Stored memory: ${memoryId}`);

    // Retrieve memories
    const memories = await bridge.retrieveMemory(agentId, 'test memory');
    console.log(`Retrieved ${memories.length} memories`);

    // Get stats
    const stats = await bridge.getAgentStats(agentId);
    console.log(`Agent stats: ${JSON.stringify(stats, null, 2)}`);
  } catch (error) {
    console.error('Letta integration test failed:', error);
  }
}
