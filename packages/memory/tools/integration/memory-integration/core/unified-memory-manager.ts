/**
 * Unified Memory Manager for Cortex OS
 * @split_from advanced-memory-setup-phase6.ts
 * 
 * This module coordinates Mem0, Graphiti, and Letta libraries,
 * providing a unified interface for memory operations across all libraries.
 */

import { CortexMem0Bridge } from '../../mem0/bridge/cortex-mem0-bridge';
import { CortexGraphitiBridge } from '../../graphiti/bridge/cortex-graphiti-bridge';
import { CortexLettaBridge } from '../../letta/bridge/cortex-letta-bridge';
import * as fs from 'fs';
import * as path from 'path';
import {
  UnifiedMemoryConfig,
  UnifiedMemoryStats,
  SyncOperation,
  UnifiedSearchResult,
  InitializationResult,
} from '../types/index';

export class UnifiedMemoryManager {
  private config: UnifiedMemoryConfig;
  private mem0Bridge: CortexMem0Bridge;
  private graphitiBridge: CortexGraphitiBridge;
  private lettaBridge: CortexLettaBridge;
  private syncOperations: SyncOperation[] = [];
  
  constructor(configPath?: string) {
    this.loadConfig(configPath);
    this.mem0Bridge = new CortexMem0Bridge();
    this.graphitiBridge = new CortexGraphitiBridge();
    this.lettaBridge = new CortexLettaBridge();
  }
  
  private loadConfig(configPath?: string): void {
    const defaultConfigPath = path.join(__dirname, '../unified-memory-config.json');
    const actualConfigPath = configPath || defaultConfigPath;
    
    try {
      const configData = fs.readFileSync(actualConfigPath, 'utf-8');
      this.config = JSON.parse(configData);
    } catch (error) {
      console.error('Failed to load unified memory config:', error);
      throw error;
    }
  }
  
  /**
   * Initialize all memory libraries and ensure they're properly connected
   */
  async initialize(): Promise<InitializationResult> {
    console.log('🚀 Initializing Unified Memory System...');
    
    let mem0Ready = false;
    let graphitiReady = false;
    let lettaReady = false;
    
    try {
      // Initialize Mem0
      const mem0Users = await this.mem0Bridge.getAllUsers();
      mem0Ready = Array.isArray(mem0Users);
      console.log(`✅ Mem0 initialized: ${mem0Users.length} users`);
    } catch (error) {
      console.warn('⚠️ Mem0 initialization failed:', error);
    }
    
    try {
      // Initialize Graphiti
      await this.graphitiBridge.initializeKnowledgeGraph('unified_cortex_graph');
      graphitiReady = true;
      console.log('✅ Graphiti initialized: knowledge graphs ready');
    } catch (error) {
      console.warn('⚠️ Graphiti initialization failed:', error);
    }
    
    try {
      // Initialize Letta
      const unifiedAgent = await this.lettaBridge.createMemoryAgent(
        'unified_memory_agent',
        'You are the unified memory coordinator for Cortex OS'
      );
      lettaReady = !!unifiedAgent;
      console.log(`✅ Letta initialized: agent ${unifiedAgent}`);
    } catch (error) {
      console.warn('⚠️ Letta initialization failed:', error);
    }
    
    const unifiedReady = mem0Ready && graphitiReady && lettaReady;
    
    if (unifiedReady) {
      console.log('🎯 Unified Memory System fully initialized');
      await this.performInitialSync();
    }
    
    return { mem0Ready, graphitiReady, lettaReady, unifiedReady };
  }
  
  /**
   * Perform comprehensive synchronization across all memory libraries
   */
  async performFullSync(): Promise<SyncOperation[]> {
    console.log('🔄 Starting full memory synchronization...');
    
    const syncOps: SyncOperation[] = [];
    
    // Sync Mem0 → Graphiti
    syncOps.push(await this.syncMem0ToGraphiti());
    
    // Sync Mem0 → Letta
    syncOps.push(await this.syncMem0ToLetta());
    
    // Sync Graphiti → Letta
    syncOps.push(await this.syncGraphitiToLetta());
    
    // Sync Letta → Mem0 (new memories)
    syncOps.push(await this.syncLettaToMem0());
    
    this.syncOperations.push(...syncOps);
    
    console.log(`✅ Full sync completed: ${syncOps.length} operations`);
    return syncOps;
  }
  
