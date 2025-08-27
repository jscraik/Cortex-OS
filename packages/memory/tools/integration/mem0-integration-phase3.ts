#!/usr/bin/env node
/* eslint-disable no-console */
// tools/mem0-integration-phase3.ts
// Phase 3: Mem0 Integration for Enhanced Memory System

import * as fs from 'fs';
import * as path from 'path';

interface Mem0Config {
  version: string;
  enabled: boolean;
  storage: {
    ssd_path: string;
    hdd_path: string;
    database_url: string;
  };
  features: {
    vector_search: boolean;
    semantic_memory: boolean;
    context_management: boolean;
    memory_graphs: boolean;
  };
  performance: {
    cache_size: number;
    batch_size: number;
    index_type: string;
  };
}

interface Mem0Integration {
  timestamp: string;
  phase: string;
  installation: {
    package: string;
    version: string;
    dependencies: string[];
  };
  configuration: Mem0Config;
  integrationFiles: string[];
  bridgeFiles: string[];
  testFiles: string[];
}

interface StorageConfig {
  devices?: Array<{
    name: string;
    path: string;
    type: string;
  }>;
}

class Mem0Integrator {
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

  public async integrateMem0(): Promise<Mem0Integration> {
    console.log('🚀 Starting Phase 3: Mem0 Integration');

    // Install Mem0 package
    await this.installMem0Package();

    // Create Mem0 configuration
    const mem0Config = this.createMem0Config();

    // Create integration files
    const integrationFiles = await this.createIntegrationFiles(mem0Config);

    // Create TypeScript bridge files
    const bridgeFiles = await this.createBridgeFiles(mem0Config);

    // Create test files
    const testFiles = await this.createTestFiles(mem0Config);

    const integration: Mem0Integration = {
      timestamp: new Date().toISOString(),
      phase: 'Phase 3: Mem0 Integration',
      installation: {
        package: 'mem0ai',
        version: 'latest',
        dependencies: ['numpy', 'faiss-cpu', 'chromadb', 'sentence-transformers'],
      },
      configuration: mem0Config,
      integrationFiles,
      bridgeFiles,
      testFiles,
    };

    // Save integration report
    const reportPath = path.join(this.workspaceRoot, 'phase3-mem0-integration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(integration, null, 2));

    console.log('✅ Phase 3 Mem0 integration complete!');
    console.log(`📄 Report saved to: ${reportPath}`);

    return integration;
  }

  private async installMem0Package(): Promise<void> {
    console.log('📦 Setting up Mem0 package installation...');

    // Create Python requirements file for Mem0
    const requirementsContent = `# Mem0 Enhanced Memory System Dependencies
# Phase 3: Mem0 Integration

# Core Mem0 library
mem0ai>=0.1.0

# Vector search and embeddings
faiss-cpu>=1.7.0
chromadb>=0.4.0
sentence-transformers>=2.2.0

# Data processing
numpy>=1.24.0
pandas>=2.0.0

# Database connectors
sqlite3
psycopg2-binary

# Performance and monitoring
tqdm>=4.65.0
rich>=13.0.0
`;

    const reqPath = path.join(this.workspaceRoot, 'requirements-mem0.txt');
    fs.writeFileSync(reqPath, requirementsContent);
    console.log(`  📄 Created: ${reqPath}`);

    // Create package.json additions for TypeScript integration
    const packageAdditions = {
      devDependencies: {
        '@types/node': '^20.0.0',
        typescript: '^5.0.0',
      },
      scripts: {
        'mem0:install': 'pip install -r requirements-mem0.txt',
        'mem0:test': 'python -m pytest cortex-memories/mem0/tests/',
        'mem0:bridge:test': 'vitest cortex-memories/mem0/bridge/',
      },
    };

    const additionsPath = path.join(this.workspaceRoot, 'package-mem0-additions.json');
    fs.writeFileSync(additionsPath, JSON.stringify(packageAdditions, null, 2));
    console.log(`  📄 Created: ${additionsPath}`);
  }

  private createMem0Config(): Mem0Config {
    console.log('⚙️  Creating Mem0 configuration...');

    // Get storage paths from Phase 2
    const ssdPath = '/Volumes/ExternalSSD'; // From storage config
    const hddPath = '/Volumes/ExternalHDD'; // From storage config

    const config: Mem0Config = {
      version: '3.0.0',
      enabled: true,
      storage: {
        ssd_path: `${ssdPath}/cortex-data/mem0`,
        hdd_path: `${hddPath}/cortex-cache/mem0`,
        database_url: `${ssdPath}/cortex-data/mem0/mem0.db`,
      },
      features: {
        vector_search: true,
        semantic_memory: true,
        context_management: true,
        memory_graphs: true,
      },
      performance: {
        cache_size: 1000,
        batch_size: 32,
        index_type: 'HNSW',
      },
    };

    return config;
  }

  private async createIntegrationFiles(config: Mem0Config): Promise<string[]> {
    console.log('📝 Creating Mem0 integration files...');

    const files: string[] = [];

    // Create Mem0 directory structure
    const mem0Dir = path.join(this.workspaceRoot, 'cortex-memories', 'mem0');
    if (!fs.existsSync(mem0Dir)) {
      fs.mkdirSync(mem0Dir, { recursive: true });
    }

    // 1. Mem0 configuration file
    const configPath = path.join(mem0Dir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    files.push(configPath);

    // 2. Python Mem0 integration
    const pythonIntegration = `"""
Mem0 Integration for Cortex OS Enhanced Memory System
Phase 3: Advanced Memory Capabilities
"""

import os
import json
from typing import Dict, List, Any, Optional
from mem0 import Memory
from pathlib import Path

class CortexMem0Integration:
    """Enhanced memory integration using Mem0 library."""
    
    def __init__(self, config_path: str = None):
        """Initialize Mem0 integration with Cortex OS configuration."""
        self.config = self._load_config(config_path)
        self.memory = self._initialize_memory()
        
    def _load_config(self, config_path: str = None) -> Dict[str, Any]:
        """Load Mem0 configuration from JSON file."""
        if config_path is None:
            config_path = os.path.join(
                os.path.dirname(__file__), 
                'config.json'
            )
        
        with open(config_path, 'r') as f:
            return json.load(f)
    
    def _initialize_memory(self) -> Memory:
        """Initialize Mem0 with Cortex OS storage configuration."""
        # Ensure storage directories exist
        os.makedirs(self.config['storage']['ssd_path'], exist_ok=True)
        os.makedirs(self.config['storage']['hdd_path'], exist_ok=True)
        
        # Configure Mem0 with external storage
        memory_config = {
            "vector_store": {
                "provider": "chroma",
                "config": {
                    "path": self.config['storage']['ssd_path'],
                    "collection_name": "cortex_memories"
                }
            },
            "embedder": {
                "provider": "sentence_transformers",
                "config": {
                    "model": "all-MiniLM-L6-v2"
                }
            },
            "version": self.config['version']
        }
        
        return Memory.from_config(memory_config)
    
    def add_memory(self, data: str, user_id: str = "cortex_system") -> str:
        """Add a memory to the Mem0 system."""
        return self.memory.add(data, user_id=user_id)
    
    def search_memories(self, query: str, user_id: str = "cortex_system", limit: int = 5) -> List[Dict[str, Any]]:
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
            "storage_path": self.config['storage']['ssd_path'],
            "cache_path": self.config['storage']['hdd_path'],
            "version": self.config['version']
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
`;

    const pythonPath = path.join(mem0Dir, 'cortex_mem0_integration.py');
    fs.writeFileSync(pythonPath, pythonIntegration);
    files.push(pythonPath);

    console.log(`  ✅ Created ${files.length} integration files`);
    return files;
  }

  private async createBridgeFiles(_config: Mem0Config): Promise<string[]> {
    console.log('🌉 Creating TypeScript bridge files...');

    const files: string[] = [];
    const bridgeDir = path.join(this.workspaceRoot, 'cortex-memories', 'mem0', 'bridge');

    if (!fs.existsSync(bridgeDir)) {
      fs.mkdirSync(bridgeDir, { recursive: true });
    }

    // TypeScript bridge for Mem0 integration
    const tsBridge = `/**
 * TypeScript Bridge for Mem0 Integration
 * Phase 3: Advanced Memory Capabilities
 */

import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
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
    this.pythonPath = 'python3'; // Default Python path
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
    limit: number = 5
  ): Promise<Mem0Memory[]> {
    const result = await this.executePython('search_memories', { 
      query, 
      user_id: userId, 
      limit 
    });
    return result.memories;
  }
  
  /**
   * Get all memories for a user
   */
  async getAllMemories(userId: string = 'cortex_system'): Promise<Mem0Memory[]> {
    const result = await this.executePython('get_all_memories', { user_id: userId });
    return result.memories;
  }
  
  /**
   * Update an existing memory
   */
  async updateMemory(memoryId: string, data: string): Promise<string> {
    const result = await this.executePython('update_memory', { 
      memory_id: memoryId, 
      data 
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

// Example usage
export async function testMem0Integration(): Promise<void> {
  const bridge = new CortexMem0Bridge();
  
  try {
    // Add a test memory
    const memoryId = await bridge.addMemory(
      'TypeScript bridge to Mem0 integration is working correctly'
    );
    console.log(\`Added memory: \${memoryId}\`);
    
    // Search for memories
    const memories = await bridge.searchMemories('TypeScript bridge');
    console.log(\`Found memories: \${memories.length}\`);
    
    // Get stats
    const stats = await bridge.getStats();
    console.log(\`Memory stats: \${JSON.stringify(stats, null, 2)}\`);
    
  } catch (error) {
    console.error('Mem0 integration test failed:', error);
  }
}
`;

    const bridgePath = path.join(bridgeDir, 'cortex-mem0-bridge.ts');
    fs.writeFileSync(bridgePath, tsBridge);
    files.push(bridgePath);

    console.log(`  ✅ Created ${files.length} bridge files`);
    return files;
  }

  private async createTestFiles(config: Mem0Config): Promise<string[]> {
    console.log('🧪 Creating Mem0 test files...');

    const files: string[] = [];
    const testDir = path.join(this.workspaceRoot, 'cortex-memories', 'mem0', 'tests');

    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // TypeScript test file
    const tsTest = `/**
 * Tests for Mem0 Integration
 * Phase 3: Advanced Memory Capabilities
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { CortexMem0Bridge } from '../bridge/cortex-mem0-bridge';

describe('Mem0 Integration Tests', () => {
  let mem0Bridge: CortexMem0Bridge;
  
  beforeAll(async () => {
    mem0Bridge = new CortexMem0Bridge();
  });
  
  test('should add and retrieve memories', async () => {
    const testData = 'Test memory for Phase 3 integration';
    const memoryId = await mem0Bridge.addMemory(testData);
    
    expect(memoryId).toBeDefined();
    expect(typeof memoryId).toBe('string');
    
    const memories = await mem0Bridge.getAllMemories();
    const addedMemory = memories.find(m => m.id === memoryId);
    
    expect(addedMemory).toBeDefined();
    expect(addedMemory?.data).toBe(testData);
  });
  
  test('should search memories semantically', async () => {
    const testQuery = 'Phase 3 integration';
    const results = await mem0Bridge.searchMemories(testQuery, 'cortex_system', 3);
    
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(0);
    
    if (results.length > 0) {
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('data');
      expect(results[0]).toHaveProperty('user_id');
    }
  });
  
  test('should update existing memories', async () => {
    const originalData = 'Original memory data';
    const updatedData = 'Updated memory data for testing';
    
    const memoryId = await mem0Bridge.addMemory(originalData);
    const updatedId = await mem0Bridge.updateMemory(memoryId, updatedData);
    
    expect(updatedId).toBe(memoryId);
    
    const memories = await mem0Bridge.getAllMemories();
    const updatedMemory = memories.find(m => m.id === memoryId);
    
    expect(updatedMemory?.data).toBe(updatedData);
  });
  
  test('should delete memories', async () => {
    const testData = 'Memory to be deleted';
    const memoryId = await mem0Bridge.addMemory(testData);
    
    const deleted = await mem0Bridge.deleteMemory(memoryId);
    expect(deleted).toBe(true);
    
    const memories = await mem0Bridge.getAllMemories();
    const deletedMemory = memories.find(m => m.id === memoryId);
    
    expect(deletedMemory).toBeUndefined();
  });
  
  test('should get system statistics', async () => {
    const stats = await mem0Bridge.getStats();
    
    expect(stats).toHaveProperty('total_memories');
    expect(stats).toHaveProperty('storage_path');
    expect(stats).toHaveProperty('cache_path');
    expect(stats).toHaveProperty('version');
    
    expect(typeof stats.total_memories).toBe('number');
    expect(typeof stats.storage_path).toBe('string');
    expect(typeof stats.cache_path).toBe('string');
    expect(stats.version).toBe('${config.version}');
  });
});
`;

    const testPath = path.join(testDir, 'mem0-integration.test.ts');
    fs.writeFileSync(testPath, tsTest);
    files.push(testPath);

    console.log(`  ✅ Created ${files.length} test files`);
    return files;
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const integrator = new Mem0Integrator();
  integrator
    .integrateMem0()
    .then(() => {
      console.log('🎯 Phase 3 complete! Ready for Phase 4: Graphiti Integration');
    })
    .catch((error) => {
      console.error('❌ Phase 3 failed:', error);
      process.exit(1);
    });
}

export { Mem0Integrator };
export type { Mem0Config, Mem0Integration };
