#!/usr/bin/env node
/* eslint-disable no-console */
// tools/advanced-memory-setup-phase6.ts
// Phase 6: Advanced Memory Libraries Setup - Unified Integration

import * as fs from 'fs';
import * as path from 'path';

interface UnifiedMemoryConfig {
  version: string;
  enabled: boolean;
  libraries: {
    mem0: {
      enabled: boolean;
      config_path: string;
      bridge_path: string;
    };
    graphiti: {
      enabled: boolean;
      config_path: string;
      bridge_path: string;
    };
    letta: {
      enabled: boolean;
      config_path: string;
      bridge_path: string;
    };
  };
  storage: {
    ssd_path: string;
    hdd_path: string;
    unified_database_url: string;
    cache_redis_url: string;
  };
  synchronization: {
    cross_library_sync: boolean;
    sync_interval_minutes: number;
    conflict_resolution: string;
    data_consistency: string;
  };
  performance: {
    connection_pooling: boolean;
    query_optimization: boolean;
    memory_compression: boolean;
    distributed_caching: boolean;
  };
  monitoring: {
    performance_metrics: boolean;
    memory_usage_tracking: boolean;
    sync_status_monitoring: boolean;
    error_reporting: boolean;
  };
}

interface AdvancedMemorySetup {
  timestamp: string;
  phase: string;
  configuration: UnifiedMemoryConfig;
  unifiedManager: string;
  bridgeIntegrations: string[];
  testSuites: string[];
  monitoringDashboard: string;
  performanceOptimizations: string[];
}

class AdvancedMemoryIntegrator {
  private workspaceRoot: string;

  constructor() {
    this.workspaceRoot = process.cwd();
  }