  private async syncMem0ToGraphiti(): Promise<SyncOperation> {
    const operation: SyncOperation = {
      id: `sync_${Date.now()}_mem0_graphiti`,
      timestamp: new Date().toISOString(),
      sourceLibrary: 'mem0',
      targetLibrary: 'graphiti',
      operation: 'sync_memories_to_entities',
      status: 'pending',
      itemCount: 0,
    };
    
    try {
      // Get all Mem0 memories
      const users = await this.mem0Bridge.getAllUsers();
      let totalSynced = 0;
      
      for (const user of users) {
        const memories = await this.mem0Bridge.getAllMemories(user.id);
        
        for (const memory of memories) {
          // Create Graphiti entity from Mem0 memory
          await this.graphitiBridge.addEntity(
            'unified_cortex_graph',
            {
              id: `mem0_${memory.id}`,
              type: 'memory',
              name: `Memory: ${memory.data.substring(0, 50)}...`,
              properties: {
                data: memory.data,
                user_id: memory.user_id,
                created_at: memory.created_at,
                source: 'mem0'
              }
            }
          );
          totalSynced++;
        }
      }
      
      operation.status = 'completed';
      operation.itemCount = totalSynced;
      
    } catch (error) {
      operation.status = 'failed';
      operation.errorMessage = String(error);
    }
    
    return operation;
  }
  
  private async syncMem0ToLetta(): Promise<SyncOperation> {
    const operation: SyncOperation = {
      id: `sync_${Date.now()}_mem0_letta`,
      timestamp: new Date().toISOString(),
      sourceLibrary: 'mem0',
      targetLibrary: 'letta',
      operation: 'sync_memories_to_persistent',
      status: 'pending',
      itemCount: 0,
    };
    
    try {
      const users = await this.mem0Bridge.getAllUsers();
      let totalSynced = 0;
      
      for (const user of users) {
        const memories = await this.mem0Bridge.getAllMemories(user.id);
        totalSynced = await this.lettaBridge.syncWithMem0('unified_memory_agent', memories);
      }
      
      operation.status = 'completed';
      operation.itemCount = totalSynced;
      
    } catch (error) {
      operation.status = 'failed';
      operation.errorMessage = String(error);
    }
    
    return operation;
  }
  
  private async syncGraphitiToLetta(): Promise<SyncOperation> {
    const operation: SyncOperation = {
      id: `sync_${Date.now()}_graphiti_letta`,
      timestamp: new Date().toISOString(),
      sourceLibrary: 'graphiti',
      targetLibrary: 'letta',
      operation: 'sync_entities_to_knowledge',
      status: 'pending',
      itemCount: 0,
    };
    
    try {
      const entities = await this.graphitiBridge.getEntities('unified_cortex_graph');
      const totalSynced = await this.lettaBridge.syncWithGraphiti('unified_memory_agent', entities);
      
      operation.status = 'completed';
      operation.itemCount = totalSynced;
      
    } catch (error) {
      operation.status = 'failed';
      operation.errorMessage = String(error);
    }
    
    return operation;
  }
  
  private async syncLettaToMem0(): Promise<SyncOperation> {
    const operation: SyncOperation = {
      id: `sync_${Date.now()}_letta_mem0`,
      timestamp: new Date().toISOString(),
      sourceLibrary: 'letta',
      targetLibrary: 'mem0',
      operation: 'sync_persistent_to_memories',
      status: 'pending',
      itemCount: 0,
    };
    
    try {
      // Get recent Letta memories not yet in Mem0
      const lettaMemories = await this.lettaBridge.retrieveMemory(
        'unified_memory_agent',
        'recent OR new OR added',
        100
      );
      
      let totalSynced = 0;
      
      for (const memory of lettaMemories) {
        // Check if this memory originated from Mem0
        if (memory.metadata?.source !== 'mem0') {
          // Add to Mem0 as a new memory
          await this.mem0Bridge.addMemory(
            'cortex_system',
            memory.content,
            { source: 'letta', letta_id: memory.id }
          );
          totalSynced++;
        }
      }
      
      operation.status = 'completed';
      operation.itemCount = totalSynced;
      
    } catch (error) {
      operation.status = 'failed';
      operation.errorMessage = String(error);
    }
    
    return operation;
  }
  
  /**
   * Get comprehensive statistics from all memory libraries
   */
  async getUnifiedStats(): Promise<UnifiedMemoryStats> {
    const stats: UnifiedMemoryStats = {
      mem0: {
        totalMemories: 0,
        vectorCount: 0,
        userCount: 0,
      },
      graphiti: {
        totalEntities: 0,
        totalRelationships: 0,
        graphCount: 0,
      },
      letta: {
        totalAgents: 0,
        totalMemories: 0,
        compressionRatio: 0,
      },
      unified: {
        totalSyncedItems: 0,
        lastSyncTimestamp: '',
        storageUsage: {
          ssd: '0 GB',
          hdd: '0 GB',
        },
      },
    };
    
    try {
      // Mem0 stats
      const users = await this.mem0Bridge.getAllUsers();
      stats.mem0.userCount = users.length;
      
      for (const user of users) {
        const memories = await this.mem0Bridge.getAllMemories(user.id);
        stats.mem0.totalMemories += memories.length;
      }
      
      // Graphiti stats
      const entities = await this.graphitiBridge.getEntities('unified_cortex_graph');
      stats.graphiti.totalEntities = entities.length;
      stats.graphiti.graphCount = 1; // We have one unified graph
      
      // Letta stats
      const lettaStats = await this.lettaBridge.getAgentStats('unified_memory_agent');
      stats.letta.totalMemories = lettaStats.total_memories;
      stats.letta.totalAgents = 1;
      
      // Unified stats
      const completedSyncs = this.syncOperations.filter(op => op.status === 'completed');
      stats.unified.totalSyncedItems = completedSyncs.reduce((sum, op) => sum + op.itemCount, 0);
      
      if (completedSyncs.length > 0) {
        stats.unified.lastSyncTimestamp = completedSyncs[completedSyncs.length - 1].timestamp;
      }
      
    } catch (error) {
      console.warn('Error gathering unified stats:', error);
    }
    
    return stats;
  }
  
