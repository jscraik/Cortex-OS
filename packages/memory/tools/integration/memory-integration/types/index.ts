/**
 * Type definitions for the Unified Memory Integration System
 * @split_from advanced-memory-setup-phase6.ts
 * 
 * This module contains all interfaces and type definitions used across
 * the memory integration system to ensure type safety and consistency.
 */

export interface UnifiedMemoryConfig {
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

export interface AdvancedMemorySetup {
  timestamp: string;
  phase: string;
  configuration: UnifiedMemoryConfig;
  unifiedManager: string;
  bridgeIntegrations: string[];
  testSuites: string[];
  monitoringDashboard: string;
  performanceOptimizations: string[];
}

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

export interface SyncRule {
  id: string;
  sourceLibrary: string;
  targetLibrary: string;
  dataType: string;
  frequency: 'realtime' | 'scheduled' | 'manual';
  conflictResolution: 'latest_wins' | 'merge' | 'manual_review';
  enabled: boolean;
}

export interface PerformanceMetrics {
  queriesPerSecond: number;
  averageResponseTime: number;
  cacheHitRatio: number;
  memoryUsage: number;
  activeConnections: number;
}

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

export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
}

export interface QueryPlan {
  id: string;
  libraries: string[];
  estimatedCost: number;
  parallelizable: boolean;
  cacheKey?: string;
}

// Search result types
export interface UnifiedSearchResult {
  mem0Results: any[];
  graphitiResults: any[];
  lettaResults: any[];
  combinedResults: any[];
}

// Initialization result types
export interface InitializationResult {
  mem0Ready: boolean;
  graphitiReady: boolean;
  lettaReady: boolean;
  unifiedReady: boolean;
}