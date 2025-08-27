#!/usr/bin/env node
/* eslint-disable no-console */
// tools/letta-integration-phase5.ts
// Phase 5: Letta Integration for Enhanced Memory System

import * as fs from 'fs';
import * as path from 'path';

interface LettaConfig {
  version: string;
  enabled: boolean;
  storage: {
    ssd_memory_path: string;
    hdd_context_path: string;
    database_url: string;
  };
  features: {
    persistent_memory: boolean;
    context_management: boolean;
    long_term_storage: boolean;
    memory_compression: boolean;
  };
  performance: {
    context_window_size: number;
    memory_retention_days: number;
    compression_ratio: number;
    cache_size: number;
  };
  integration: {
    mem0_sync: boolean;
    graphiti_sync: boolean;
    cortex_bridge: boolean;
  };
}

interface LettaIntegration {
  timestamp: string;
  phase: string;
  installation: {
    package: string;
    version: string;
    dependencies: string[];
  };
  configuration: LettaConfig;
  integrationFiles: string[];
  bridgeFiles: string[];
  testFiles: string[];
  memoryProfiles: {
    short_term: string;
    long_term: string;
    persistent: string;
  };
}

interface StorageConfig {
  devices?: Array<{
    name: string;
    path: string;
    type: string;
  }>;
}

class LettaIntegrator {
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