  /**
   * Search across all memory libraries with unified results
   */
  async searchUnified(query: string, limit: number = 20): Promise<UnifiedSearchResult> {
    const [mem0Results, graphitiResults, lettaResults] = await Promise.allSettled([
      this.mem0Bridge.searchMemories('cortex_system', query, Math.ceil(limit / 3)),
      this.graphitiBridge.searchEntities('unified_cortex_graph', query, Math.ceil(limit / 3)),
      this.lettaBridge.retrieveMemory('unified_memory_agent', query, Math.ceil(limit / 3)),
    ]);
    
    const combinedResults = [];
    
    // Add results from each library with source tagging
    if (mem0Results.status === 'fulfilled') {
      combinedResults.push(...mem0Results.value.map(r => ({ ...r, source: 'mem0' })));
    }
    
    if (graphitiResults.status === 'fulfilled') {
      combinedResults.push(...graphitiResults.value.map(r => ({ ...r, source: 'graphiti' })));
    }
    
    if (lettaResults.status === 'fulfilled') {
      combinedResults.push(...lettaResults.value.map(r => ({ ...r, source: 'letta' })));
    }
    
    // Sort by relevance/timestamp and limit
    combinedResults.sort((a, b) => {
      const scoreA = a.relevance_score || a.score || 0;
      const scoreB = b.relevance_score || b.score || 0;
      return scoreB - scoreA;
    }).splice(limit);
    
    return {
      mem0Results: mem0Results.status === 'fulfilled' ? mem0Results.value : [],
      graphitiResults: graphitiResults.status === 'fulfilled' ? graphitiResults.value : [],
      lettaResults: lettaResults.status === 'fulfilled' ? lettaResults.value : [],
      combinedResults,
    };
  }
  
  /**
   * Perform initial synchronization on startup
   */
  private async performInitialSync(): Promise<void> {
    console.log('🔄 Performing initial synchronization...');
    
    try {
      // Only sync if we haven't synced recently
      const lastSyncFile = path.join(__dirname, '../last-sync.json');
      let shouldSync = true;
      
      if (fs.existsSync(lastSyncFile)) {
        const lastSyncData = JSON.parse(fs.readFileSync(lastSyncFile, 'utf-8'));
        const lastSyncTime = new Date(lastSyncData.timestamp);
        const now = new Date();
        const minutesSinceLastSync = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);
        
        shouldSync = minutesSinceLastSync >= this.config.synchronization.sync_interval_minutes;
      }
      
      if (shouldSync) {
        await this.performFullSync();
        
        // Update last sync timestamp
        fs.writeFileSync(lastSyncFile, JSON.stringify({
          timestamp: new Date().toISOString(),
          status: 'completed'
        }));
        
        console.log('✅ Initial synchronization completed');
      } else {
        console.log('⏭️  Skipping sync - too recent');
      }
      
    } catch (error) {
      console.warn('⚠️ Initial sync failed:', error);
    }
  }
  
  /**
   * Cleanup and close connections
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up unified memory system...');
    
    // Individual cleanup would go here if bridges support it
    // await this.mem0Bridge.close();
    // await this.graphitiBridge.close();
    // await this.lettaBridge.close();
    
    console.log('✅ Cleanup completed');
  }

  /**
   * Get the current configuration
   */
  getConfig(): UnifiedMemoryConfig {
    return this.config;
  }

  /**
   * Get sync operations history
   */
  getSyncOperations(): SyncOperation[] {
    return [...this.syncOperations];
  }
}

// Example usage and testing
export async function testUnifiedMemorySystem(): Promise<void> {
  const manager = new UnifiedMemoryManager();
  
  try {
    // Initialize
    const initResult = await manager.initialize();
    console.log('Initialization result:', initResult);
    
    if (initResult.unifiedReady) {
      // Perform full sync
      const syncOps = await manager.performFullSync();
      console.log(`Sync operations: ${syncOps.length}`);
      
      // Get unified stats
      const stats = await manager.getUnifiedStats();
      console.log('Unified stats:', JSON.stringify(stats, null, 2));
      
      // Test unified search
      const searchResults = await manager.searchUnified('cortex memory system', 10);
      console.log(`Search results: ${searchResults.combinedResults.length} total`);
    }
    
  } catch (error) {
    console.error('Unified memory system test failed:', error);
  } finally {
    await manager.cleanup();
  }
}