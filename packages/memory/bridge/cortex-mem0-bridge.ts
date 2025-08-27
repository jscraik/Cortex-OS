/**
 * TypeScript Bridge for Mem0 Integration
 * Phase 3: Advanced Memory Capabilities
 */

import { spawn } from 'child_process';
import * as path from 'path';

export interface Mem0Memory {
  id: string;
  data: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface Mem0Stats {
  total_memories: number;
  storage_path: string;
  cache_path: string;
  version: string;
}

export class CortexMem0Bridge {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    this.pythonPath = '/Users/jamiecraik/.cortex-os/.venv/bin/python'; // Use configured Python environment
    this.scriptPath = path.join(__dirname, '..', 'cortex_mem0_integration.py');
  }

  /**
   * Add a memory to the Mem0 system
   */
  async addMemory(data: string, userId: string = 'cortex_system'): Promise<string> {
    const result = await this.executePython('add_memory', { data, user_id: userId });
    return result.memory_id;
  }

  /**
   * Search memories using semantic similarity
   */
  async searchMemories(
    query: string,
    userId: string = 'cortex_system',
    limit: number = 5,
  ): Promise<Mem0Memory[]> {
    const result = await this.executePython('search_memories', {
      query,
      user_id: userId,
      limit,
    });
    return result.memories || [];
  }

  /**
   * Get all users from the Mem0 system
   */
  async getAllUsers(): Promise<string[]> {
    try {
      const result = await this.executePython('get_all_users', {});
      return result.users || [];
    } catch (error) {
      console.warn('Failed to get users from Mem0:', error);
      return [];
    }
  }

  /**
   * Get all memories for a user
   */
  async getAllMemories(userId: string = 'cortex_system'): Promise<Mem0Memory[]> {
    const result = await this.executePython('get_all_memories', { user_id: userId });
    return result.memories || [];
  }

  /**
   * Update an existing memory
   */
  async updateMemory(memoryId: string, data: string): Promise<string> {
    const result = await this.executePython('update_memory', {
      memory_id: memoryId,
      data,
    });
    return result.memory_id;
  }

  /**
   * Delete a memory by ID
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    const result = await this.executePython('delete_memory', { memory_id: memoryId });
    return result.success;
  }

  /**
   * Get memory system statistics
   */
  async getStats(): Promise<Mem0Stats> {
    const result = await this.executePython('get_stats', {});
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
            const result = JSON.parse(stdout);
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

// Example usage
export async function testMem0Integration(): Promise<void> {
  const bridge = new CortexMem0Bridge();

  try {
    // Add a memory
    const memoryId = await bridge.addMemory(
      'This is a test memory for TypeScript bridge integration',
      'cortex_system',
    );
    console.log(`Added memory: ${memoryId}`);

    // Search for memories
    const memories = await bridge.searchMemories('TypeScript bridge');
    console.log(`Found memories: ${memories.length}`);

    // Get stats
    const stats = await bridge.getStats();
    console.log(`Memory stats: ${JSON.stringify(stats, null, 2)}`);
  } catch (error) {
    console.error('Mem0 integration test failed:', error);
  }
}

// Run test if called directly
if (require.main === module) {
  testMem0Integration();
}