  public async integrateLetta(): Promise<LettaIntegration> {
    console.log('🚀 Starting Phase 5: Letta Integration');

    // Install Letta package
    await this.installLettaPackage();

    // Create Letta configuration
    const lettaConfig = this.createLettaConfig();

    // Create integration files
    const integrationFiles = await this.createIntegrationFiles(lettaConfig);

    // Create TypeScript bridge files
    const bridgeFiles = await this.createBridgeFiles(lettaConfig);

    // Create test files
    const testFiles = await this.createTestFiles(lettaConfig);

    // Setup memory profiles
    const memoryProfiles = await this.setupMemoryProfiles(lettaConfig);

    const integration: LettaIntegration = {
      timestamp: new Date().toISOString(),
      phase: 'Phase 5: Letta Integration',
      installation: {
        package: 'letta',
        version: 'latest',
        dependencies: ['sqlalchemy', 'redis', 'asyncpg', 'pydantic'],
      },
      configuration: lettaConfig,
      integrationFiles,
      bridgeFiles,
      testFiles,
      memoryProfiles,
    };

    // Save integration report
    const reportPath = path.join(this.workspaceRoot, 'phase5-letta-integration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(integration, null, 2));

    console.log('✅ Phase 5 Letta integration complete!');
    console.log(`📄 Report saved to: ${reportPath}`);

    return integration;
  }

  private async installLettaPackage(): Promise<void> {
    console.log('📦 Setting up Letta package installation...');

    // Create Python requirements file for Letta
    const requirementsContent = `# Letta Persistent Memory Dependencies
# Phase 5: Letta Integration

# Core Letta library
letta>=0.4.0

# Database and storage
sqlalchemy>=2.0.0
asyncpg>=0.28.0
redis>=4.5.0
sqlite3

# Data validation and serialization
pydantic>=2.0.0
pydantic-settings>=2.0.0

# Async and performance
asyncio>=3.4.0
aioredis>=2.0.0

# Memory compression and optimization
lz4>=4.3.0
zstandard>=0.21.0

# Text processing and embeddings
tiktoken>=0.5.0
sentence-transformers>=2.2.0

# Monitoring and logging
structlog>=23.0.0
prometheus-client>=0.17.0

# Development and testing
pytest>=7.4.0
pytest-asyncio>=0.21.0
`;

    const reqPath = path.join(this.workspaceRoot, 'requirements-letta.txt');
    fs.writeFileSync(reqPath, requirementsContent);
    console.log(`  📄 Created: ${reqPath}`);

    // Create package.json additions for TypeScript integration
    const packageAdditions = {
      devDependencies: {
        '@types/node': '^20.0.0',
        typescript: '^5.0.0',
        ioredis: '^5.3.0',
        pg: '^8.11.0',
        '@types/pg': '^8.10.0',
      },
      scripts: {
        'letta:install': 'pip install -r requirements-letta.txt',
        'letta:test': 'python -m pytest cortex-memories/letta/tests/',
        'letta:bridge:test': 'vitest cortex-memories/letta/bridge/',
        'letta:memory:init': 'python cortex-memories/letta/scripts/init-memory.py',
        'letta:memory:migrate': 'python cortex-memories/letta/scripts/migrate-memory.py',
      },
    };

    const additionsPath = path.join(this.workspaceRoot, 'package-letta-additions.json');
    fs.writeFileSync(additionsPath, JSON.stringify(packageAdditions, null, 2));
    console.log(`  📄 Created: ${additionsPath}`);
  }

  private createLettaConfig(): LettaConfig {
    console.log('⚙️  Creating Letta configuration...');

    // Get storage paths from Phase 2
    const ssdPath = '/Volumes/ExternalSSD'; // From storage config
    const hddPath = '/Volumes/ExternalHDD'; // From storage config

    const config: LettaConfig = {
      version: '5.0.0',
      enabled: true,
      storage: {
        ssd_memory_path: `${ssdPath}/cortex-data/letta`,
        hdd_context_path: `${hddPath}/cortex-cache/letta`,
        database_url: `postgresql://letta:cortex_letta_2025@localhost:5432/cortex_letta`,
      },
      features: {
        persistent_memory: true,
        context_management: true,
        long_term_storage: true,
        memory_compression: true,
      },
      performance: {
        context_window_size: 32000,
        memory_retention_days: 365,
        compression_ratio: 0.3,
        cache_size: 4096,
      },
      integration: {
        mem0_sync: true,
        graphiti_sync: true,
        cortex_bridge: true,
      },
    };

    return config;
  }

  private async createIntegrationFiles(config: LettaConfig): Promise<string[]> {
    console.log('📝 Creating Letta integration files...');

    const files: string[] = [];

    // Create Letta directory structure
    const lettaDir = path.join(this.workspaceRoot, 'cortex-memories', 'letta');
    if (!fs.existsSync(lettaDir)) {
      fs.mkdirSync(lettaDir, { recursive: true });
    }

    // 1. Letta configuration file
    const configPath = path.join(lettaDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    files.push(configPath);

    // 2. Python Letta integration
    const pythonIntegration = `"""
Letta Integration for Cortex OS Enhanced Memory System
Phase 5: Persistent Memory and Context Management
"""

import os
import json
import asyncio
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
from pathlib import Path

try:
    from letta import create_client, LettaClient
    from letta.schemas.memory import ChatMemory, ArchivalMemory
    from letta.schemas.message import Message
    import sqlalchemy as sa
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    import redis.asyncio as redis
    import lz4.frame
    import zstandard as zstd
except ImportError as e:
    print(f"Warning: Letta dependencies not installed: {e}")
    print("Run: pip install -r requirements-letta.txt")

class CortexLettaIntegration:
    """Enhanced persistent memory integration using Letta library."""
    
    def __init__(self, config_path: str = None):
        """Initialize Letta integration with Cortex OS configuration."""
        self.config = self._load_config(config_path)
        self.client: Optional[LettaClient] = None
        self.db_engine = None
        self.redis_client = None
        self.compressor = zstd.ZstdCompressor(level=3)
        self.decompressor = zstd.ZstdDecompressor()
        
        asyncio.create_task(self._initialize_letta())
        
    def _load_config(self, config_path: str = None) -> Dict[str, Any]:
        """Load Letta configuration from JSON file."""
        if config_path is None:
            config_path = os.path.join(
                os.path.dirname(__file__), 
                'config.json'
            )
        
        with open(config_path, 'r') as f:
            return json.load(f)
    
    async def _initialize_letta(self) -> None:
        """Initialize Letta with Cortex OS storage configuration."""
        try:
            # Ensure storage directories exist
            os.makedirs(self.config['storage']['ssd_memory_path'], exist_ok=True)
            os.makedirs(self.config['storage']['hdd_context_path'], exist_ok=True)
            
            # Initialize database engine
            self.db_engine = create_async_engine(
                self.config['storage']['database_url'],
                echo=False,
                pool_size=10
            )
            
            # Initialize Redis for caching
            self.redis_client = redis.from_url(
                "redis://localhost:6379/0",
                decode_responses=True
            )
            
            # Initialize Letta client
            self.client = create_client(
                base_url="http://localhost:8283",
                token="cortex_letta_token"
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
            system=system_prompt or "You are a helpful assistant with persistent memory.",
            memory_type="chat",
            llm_config="gpt-4",
            embedding_config="text-embedding-ada-002"
        )
        
        print(f"🤖 Created memory agent: {name} (ID: {agent.id})")
        return agent.id
    
    async def store_persistent_memory(self, agent_id: str, content: str, 
                                    metadata: Dict[str, Any] = None) -> str:
        """Store content in persistent memory with compression."""
        if not self.client:
            raise RuntimeError("Letta client not initialized")
        
        # Compress content for efficient storage
        compressed_content = self.compressor.compress(content.encode('utf-8'))
        
        # Store in archival memory
        memory_id = await self.client.insert_archival_memory(
            agent_id=agent_id,
            content=content,
            metadata=metadata or {}
        )
        
        # Cache compressed version
        if self.redis_client:
            cache_key = f"memory:{agent_id}:{memory_id}"
            await self.redis_client.setex(
                cache_key, 
                timedelta(hours=24).total_seconds(),
                compressed_content
            )
        
        print(f"💾 Stored persistent memory: {memory_id}")
        return memory_id
    
    async def retrieve_memory(self, agent_id: str, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieve memories using semantic search."""
        if not self.client:
            raise RuntimeError("Letta client not initialized")
        
        # Search archival memory
        memories = await self.client.get_archival_memory(
            agent_id=agent_id,
            query=query,
            limit=limit
        )
        
        return [
            {
                'id': memory.id,
                'content': memory.content,
                'metadata': memory.metadata,
                'created_at': memory.created_at,
                'relevance_score': getattr(memory, 'score', 0.0)
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
                human=context,
                persona=agent.memory.persona if agent.memory else ""
            )
        )
        
        print(f"🔄 Updated context window for agent: {agent_id}")
    
    async def compress_old_memories(self, agent_id: str, days_old: int = 30) -> int:
        """Compress memories older than specified days."""
        if not self.client:
            raise RuntimeError("Letta client not initialized")
        
        cutoff_date = datetime.now() - timedelta(days=days_old)
        
        # Get old memories
        all_memories = await self.client.get_archival_memory(
            agent_id=agent_id,
            limit=1000
        )
        
        compressed_count = 0
        
        for memory in all_memories:
            if memory.created_at < cutoff_date:
                # Compress and move to long-term storage
                compressed_content = self.compressor.compress(
                    memory.content.encode('utf-8')
                )
                
                # Store in HDD path
                storage_path = os.path.join(
                    self.config['storage']['hdd_context_path'],
                    f"compressed_{memory.id}.zst"
                )
                
                with open(storage_path, 'wb') as f:
                    f.write(compressed_content)
                
                compressed_count += 1
        
        print(f"🗜️  Compressed {compressed_count} old memories")
        return compressed_count
    
    async def sync_with_mem0(self, agent_id: str, mem0_memories: List[Dict[str, Any]]) -> int:
        """Sync Mem0 memories into Letta persistent storage."""
        if not self.client:
            raise RuntimeError("Letta client not initialized")
        
        synced_count = 0
        
        for memory in mem0_memories:
            await self.store_persistent_memory(
                agent_id=agent_id,
                content=memory.get('data', ''),
                metadata={
                    'source': 'mem0',
                    'mem0_id': memory.get('id'),
                    'user_id': memory.get('user_id'),
                    'original_created_at': memory.get('created_at')
                }
            )
            synced_count += 1
        
        print(f"🔄 Synced {synced_count} memories from Mem0")
        return synced_count
    
    async def sync_with_graphiti(self, agent_id: str, graph_entities: List[Dict[str, Any]]) -> int:
        """Sync Graphiti entities into Letta knowledge base."""
        if not self.client:
            raise RuntimeError("Letta client not initialized")
        
        synced_count = 0
        
        for entity in graph_entities:
            entity_description = f"Entity: {entity.get('name')} (Type: {entity.get('type')})"
            if entity.get('properties'):
                entity_description += f" Properties: {entity['properties']}"
            
            await self.store_persistent_memory(
                agent_id=agent_id,
                content=entity_description,
                metadata={
                    'source': 'graphiti',
                    'entity_id': entity.get('id'),
                    'entity_type': entity.get('type'),
                    'graph_id': entity.get('graph_id')
                }
            )
            synced_count += 1
        
        print(f"🔄 Synced {synced_count} entities from Graphiti")
        return synced_count
    
    async def get_agent_stats(self, agent_id: str) -> Dict[str, Any]:
        """Get comprehensive statistics for a memory agent."""
        if not self.client:
            raise RuntimeError("Letta client not initialized")
        
        agent = await self.client.get_agent(agent_id)
        memories = await self.client.get_archival_memory(
            agent_id=agent_id,
            limit=10000
        )
        
        return {
            'agent_id': agent_id,
            'agent_name': agent.name,
            'total_memories': len(memories),
            'context_window_size': self.config['performance']['context_window_size'],
            'memory_retention_days': self.config['performance']['memory_retention_days'],
            'storage_path': self.config['storage']['ssd_memory_path'],
            'cache_path': self.config['storage']['hdd_context_path'],
            'version': self.config['version']
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
            "You are the main memory agent for Cortex OS with persistent memory capabilities."
        )
        
        # Store sample persistent memory
        memory_id = await cortex_letta.store_persistent_memory(
            agent_id,
            "Phase 5 Letta integration completed successfully with persistent memory storage",
            {'phase': 5, 'integration': 'letta'}
        )
        
        # Retrieve memories
        memories = await cortex_letta.retrieve_memory(
            agent_id,
            "Phase 5 integration"
        )
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
`;

    const pythonPath = path.join(lettaDir, 'cortex_letta_integration.py');
    fs.writeFileSync(pythonPath, pythonIntegration);
    files.push(pythonPath);

    console.log(`  ✅ Created ${files.length} integration files`);
    return files;
  }

  private async createBridgeFiles(_config: LettaConfig): Promise<string[]> {
    console.log('🌉 Creating TypeScript bridge files...');

    const files: string[] = [];
    const bridgeDir = path.join(this.workspaceRoot, 'cortex-memories', 'letta', 'bridge');

    if (!fs.existsSync(bridgeDir)) {
      fs.mkdirSync(bridgeDir, { recursive: true });
    }

    // TypeScript bridge for Letta integration
    const tsBridge = `/**
 * TypeScript Bridge for Letta Integration
 * Phase 5: Persistent Memory and Context Management
 */

import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
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
    this.pythonPath = 'python3'; // Default Python path
    this.scriptPath = path.join(__dirname, '..', 'cortex_letta_integration.py');
  }
  
  /**
   * Create a new memory agent with persistent storage
   */
  async createMemoryAgent(name: string, systemPrompt?: string): Promise<string> {
    const result = await this.executePython('create_memory_agent', { 
      name, 
      system_prompt: systemPrompt 
    });
    return result.agent_id;
  }
  
  /**
   * Store content in persistent memory with compression
   */
  async storePersistentMemory(
    agentId: string, 
    content: string, 
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const result = await this.executePython('store_persistent_memory', { 
      agent_id: agentId, 
      content, 
      metadata 
    });
    return result.memory_id;
  }
  
  /**
   * Retrieve memories using semantic search
   */
  async retrieveMemory(
    agentId: string, 
    query: string, 
    limit: number = 10
  ): Promise<LettaMemory[]> {
    const result = await this.executePython('retrieve_memory', { 
      agent_id: agentId, 
      query, 
      limit 
    });
    return result.memories;
  }
  
  /**
   * Update the agent's context window
   */
  async updateContextWindow(agentId: string, context: string): Promise<void> {
    await this.executePython('update_context_window', { 
      agent_id: agentId, 
      context 
    });
  }
  
  /**
   * Compress memories older than specified days
   */
  async compressOldMemories(agentId: string, daysOld: number = 30): Promise<number> {
    const result = await this.executePython('compress_old_memories', { 
      agent_id: agentId, 
      days_old: daysOld 
    });
    return result.compressed_count;
  }
  
  /**
   * Sync Mem0 memories into Letta persistent storage
   */
  async syncWithMem0(agentId: string, mem0Memories: any[]): Promise<number> {
    const result = await this.executePython('sync_with_mem0', { 
      agent_id: agentId, 
      mem0_memories: mem0Memories 
    });
    return result.synced_count;
  }
  
  /**
   * Sync Graphiti entities into Letta knowledge base
   */
  async syncWithGraphiti(agentId: string, graphEntities: any[]): Promise<number> {
    const result = await this.executePython('sync_with_graphiti', { 
      agent_id: agentId, 
      graph_entities: graphEntities 
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
      'You are the unified memory system for Cortex OS, integrating Mem0, Graphiti, and Letta capabilities.'
    );
    
    // Store initialization memory
    await this.lettaBridge.storePersistentMemory(
      lettaAgent,
      'Unified Memory System initialized with Mem0, Graphiti, and Letta integration',
      {
        system: 'cortex_os',
        phase: 5,
        components: ['mem0', 'graphiti', 'letta'],
        status: 'initialized'
      }
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
    graphitiEntities: any[] = []
  ): Promise<{
    mem0Synced: number;
    graphitiSynced: number;
    totalMemories: number;
  }> {
    console.log('🔄 Syncing all memory systems...');
    
    const mem0Synced = mem0Memories.length > 0 
      ? await this.lettaBridge.syncWithMem0(agentId, mem0Memories)
      : 0;
    
    const graphitiSynced = graphitiEntities.length > 0 
      ? await this.lettaBridge.syncWithGraphiti(agentId, graphitiEntities)
      : 0;
    
    const stats = await this.lettaBridge.getAgentStats(agentId);
    
    return {
      mem0Synced,
      graphitiSynced,
      totalMemories: stats.total_memories
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
      'You are a test agent for Letta integration verification'
    );
    console.log(\`Created test agent: \${agentId}\`);
    
    // Store test memory
    const memoryId = await bridge.storePersistentMemory(
      agentId,
      'This is a test memory for Phase 5 Letta integration',
      { test: true, phase: 5 }
    );
    console.log(\`Stored memory: \${memoryId}\`);
    
    // Retrieve memories
    const memories = await bridge.retrieveMemory(agentId, 'test memory');
    console.log(\`Retrieved \${memories.length} memories\`);
    
    // Get stats
    const stats = await bridge.getAgentStats(agentId);
    console.log(\`Agent stats: \${JSON.stringify(stats, null, 2)}\`);
    
  } catch (error) {
    console.error('Letta integration test failed:', error);
  }
}
`;

    const bridgePath = path.join(bridgeDir, 'cortex-letta-bridge.ts');
    fs.writeFileSync(bridgePath, tsBridge);
    files.push(bridgePath);

    console.log(`  ✅ Created ${files.length} bridge files`);
    return files;
  }

  private async createTestFiles(config: LettaConfig): Promise<string[]> {
    console.log('🧪 Creating Letta test files...');

    const files: string[] = [];
    const testDir = path.join(this.workspaceRoot, 'cortex-memories', 'letta', 'tests');

    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // TypeScript test file
    const tsTest = `/**
 * Tests for Letta Integration
 * Phase 5: Persistent Memory and Context Management
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { CortexLettaBridge, UnifiedMemorySystem } from '../bridge/cortex-letta-bridge';

describe('Letta Integration Tests', () => {
  let lettaBridge: CortexLettaBridge;
  let unifiedMemory: UnifiedMemorySystem;
  let testAgentId: string;
  
  beforeAll(async () => {
    lettaBridge = new CortexLettaBridge();
    unifiedMemory = new UnifiedMemorySystem();
    
    // Create test memory agent
    testAgentId = await lettaBridge.createMemoryAgent(
      'test_letta_agent',
      'You are a test agent for Letta integration testing'
    );
  });
  
  test('should create and manage memory agents', async () => {
    expect(testAgentId).toBeDefined();
    expect(typeof testAgentId).toBe('string');
    
    const stats = await lettaBridge.getAgentStats(testAgentId);
    expect(stats).toHaveProperty('agent_id');
    expect(stats).toHaveProperty('agent_name');
    expect(stats.version).toBe('${config.version}');
  });
  
  test('should store and retrieve persistent memories', async () => {
    const testContent = 'Test persistent memory for Phase 5 integration';
    const testMetadata = { test: true, phase: 5, priority: 'high' };
    
    const memoryId = await lettaBridge.storePersistentMemory(
      testAgentId,
      testContent,
      testMetadata
    );
    
    expect(memoryId).toBeDefined();
    expect(typeof memoryId).toBe('string');
    
    const memories = await lettaBridge.retrieveMemory(testAgentId, 'test persistent');
    expect(Array.isArray(memories)).toBe(true);
    expect(memories.length).toBeGreaterThan(0);
    
    const retrievedMemory = memories.find(m => m.id === memoryId);
    expect(retrievedMemory).toBeDefined();
    expect(retrievedMemory?.content).toBe(testContent);
    expect(retrievedMemory?.metadata).toMatchObject(testMetadata);
  });
  
  test('should update context window', async () => {
    const contextUpdate = 'Updated context for test agent with new information';
    
    await expect(lettaBridge.updateContextWindow(testAgentId, contextUpdate))
      .resolves.not.toThrow();
    
    // Context update should not throw errors
    const stats = await lettaBridge.getAgentStats(testAgentId);
    expect(stats.context_window_size).toBe(${config.performance.context_window_size});
  });
  
  test('should compress old memories', async () => {
    // Add some test memories first
    for (let i = 0; i < 5; i++) {
      await lettaBridge.storePersistentMemory(
        testAgentId,
        \`Test memory \${i} for compression testing\`,
        { test: true, index: i }
      );
    }
    
    const compressedCount = await lettaBridge.compressOldMemories(testAgentId, 0);
    expect(typeof compressedCount).toBe('number');
    expect(compressedCount).toBeGreaterThanOrEqual(0);
  });
  
  test('should sync with Mem0 memories', async () => {
    const mockMem0Memories = [
      {
        id: 'mem0_test_1',
        data: 'Mem0 memory for Letta integration testing',
        user_id: 'cortex_system',
        created_at: new Date().toISOString()
      },
      {
        id: 'mem0_test_2',
        data: 'Another Mem0 memory for sync testing',
        user_id: 'cortex_system',
        created_at: new Date().toISOString()
      }
    ];
    
    const syncedCount = await lettaBridge.syncWithMem0(testAgentId, mockMem0Memories);
    expect(syncedCount).toBe(mockMem0Memories.length);
    
    // Verify memories were synced
    const memories = await lettaBridge.retrieveMemory(testAgentId, 'Mem0 memory');
    expect(memories.length).toBeGreaterThanOrEqual(1);
  });
  
  test('should sync with Graphiti entities', async () => {
    const mockGraphitiEntities = [
      {
        id: 'graphiti_entity_1',
        name: 'Test Entity',
        type: 'test',
        properties: { test: true },
        graph_id: 'test_graph'
      },
      {
        id: 'graphiti_entity_2',
        name: 'Another Entity',
        type: 'test',
        properties: { test: true, category: 'sync' },
        graph_id: 'test_graph'
      }
    ];
    
    const syncedCount = await lettaBridge.syncWithGraphiti(testAgentId, mockGraphitiEntities);
    expect(syncedCount).toBe(mockGraphitiEntities.length);
    
    // Verify entities were synced
    const memories = await lettaBridge.retrieveMemory(testAgentId, 'Entity');
    expect(memories.length).toBeGreaterThanOrEqual(1);
  });
  
  test('should get comprehensive agent statistics', async () => {
    const stats = await lettaBridge.getAgentStats(testAgentId);
    
    expect(stats).toHaveProperty('agent_id');
    expect(stats).toHaveProperty('agent_name');
    expect(stats).toHaveProperty('total_memories');
    expect(stats).toHaveProperty('context_window_size');
    expect(stats).toHaveProperty('memory_retention_days');
    expect(stats).toHaveProperty('storage_path');
    expect(stats).toHaveProperty('cache_path');
    expect(stats).toHaveProperty('version');
    
    expect(stats.agent_id).toBe(testAgentId);
    expect(typeof stats.total_memories).toBe('number');
    expect(stats.context_window_size).toBe(${config.performance.context_window_size});
    expect(stats.memory_retention_days).toBe(${config.performance.memory_retention_days});
    expect(stats.storage_path).toContain('cortex-data');
    expect(stats.cache_path).toContain('cortex-cache');
    expect(stats.version).toBe('${config.version}');
  });
});

describe('Unified Memory System Tests', () => {
  let unifiedMemory: UnifiedMemorySystem;
  
  beforeAll(() => {
    unifiedMemory = new UnifiedMemorySystem();
  });
  
  test('should initialize unified memory system', async () => {
    const result = await unifiedMemory.initialize();
    
    expect(result).toHaveProperty('lettaAgent');
    expect(result).toHaveProperty('memoryStats');
    expect(typeof result.lettaAgent).toBe('string');
    expect(result.memoryStats).toHaveProperty('total_memories');
  });
  
  test('should sync all memory systems together', async () => {
    const { lettaAgent } = await unifiedMemory.initialize();
    
    const mockMem0Memories = [
      { id: 'unified_mem0_1', data: 'Unified memory test', user_id: 'system', created_at: new Date().toISOString() }
    ];
    
    const mockGraphitiEntities = [
      { id: 'unified_graphiti_1', name: 'Unified Entity', type: 'test', graph_id: 'unified_graph' }
    ];
    
    const result = await unifiedMemory.syncAllMemorySystems(
      lettaAgent,
      mockMem0Memories,
      mockGraphitiEntities
    );
    
    expect(result).toHaveProperty('mem0Synced');
    expect(result).toHaveProperty('graphitiSynced');
    expect(result).toHaveProperty('totalMemories');
    expect(result.mem0Synced).toBe(1);
    expect(result.graphitiSynced).toBe(1);
    expect(typeof result.totalMemories).toBe('number');
  });
});

describe('Performance and Reliability Tests', () => {
  test('should handle memory operations efficiently', async () => {
    const bridge = new CortexLettaBridge();
    const agentId = await bridge.createMemoryAgent('performance_test_agent');
    
    const startTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < 10; i++) {
      promises.push(bridge.storePersistentMemory(
        agentId,
        \`Performance test memory \${i}\`,
        { test: true, index: i }
      ));
    }
    
    await Promise.all(promises);
    const endTime = Date.now();
    
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    
    const stats = await bridge.getAgentStats(agentId);
    expect(stats.total_memories).toBeGreaterThanOrEqual(10);
  });
});
`;

    const testPath = path.join(testDir, 'letta-integration.test.ts');
    fs.writeFileSync(testPath, tsTest);
    files.push(testPath);

    console.log(`  ✅ Created ${files.length} test files`);
    return files;
  }

  private async setupMemoryProfiles(_config: LettaConfig): Promise<{
    short_term: string;
    long_term: string;
    persistent: string;
  }> {
    console.log('📊 Setting up memory profiles...');

    // Create profiles directory
    const profilesDir = path.join(this.workspaceRoot, 'cortex-memories', 'letta', 'profiles');
    if (!fs.existsSync(profilesDir)) {
      fs.mkdirSync(profilesDir, { recursive: true });
    }

    // Short-term memory profile
    const shortTermProfile = {
      name: 'short_term',
      description: 'Short-term memory for immediate context and recent interactions',
      retention_days: 7,
      compression_enabled: false,
      cache_priority: 'high',
      storage_location: 'ssd',
    };

    const shortTermPath = path.join(profilesDir, 'short-term-profile.json');
    fs.writeFileSync(shortTermPath, JSON.stringify(shortTermProfile, null, 2));

    // Long-term memory profile
    const longTermProfile = {
      name: 'long_term',
      description: 'Long-term memory for important information and patterns',
      retention_days: 365,
      compression_enabled: true,
      cache_priority: 'medium',
      storage_location: 'hybrid',
    };

    const longTermPath = path.join(profilesDir, 'long-term-profile.json');
    fs.writeFileSync(longTermPath, JSON.stringify(longTermProfile, null, 2));

    // Persistent memory profile
    const persistentProfile = {
      name: 'persistent',
      description: 'Persistent memory for critical system information and knowledge',
      retention_days: -1, // Never expire
      compression_enabled: true,
      cache_priority: 'low',
      storage_location: 'hdd',
    };

    const persistentPath = path.join(profilesDir, 'persistent-profile.json');
    fs.writeFileSync(persistentPath, JSON.stringify(persistentProfile, null, 2));

    return {
      short_term: shortTermPath,
      long_term: longTermPath,
      persistent: persistentPath,
    };
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const integrator = new LettaIntegrator();
  integrator
    .integrateLetta()
    .then(() => {
      console.log('🎯 Phase 5 complete! Ready for Phase 6: Advanced Memory Libraries Setup');
    })
    .catch((error) => {
      console.error('❌ Phase 5 failed:', error);
      process.exit(1);
    });
}

export { LettaIntegrator };
export type { LettaConfig, LettaIntegration };