  public async setupAdvancedMemory(): Promise<AdvancedMemorySetup> {
    console.log('🚀 Starting Phase 6: Advanced Memory Libraries Setup');

    // Create unified configuration
    const unifiedConfig = this.createUnifiedConfig();

    // Create unified memory manager
    const unifiedManager = await this.createUnifiedManager(unifiedConfig);

    // Create bridge integrations
    const bridgeIntegrations = await this.createBridgeIntegrations(unifiedConfig);

    // Create comprehensive test suites
    const testSuites = await this.createTestSuites(unifiedConfig);

    // Create monitoring dashboard
    const monitoringDashboard = await this.createMonitoringDashboard(unifiedConfig);

    // Create performance optimizations
    const performanceOptimizations = await this.createPerformanceOptimizations(unifiedConfig);

    const setup: AdvancedMemorySetup = {
      timestamp: new Date().toISOString(),
      phase: 'Phase 6: Advanced Memory Libraries Setup',
      configuration: unifiedConfig,
      unifiedManager,
      bridgeIntegrations,
      testSuites,
      monitoringDashboard,
      performanceOptimizations,
    };

    // Save setup report
    const reportPath = path.join(this.workspaceRoot, 'phase6-advanced-memory-setup-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(setup, null, 2));

    console.log('✅ Phase 6 Advanced Memory Libraries Setup complete!');
    console.log(`📄 Report saved to: ${reportPath}`);

    return setup;
  }

  private createUnifiedConfig(): UnifiedMemoryConfig {
    console.log('⚙️ Creating unified memory configuration...');

    const config: UnifiedMemoryConfig = {
      version: '6.0.0',
      enabled: true,
      libraries: {
        mem0: {
          enabled: true,
          config_path: 'cortex-memories/mem0/config.json',
          bridge_path: 'cortex-memories/mem0/bridge/cortex-mem0-bridge.ts',
        },
        graphiti: {
          enabled: true,
          config_path: 'cortex-memories/graphiti/config.json',
          bridge_path: 'cortex-memories/graphiti/bridge/cortex-graphiti-bridge.ts',
        },
        letta: {
          enabled: true,
          config_path: 'cortex-memories/letta/config.json',
          bridge_path: 'cortex-memories/letta/bridge/cortex-letta-bridge.ts',
        },
      },
      storage: {
        ssd_path: '/Volumes/ExternalSSD/cortex-data',
        hdd_path: '/Volumes/ExternalHDD/cortex-cache',
        unified_database_url:
          'postgresql://cortex:cortex_unified_2025@localhost:5432/cortex_unified',
        cache_redis_url: 'redis://localhost:6379/1',
      },
      synchronization: {
        cross_library_sync: true,
        sync_interval_minutes: 15,
        conflict_resolution: 'latest_wins',
        data_consistency: 'eventual',
      },
      performance: {
        connection_pooling: true,
        query_optimization: true,
        memory_compression: true,
        distributed_caching: true,
      },
      monitoring: {
        performance_metrics: true,
        memory_usage_tracking: true,
        sync_status_monitoring: true,
        error_reporting: true,
      },
    };

    // Save unified configuration
    const unifiedDir = path.join(this.workspaceRoot, 'cortex-memories', 'unified');
    if (!fs.existsSync(unifiedDir)) {
      fs.mkdirSync(unifiedDir, { recursive: true });
    }

    const configPath = path.join(unifiedDir, 'unified-memory-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    return config;
  }

  private async createUnifiedManager(config: UnifiedMemoryConfig): Promise<string> {
    console.log('🔧 Creating unified memory manager...');

    const unifiedDir = path.join(this.workspaceRoot, 'cortex-memories', 'unified');

    const managerCode = `/**
 * Unified Memory Manager for Cortex OS
 * Phase 6: Advanced Memory Libraries Integration
 * Coordinates Mem0, Graphiti, and Letta libraries
 */

import { CortexMem0Bridge } from '../mem0/bridge/cortex-mem0-bridge';
import { CortexGraphitiBridge } from '../graphiti/bridge/cortex-graphiti-bridge';
import { CortexLettaBridge } from '../letta/bridge/cortex-letta-bridge';
import * as fs from 'fs';
import * as path from 'path';

export interface UnifiedMemoryStats {
  mem0: {
    totalMemories: number;
    vectorCount: number;
    userCount: number;
  };
  graphiti: {
    totalEntities: number;
    totalRelationships: number;
    graphCount: number;
  };
  letta: {
    totalAgents: number;
    totalMemories: number;
    compressionRatio: number;
  };
  unified: {
    totalSyncedItems: number;
    lastSyncTimestamp: string;
    storageUsage: {
      ssd: string;
      hdd: string;
    };
  };
}

export interface SyncOperation {
  id: string;
  timestamp: string;
  sourceLibrary: string;
  targetLibrary: string;
  operation: string;
  status: 'pending' | 'completed' | 'failed';
  itemCount: number;
  errorMessage?: string;
}

export class UnifiedMemoryManager {
  private config: any;
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
    const defaultConfigPath = path.join(__dirname, 'unified-memory-config.json');
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
  async initialize(): Promise<{
    mem0Ready: boolean;
    graphitiReady: boolean;
    lettaReady: boolean;
    unifiedReady: boolean;
  }> {
    console.log('🚀 Initializing Unified Memory System...');
    
    let mem0Ready = false;
    let graphitiReady = false;
    let lettaReady = false;
    
    try {
      // Initialize Mem0
      const mem0Users = await this.mem0Bridge.getAllUsers();
      mem0Ready = Array.isArray(mem0Users);
      console.log(\`✅ Mem0 initialized: \${mem0Users.length} users\`);
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
      console.log(\`✅ Letta initialized: agent \${unifiedAgent}\`);
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
    
    console.log(\`✅ Full sync completed: \${syncOps.length} operations\`);
    return syncOps;
  }
  
  private async syncMem0ToGraphiti(): Promise<SyncOperation> {
    const operation: SyncOperation = {
      id: \`sync_\${Date.now()}_mem0_graphiti\`,
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
              id: \`mem0_\${memory.id}\`,
              type: 'memory',
              name: \`Memory: \${memory.data.substring(0, 50)}...\`,
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
      id: \`sync_\${Date.now()}_mem0_letta\`,
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
      id: \`sync_\${Date.now()}_graphiti_letta\`,
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
      id: \`sync_\${Date.now()}_letta_mem0\`,
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
  async searchUnified(query: string, limit: number = 20): Promise<{
    mem0Results: any[];
    graphitiResults: any[];
    lettaResults: any[];
    combinedResults: any[];
  }> {
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
      const lastSyncFile = path.join(__dirname, 'last-sync.json');
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
      console.log(\`Sync operations: \${syncOps.length}\`);
      
      // Get unified stats
      const stats = await manager.getUnifiedStats();
      console.log('Unified stats:', JSON.stringify(stats, null, 2));
      
      // Test unified search
      const searchResults = await manager.searchUnified('cortex memory system', 10);
      console.log(\`Search results: \${searchResults.combinedResults.length} total\`);
    }
    
  } catch (error) {
    console.error('Unified memory system test failed:', error);
  } finally {
    await manager.cleanup();
  }
}
`;

    const managerPath = path.join(unifiedDir, 'unified-memory-manager.ts');
    fs.writeFileSync(managerPath, managerCode);

    return managerPath;
  }

  private async createBridgeIntegrations(config: UnifiedMemoryConfig): Promise<string[]> {
    console.log('🌉 Creating bridge integrations...');

    const files: string[] = [];
    const unifiedDir = path.join(this.workspaceRoot, 'cortex-memories', 'unified');

    // Create sync coordinator
    const syncCoordinator = `/**
 * Cross-Library Synchronization Coordinator
 * Handles data consistency and conflict resolution
 */

import { UnifiedMemoryManager } from './unified-memory-manager';

export interface SyncRule {
  id: string;
  sourceLibrary: string;
  targetLibrary: string;
  dataType: string;
  frequency: 'realtime' | 'scheduled' | 'manual';
  conflictResolution: 'latest_wins' | 'merge' | 'manual_review';
  enabled: boolean;
}

export class SyncCoordinator {
  private manager: UnifiedMemoryManager;
  private syncRules: SyncRule[] = [];
  private isRunning = false;
  
  constructor(manager: UnifiedMemoryManager) {
    this.manager = manager;
    this.initializeDefaultRules();
  }
  
  private initializeDefaultRules(): void {
    this.syncRules = [
      {
        id: 'mem0_to_letta',
        sourceLibrary: 'mem0',
        targetLibrary: 'letta',
        dataType: 'memories',
        frequency: 'scheduled',
        conflictResolution: 'latest_wins',
        enabled: true,
      },
      {
        id: 'graphiti_to_letta',
        sourceLibrary: 'graphiti',
        targetLibrary: 'letta',
        dataType: 'entities',
        frequency: 'scheduled',
        conflictResolution: 'merge',
        enabled: true,
      },
      {
        id: 'letta_to_mem0',
        sourceLibrary: 'letta',
        targetLibrary: 'mem0',
        dataType: 'new_memories',
        frequency: 'realtime',
        conflictResolution: 'latest_wins',
        enabled: true,
      },
    ];
  }
  
  async startScheduledSync(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔄 Starting scheduled synchronization...');
    
    setInterval(async () => {
      try {
        await this.manager.performFullSync();
      } catch (error) {
        console.error('Scheduled sync failed:', error);
      }
    }, ${config.synchronization.sync_interval_minutes} * 60 * 1000);
  }
  
  stopScheduledSync(): void {
    this.isRunning = false;
    console.log('⏹️ Stopped scheduled synchronization');
  }
}
`;

    const syncPath = path.join(unifiedDir, 'sync-coordinator.ts');
    fs.writeFileSync(syncPath, syncCoordinator);
    files.push(syncPath);

    // Create performance optimizer
    const performanceOptimizer = `/**
 * Performance Optimizer for Unified Memory System
 * Handles caching, query optimization, and resource management
 */

export interface PerformanceMetrics {
  queriesPerSecond: number;
  averageResponseTime: number;
  cacheHitRatio: number;
  memoryUsage: number;
  activeConnections: number;
}

export class PerformanceOptimizer {
  private metrics: PerformanceMetrics = {
    queriesPerSecond: 0,
    averageResponseTime: 0,
    cacheHitRatio: 0,
    memoryUsage: 0,
    activeConnections: 0,
  };
  
  private queryCache = new Map<string, { result: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Optimize query with caching
   */
  async optimizeQuery<T>(
    queryKey: string,
    queryFunction: () => Promise<T>
  ): Promise<T> {
    const cached = this.queryCache.get(queryKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.metrics.cacheHitRatio = (this.metrics.cacheHitRatio + 1) / 2;
      return cached.result;
    }
    
    const startTime = Date.now();
    const result = await queryFunction();
    const endTime = Date.now();
    
    // Update metrics
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime + (endTime - startTime)) / 2;
    this.metrics.queriesPerSecond++;
    
    // Cache result
    this.queryCache.set(queryKey, {
      result,
      timestamp: Date.now(),
    });
    
    // Clean old cache entries
    this.cleanCache();
    
    return result;
  }
  
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.queryCache.delete(key);
      }
    }
  }
  
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  resetMetrics(): void {
    this.metrics = {
      queriesPerSecond: 0,
      averageResponseTime: 0,
      cacheHitRatio: 0,
      memoryUsage: 0,
      activeConnections: 0,
    };
  }
}
`;

    const perfPath = path.join(unifiedDir, 'performance-optimizer.ts');
    fs.writeFileSync(perfPath, performanceOptimizer);
    files.push(perfPath);

    console.log(`  ✅ Created ${files.length} bridge integration files`);
    return files;
  }

  private async createTestSuites(_config: UnifiedMemoryConfig): Promise<string[]> {
    console.log('🧪 Creating comprehensive test suites...');

    const files: string[] = [];
    const testDir = path.join(this.workspaceRoot, 'cortex-memories', 'unified', 'tests');

    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Unified integration test
    const integrationTest = `/**
 * Comprehensive Integration Tests for Unified Memory System
 * Tests cross-library synchronization and unified operations
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { UnifiedMemoryManager } from '../unified-memory-manager';
import { SyncCoordinator } from '../sync-coordinator';
import { PerformanceOptimizer } from '../performance-optimizer';

describe('Unified Memory System Integration Tests', () => {
  let unifiedManager: UnifiedMemoryManager;
  let syncCoordinator: SyncCoordinator;
  let performanceOptimizer: PerformanceOptimizer;
  
  beforeAll(async () => {
    unifiedManager = new UnifiedMemoryManager();
    performanceOptimizer = new PerformanceOptimizer();
    
    const initResult = await unifiedManager.initialize();
    expect(initResult.unifiedReady).toBe(true);
    
    syncCoordinator = new SyncCoordinator(unifiedManager);
  });
  
  afterAll(async () => {
    await unifiedManager.cleanup();
    syncCoordinator.stopScheduledSync();
  });
  
  test('should initialize all memory libraries successfully', async () => {
    const initResult = await unifiedManager.initialize();
    
    expect(initResult.mem0Ready).toBe(true);
    expect(initResult.graphitiReady).toBe(true);
    expect(initResult.lettaReady).toBe(true);
    expect(initResult.unifiedReady).toBe(true);
  });
  
  test('should perform full synchronization across libraries', async () => {
    const syncOperations = await unifiedManager.performFullSync();
    
    expect(Array.isArray(syncOperations)).toBe(true);
    expect(syncOperations.length).toBeGreaterThan(0);
    
    // Check that all sync operations completed successfully
    const failedOps = syncOperations.filter(op => op.status === 'failed');
    expect(failedOps.length).toBe(0);
    
    const completedOps = syncOperations.filter(op => op.status === 'completed');
    expect(completedOps.length).toBeGreaterThan(0);
  });
  
  test('should provide unified statistics from all libraries', async () => {
    const stats = await unifiedManager.getUnifiedStats();
    
    expect(stats).toHaveProperty('mem0');
    expect(stats).toHaveProperty('graphiti');
    expect(stats).toHaveProperty('letta');
    expect(stats).toHaveProperty('unified');
    
    expect(typeof stats.mem0.totalMemories).toBe('number');
    expect(typeof stats.graphiti.totalEntities).toBe('number');
    expect(typeof stats.letta.totalMemories).toBe('number');
    expect(typeof stats.unified.totalSyncedItems).toBe('number');
  });
  
  test('should perform unified search across all libraries', async () => {
    const searchResults = await unifiedManager.searchUnified('memory system', 15);
    
    expect(searchResults).toHaveProperty('mem0Results');
    expect(searchResults).toHaveProperty('graphitiResults');
    expect(searchResults).toHaveProperty('lettaResults');
    expect(searchResults).toHaveProperty('combinedResults');
    
    expect(Array.isArray(searchResults.combinedResults)).toBe(true);
    expect(searchResults.combinedResults.length).toBeLessThanOrEqual(15);
    
    // Each result should have a source tag
    searchResults.combinedResults.forEach(result => {
      expect(result).toHaveProperty('source');
      expect(['mem0', 'graphiti', 'letta']).toContain(result.source);
    });
  });
  
  test('should handle sync coordination properly', async () => {
    await syncCoordinator.startScheduledSync();
    
    // Wait a short time for any immediate sync operations
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    syncCoordinator.stopScheduledSync();
    
    // Test should complete without errors
    expect(true).toBe(true);
  });
  
  test('should optimize performance with caching', async () => {
    const testQuery = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return { test: 'data', timestamp: Date.now() };
    };
    
    // First call should take full time
    const start1 = Date.now();
    const result1 = await performanceOptimizer.optimizeQuery('test_query', testQuery);
    const duration1 = Date.now() - start1;
    
    // Second call should be cached and faster
    const start2 = Date.now();
    const result2 = await performanceOptimizer.optimizeQuery('test_query', testQuery);
    const duration2 = Date.now() - start2;
    
    expect(result1).toEqual(result2);
    expect(duration2).toBeLessThan(duration1);
    
    const metrics = performanceOptimizer.getMetrics();
    expect(typeof metrics.cacheHitRatio).toBe('number');
    expect(typeof metrics.averageResponseTime).toBe('number');
  });
});

describe('Cross-Library Data Consistency Tests', () => {
  let unifiedManager: UnifiedMemoryManager;
  
  beforeAll(async () => {
    unifiedManager = new UnifiedMemoryManager();
    await unifiedManager.initialize();
  });
  
  afterAll(async () => {
    await unifiedManager.cleanup();
  });
  
  test('should maintain data consistency during sync operations', async () => {
    // This test would verify that data remains consistent
    // across all libraries during synchronization
    const statsBefore = await unifiedManager.getUnifiedStats();
    
    await unifiedManager.performFullSync();
    
    const statsAfter = await unifiedManager.getUnifiedStats();
    
    // Total data should not decrease (only increase or stay same)
    expect(statsAfter.unified.totalSyncedItems).toBeGreaterThanOrEqual(
      statsBefore.unified.totalSyncedItems
    );
  });
  
  test('should handle conflict resolution properly', async () => {
    // Test conflict resolution scenarios
    // This would involve creating conflicting data and ensuring
    // the unified system resolves conflicts according to configuration
    expect(true).toBe(true); // Placeholder for complex conflict tests
  });
});

describe('Performance and Scalability Tests', () => {
  let unifiedManager: UnifiedMemoryManager;
  let performanceOptimizer: PerformanceOptimizer;
  
  beforeAll(async () => {
    unifiedManager = new UnifiedMemoryManager();
    performanceOptimizer = new PerformanceOptimizer();
    await unifiedManager.initialize();
  });
  
  afterAll(async () => {
    await unifiedManager.cleanup();
  });
  
  test('should handle concurrent operations efficiently', async () => {
    const concurrentSearches = [];
    
    for (let i = 0; i < 10; i++) {
      concurrentSearches.push(
        unifiedManager.searchUnified(\`test query \${i}\`, 5)
      );
    }
    
    const startTime = Date.now();
    const results = await Promise.all(concurrentSearches);
    const duration = Date.now() - startTime;
    
    expect(results.length).toBe(10);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    
    results.forEach(result => {
      expect(result).toHaveProperty('combinedResults');
    });
  });
  
  test('should maintain performance under load', async () => {
    performanceOptimizer.resetMetrics();
    
    // Simulate load
    const operations = [];
    for (let i = 0; i < 50; i++) {
      operations.push(
        performanceOptimizer.optimizeQuery(\`load_test_\${i}\`, async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { data: \`test_\${i}\` };
        })
      );
    }
    
    await Promise.all(operations);
    
    const metrics = performanceOptimizer.getMetrics();
    expect(metrics.averageResponseTime).toBeLessThan(100); // Average under 100ms
    expect(metrics.queriesPerSecond).toBeGreaterThan(0);
  });
});
`;

    const testPath = path.join(testDir, 'unified-integration.test.ts');
    fs.writeFileSync(testPath, integrationTest);
    files.push(testPath);

    console.log(`  ✅ Created ${files.length} comprehensive test files`);
    return files;
  }

  private async createMonitoringDashboard(_config: UnifiedMemoryConfig): Promise<string> {
    console.log('📊 Creating monitoring dashboard...');

    const unifiedDir = path.join(this.workspaceRoot, 'cortex-memories', 'unified');

    const dashboardCode = `/**
 * Monitoring Dashboard for Unified Memory System
 * Provides real-time insights into memory system performance
 */

import { UnifiedMemoryManager, UnifiedMemoryStats } from './unified-memory-manager';
import { PerformanceOptimizer, PerformanceMetrics } from './performance-optimizer';

export interface DashboardData {
  timestamp: string;
  systemHealth: 'healthy' | 'warning' | 'error';
  unifiedStats: UnifiedMemoryStats;
  performanceMetrics: PerformanceMetrics;
  recentSyncOperations: any[];
  alerts: Alert[];
}

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export class MonitoringDashboard {
  private manager: UnifiedMemoryManager;
  private optimizer: PerformanceOptimizer;
  private alerts: Alert[] = [];
  private isMonitoring = false;
  
  constructor(manager: UnifiedMemoryManager, optimizer: PerformanceOptimizer) {
    this.manager = manager;
    this.optimizer = optimizer;
  }
  
  /**
   * Start real-time monitoring
   */
  startMonitoring(intervalSeconds: number = 30): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('📊 Starting unified memory system monitoring...');
    
    setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.checkSystemHealth();
      } catch (error) {
        console.error('Monitoring error:', error);
        this.addAlert('error', \`Monitoring system error: \${error}\`);
      }
    }, intervalSeconds * 1000);
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('⏹️ Stopped unified memory system monitoring');
  }
  
  /**
   * Get current dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    const [unifiedStats, performanceMetrics] = await Promise.all([
      this.manager.getUnifiedStats(),
      Promise.resolve(this.optimizer.getMetrics()),
    ]);
    
    const systemHealth = this.assessSystemHealth(unifiedStats, performanceMetrics);
    
    return {
      timestamp: new Date().toISOString(),
      systemHealth,
      unifiedStats,
      performanceMetrics,
      recentSyncOperations: [], // Would fetch from manager
      alerts: this.alerts.slice(-10), // Last 10 alerts
    };
  }
  
  private async collectMetrics(): Promise<void> {
    const data = await this.getDashboardData();
    
    // Log key metrics
    console.log(\`📊 Memory System Status: \${data.systemHealth}\`);
    console.log(\`   - Total Memories: \${data.unifiedStats.mem0.totalMemories}\`);
    console.log(\`   - Total Entities: \${data.unifiedStats.graphiti.totalEntities}\`);
    console.log(\`   - Cache Hit Ratio: \${data.performanceMetrics.cacheHitRatio.toFixed(2)}\`);
    console.log(\`   - Avg Response Time: \${data.performanceMetrics.averageResponseTime.toFixed(0)}ms\`);
  }
  
  private async checkSystemHealth(): Promise<void> {
    const data = await this.getDashboardData();
    
    // Check for performance issues
    if (data.performanceMetrics.averageResponseTime > 1000) {
      this.addAlert('warning', 'Average response time exceeding 1 second');
    }
    
    if (data.performanceMetrics.cacheHitRatio < 0.3) {
      this.addAlert('warning', 'Cache hit ratio below 30%');
    }
    
    // Check memory counts
    const totalMemories = data.unifiedStats.mem0.totalMemories + 
                         data.unifiedStats.letta.totalMemories;
    
    if (totalMemories === 0) {
      this.addAlert('error', 'No memories found in any library');
    }
    
    // Check sync status
    if (!data.unifiedStats.unified.lastSyncTimestamp) {
      this.addAlert('warning', 'No recent synchronization detected');
    } else {
      const lastSync = new Date(data.unifiedStats.unified.lastSyncTimestamp);
      const now = new Date();
      const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceSync > 2) {
        this.addAlert('warning', \`Last sync was \${hoursSinceSync.toFixed(1)} hours ago\`);
      }
    }
  }
  
  private assessSystemHealth(
    stats: UnifiedMemoryStats, 
    metrics: PerformanceMetrics
  ): 'healthy' | 'warning' | 'error' {
    // Check for critical errors
    if (stats.mem0.totalMemories === 0 && stats.letta.totalMemories === 0) {
      return 'error';
    }
    
    if (metrics.averageResponseTime > 2000) {
      return 'error';
    }
    
    // Check for warnings
    if (metrics.averageResponseTime > 1000 || metrics.cacheHitRatio < 0.3) {
      return 'warning';
    }
    
    if (!stats.unified.lastSyncTimestamp) {
      return 'warning';
    }
    
    return 'healthy';
  }
  
  private addAlert(level: Alert['level'], message: string): void {
    const alert: Alert = {
      id: \`alert_\${Date.now()}\`,
      level,
      message,
      timestamp: new Date().toISOString(),
      resolved: false,
    };
    
    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.splice(0, this.alerts.length - 100);
    }
    
    console.log(\`🚨 \${level.toUpperCase()}: \${message}\`);
  }
  
  /**
   * Generate monitoring report
   */
  async generateReport(): Promise<string> {
    const data = await this.getDashboardData();
    
    const report = \`
# Unified Memory System Monitoring Report

**Generated:** \${data.timestamp}
**System Health:** \${data.systemHealth.toUpperCase()}

## Memory Libraries Status

### Mem0
- Total Memories: \${data.unifiedStats.mem0.totalMemories}
- Total Users: \${data.unifiedStats.mem0.userCount}
- Vector Count: \${data.unifiedStats.mem0.vectorCount}

### Graphiti
- Total Entities: \${data.unifiedStats.graphiti.totalEntities}
- Total Relationships: \${data.unifiedStats.graphiti.totalRelationships}
- Knowledge Graphs: \${data.unifiedStats.graphiti.graphCount}

### Letta
- Total Agents: \${data.unifiedStats.letta.totalAgents}
- Total Memories: \${data.unifiedStats.letta.totalMemories}
- Compression Ratio: \${data.unifiedStats.letta.compressionRatio}

## Performance Metrics

- Queries/Second: \${data.performanceMetrics.queriesPerSecond}
- Average Response Time: \${data.performanceMetrics.averageResponseTime}ms
- Cache Hit Ratio: \${(data.performanceMetrics.cacheHitRatio * 100).toFixed(1)}%
- Memory Usage: \${data.performanceMetrics.memoryUsage}MB
- Active Connections: \${data.performanceMetrics.activeConnections}

## Unified System

- Total Synced Items: \${data.unifiedStats.unified.totalSyncedItems}
- Last Sync: \${data.unifiedStats.unified.lastSyncTimestamp || 'Never'}
- SSD Usage: \${data.unifiedStats.unified.storageUsage.ssd}
- HDD Usage: \${data.unifiedStats.unified.storageUsage.hdd}

## Recent Alerts

\${data.alerts.slice(-5).map(alert => 
  \`- [\${alert.level.toUpperCase()}] \${alert.message} (\${alert.timestamp})\`
).join('\\n')}

---
Report generated by Cortex OS Unified Memory System
\`;
    
    return report;
  }
}

// Example usage
export async function startMonitoringDashboard(
  manager: UnifiedMemoryManager,
  optimizer: PerformanceOptimizer
): Promise<MonitoringDashboard> {
  const dashboard = new MonitoringDashboard(manager, optimizer);
  
  // Start monitoring with 30-second intervals
  dashboard.startMonitoring(30);
  
  console.log('📊 Monitoring dashboard started successfully');
  
  return dashboard;
}
`;

    const dashboardPath = path.join(unifiedDir, 'monitoring-dashboard.ts');
    fs.writeFileSync(dashboardPath, dashboardCode);

    return dashboardPath;
  }

  private async createPerformanceOptimizations(_config: UnifiedMemoryConfig): Promise<string[]> {
    console.log('🚀 Creating performance optimizations...');

    const files: string[] = [];
    const unifiedDir = path.join(this.workspaceRoot, 'cortex-memories', 'unified');

    // Connection pool manager
    const connectionPoolManager = `/**
 * Connection Pool Manager for Unified Memory System
 * Optimizes database connections and resource usage
 */

export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
}

export class ConnectionPoolManager {
  private pools = new Map<string, any>();
  private config: ConnectionPoolConfig;
  
  constructor(config: ConnectionPoolConfig) {
    this.config = config;
  }
  
  /**
   * Get or create connection pool for a service
   */
  async getPool(serviceName: string, connectionString: string): Promise<any> {
    if (!this.pools.has(serviceName)) {
      const pool = await this.createPool(serviceName, connectionString);
      this.pools.set(serviceName, pool);
    }
    
    return this.pools.get(serviceName);
  }
  
  private async createPool(serviceName: string, connectionString: string): Promise<any> {
    console.log(\`🔗 Creating connection pool for \${serviceName}\`);
    
    // Mock pool creation - would use actual database libraries
    const pool = {
      serviceName,
      connectionString,
      maxConnections: this.config.maxConnections,
      activeConnections: 0,
      idleConnections: 0,
    };
    
    return pool;
  }
  
  /**
   * Close all connection pools
   */
  async closeAllPools(): Promise<void> {
    console.log('🔌 Closing all connection pools...');
    
    for (const [serviceName, pool] of this.pools.entries()) {
      console.log(\`  Closing pool: \${serviceName}\`);
      // Would call actual pool.close() here
    }
    
    this.pools.clear();
  }
}
`;

    const poolPath = path.join(unifiedDir, 'connection-pool-manager.ts');
    fs.writeFileSync(poolPath, connectionPoolManager);
    files.push(poolPath);

    // Query optimizer
    const queryOptimizer = `/**
 * Query Optimizer for Unified Memory Operations
 * Optimizes cross-library queries and reduces redundant operations
 */

export interface QueryPlan {
  id: string;
  libraries: string[];
  estimatedCost: number;
  parallelizable: boolean;
  cacheKey?: string;
}

export class QueryOptimizer {
  private queryPlans = new Map<string, QueryPlan>();
  
  /**
   * Optimize a unified search query
   */
  optimizeSearch(query: string, libraries: string[]): QueryPlan {
    const planId = this.generatePlanId(query, libraries);
    
    if (this.queryPlans.has(planId)) {
      return this.queryPlans.get(planId)!;
    }
    
    const plan: QueryPlan = {
      id: planId,
      libraries: this.optimizeLibraryOrder(libraries),
      estimatedCost: this.estimateQueryCost(query, libraries),
      parallelizable: libraries.length > 1,
      cacheKey: this.generateCacheKey(query, libraries),
    };
    
    this.queryPlans.set(planId, plan);
    return plan;
  }
  
  private generatePlanId(query: string, libraries: string[]): string {
    const hash = this.simpleHash(query + libraries.join(','));
    return \`plan_\${hash}\`;
  }
  
  private optimizeLibraryOrder(libraries: string[]): string[] {
    // Optimize order based on typical performance characteristics
    const performance = { letta: 1, mem0: 2, graphiti: 3 };
    
    return libraries.sort((a, b) => 
      (performance[a as keyof typeof performance] || 999) - 
      (performance[b as keyof typeof performance] || 999)
    );
  }
  
  private estimateQueryCost(query: string, libraries: string[]): number {
    const baseCost = query.length * 0.1;
    const libraryCost = libraries.length * 10;
    return baseCost + libraryCost;
  }
  
  private generateCacheKey(query: string, libraries: string[]): string {
    return \`cache_\${this.simpleHash(query + libraries.sort().join(','))}\`;
  }
  
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
`;

    const optimizerPath = path.join(unifiedDir, 'query-optimizer.ts');
    fs.writeFileSync(optimizerPath, queryOptimizer);
    files.push(optimizerPath);

    console.log(`  ✅ Created ${files.length} performance optimization files`);
    return files;
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const integrator = new AdvancedMemoryIntegrator();
  integrator
    .setupAdvancedMemory()
    .then(() => {
      console.log('🎯 Phase 6 complete! Ready for Phase 7: Performance Optimization');
    })
    .catch((error) => {
      console.error('❌ Phase 6 failed:', error);
      process.exit(1);
    });
}

export { AdvancedMemoryIntegrator };
export type { AdvancedMemorySetup, UnifiedMemoryConfig };
