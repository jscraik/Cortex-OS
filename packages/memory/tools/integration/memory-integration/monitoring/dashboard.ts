/**
 * Monitoring Dashboard for Unified Memory System
 * @split_from advanced-memory-setup-phase6.ts
 * 
 * This module provides real-time insights into memory system performance,
 * health monitoring, alerting, and comprehensive reporting capabilities.
 */

import { UnifiedMemoryManager } from '../core/unified-memory-manager';
import { PerformanceOptimizer } from '../optimization/performance-optimizer';
import {
  UnifiedMemoryStats,
  PerformanceMetrics,
  DashboardData,
  Alert,
} from '../types/index';

export class MonitoringDashboard {
  private manager: UnifiedMemoryManager;
  private optimizer: PerformanceOptimizer;
  private alerts: Alert[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertCounter = 0;
  
  constructor(manager: UnifiedMemoryManager, optimizer: PerformanceOptimizer) {
    this.manager = manager;
    this.optimizer = optimizer;
  }
  
  /**
   * Start real-time monitoring with configurable intervals
   */
  startMonitoring(intervalSeconds: number = 30): void {
    if (this.isMonitoring) {
      console.log('⚠️ Monitoring already active');
      return;
    }
    
    this.isMonitoring = true;
    console.log(`📊 Starting unified memory system monitoring (${intervalSeconds}s intervals)...`);
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.checkSystemHealth();
      } catch (error) {
        console.error('Monitoring error:', error);
        this.addAlert('error', `Monitoring system error: ${error}`);
      }
    }, intervalSeconds * 1000);
    
    // Perform initial check
    this.collectMetrics().catch(error => {
      console.error('Initial metrics collection failed:', error);
    });
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
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
    const recentSyncOperations = this.manager.getSyncOperations().slice(-10);
    
    return {
      timestamp: new Date().toISOString(),
      systemHealth,
      unifiedStats,
      performanceMetrics,
      recentSyncOperations,
      alerts: this.alerts.slice(-10), // Last 10 alerts
    };
  }
  
  /**
   * Collect and log key metrics
   */
  private async collectMetrics(): Promise<void> {
    const data = await this.getDashboardData();
    
    // Log key metrics in a structured format
    console.log(`📊 Memory System Status: ${data.systemHealth.toUpperCase()}`);
    console.log(`   Memory Libraries:`);
    console.log(`   - Mem0: ${data.unifiedStats.mem0.totalMemories} memories, ${data.unifiedStats.mem0.userCount} users`);
    console.log(`   - Graphiti: ${data.unifiedStats.graphiti.totalEntities} entities, ${data.unifiedStats.graphiti.totalRelationships} relationships`);
    console.log(`   - Letta: ${data.unifiedStats.letta.totalAgents} agents, ${data.unifiedStats.letta.totalMemories} memories`);
    console.log(`   Performance:`);
    console.log(`   - Cache Hit Ratio: ${(data.performanceMetrics.cacheHitRatio * 100).toFixed(1)}%`);
    console.log(`   - Avg Response Time: ${data.performanceMetrics.averageResponseTime.toFixed(0)}ms`);
    console.log(`   - Queries/sec: ${data.performanceMetrics.queriesPerSecond.toFixed(1)}`);
    console.log(`   - Memory Usage: ${data.performanceMetrics.memoryUsage.toFixed(1)}MB`);
  }
  
  /**
   * Comprehensive system health checks
   */
  private async checkSystemHealth(): Promise<void> {
    const data = await this.getDashboardData();
    
    // Performance threshold checks
    this.checkPerformanceThresholds(data.performanceMetrics);
    
    // Memory library health checks
    this.checkMemoryLibraryHealth(data.unifiedStats);
    
    // Sync status checks
    this.checkSyncStatus(data.unifiedStats, data.recentSyncOperations);
    
    // Resource usage checks
    this.checkResourceUsage(data.performanceMetrics);
  }
  
  /**
   * Check performance-related thresholds
   */
  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    // Response time checks
    if (metrics.averageResponseTime > 2000) {
      this.addAlert('error', `Critical: Average response time is ${metrics.averageResponseTime.toFixed(0)}ms (>2s)`);
    } else if (metrics.averageResponseTime > 1000) {
      this.addAlert('warning', `Average response time is ${metrics.averageResponseTime.toFixed(0)}ms (>1s)`);
    }
    
    // Cache performance checks
    if (metrics.cacheHitRatio < 0.2) {
      this.addAlert('error', `Critical: Cache hit ratio is ${(metrics.cacheHitRatio * 100).toFixed(1)}% (<20%)`);
    } else if (metrics.cacheHitRatio < 0.5) {
      this.addAlert('warning', `Low cache hit ratio: ${(metrics.cacheHitRatio * 100).toFixed(1)}% (<50%)`);
    }
    
    // Query rate checks
    if (metrics.queriesPerSecond > 100) {
      this.addAlert('warning', `High query rate: ${metrics.queriesPerSecond.toFixed(1)} queries/sec`);
    }
    
    // Memory usage checks
    if (metrics.memoryUsage > 1000) { // 1GB
      this.addAlert('error', `High memory usage: ${metrics.memoryUsage.toFixed(1)}MB`);
    } else if (metrics.memoryUsage > 500) { // 500MB
      this.addAlert('warning', `Elevated memory usage: ${metrics.memoryUsage.toFixed(1)}MB`);
    }
  }
  
  /**
   * Check health of individual memory libraries
   */
  private checkMemoryLibraryHealth(stats: UnifiedMemoryStats): void {
    // Check if any library has no data
    const totalMemories = stats.mem0.totalMemories + stats.letta.totalMemories;
    
    if (totalMemories === 0) {
      this.addAlert('error', 'Critical: No memories found in any library');
    }
    
    if (stats.mem0.totalMemories === 0) {
      this.addAlert('warning', 'Mem0 library has no memories');
    }
    
    if (stats.graphiti.totalEntities === 0) {
      this.addAlert('warning', 'Graphiti library has no entities');
    }
    
    if (stats.letta.totalMemories === 0) {
      this.addAlert('warning', 'Letta library has no memories');
    }
    
    // Check for unusual patterns
    if (stats.mem0.userCount === 0 && stats.mem0.totalMemories > 0) {
      this.addAlert('warning', 'Mem0 has memories but no users - possible data inconsistency');
    }
    
    if (stats.graphiti.totalEntities > 0 && stats.graphiti.totalRelationships === 0) {
      this.addAlert('info', 'Graphiti has entities but no relationships');
    }
  }
  
  /**
   * Check synchronization status and health
   */
  private checkSyncStatus(stats: UnifiedMemoryStats, recentOps: any[]): void {
    // Check if sync has happened recently
    if (!stats.unified.lastSyncTimestamp) {
      this.addAlert('warning', 'No recent synchronization detected');
      return;
    }
    
    const lastSync = new Date(stats.unified.lastSyncTimestamp);
    const now = new Date();
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceSync > 4) {
      this.addAlert('error', `Last sync was ${hoursSinceSync.toFixed(1)} hours ago (>4h)`);
    } else if (hoursSinceSync > 2) {
      this.addAlert('warning', `Last sync was ${hoursSinceSync.toFixed(1)} hours ago (>2h)`);
    }
    
    // Check recent sync operation failures
    const recentFailures = recentOps.filter(op => op.status === 'failed').length;
    if (recentFailures > 0) {
      this.addAlert('error', `${recentFailures} sync operations failed recently`);
    }
    
    // Check sync data volume
    if (stats.unified.totalSyncedItems === 0) {
      this.addAlert('warning', 'No data has been synchronized between libraries');
    }
  }
  
  /**
   * Check resource usage and capacity
   */
  private checkResourceUsage(metrics: PerformanceMetrics): void {
    // Connection pool health
    if (metrics.activeConnections > 50) {
      this.addAlert('warning', `High number of active connections: ${metrics.activeConnections}`);
    }
    
    // Basic resource utilization patterns
    const cacheStats = this.optimizer.getCacheStats();
    
    if (cacheStats.size / cacheStats.maxSize > 0.9) {
      this.addAlert('warning', `Cache is ${((cacheStats.size / cacheStats.maxSize) * 100).toFixed(1)}% full`);
    }
    
    if (cacheStats.totalMisses > cacheStats.totalHits * 3) {
      this.addAlert('warning', 'Cache miss rate is significantly higher than hit rate');
    }
  }
  
  /**
   * Assess overall system health based on metrics
   */
  private assessSystemHealth(
    stats: UnifiedMemoryStats, 
    metrics: PerformanceMetrics
  ): 'healthy' | 'warning' | 'error' {
    // Critical error conditions
    if (stats.mem0.totalMemories === 0 && stats.letta.totalMemories === 0) {
      return 'error';
    }
    
    if (metrics.averageResponseTime > 2000) {
      return 'error';
    }
    
    if (metrics.cacheHitRatio < 0.2) {
      return 'error';
    }
    
    // Warning conditions
    if (metrics.averageResponseTime > 1000) {
      return 'warning';
    }
    
    if (metrics.cacheHitRatio < 0.5) {
      return 'warning';
    }
    
    if (!stats.unified.lastSyncTimestamp) {
      return 'warning';
    }
    
    if (stats.unified.lastSyncTimestamp) {
      const lastSync = new Date(stats.unified.lastSyncTimestamp);
      const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceSync > 2) {
        return 'warning';
      }
    }
    
    return 'healthy';
  }
  
  /**
   * Add a new alert with automatic ID generation
   */
  private addAlert(level: Alert['level'], message: string): void {
    const alert: Alert = {
      id: `alert_${++this.alertCounter}_${Date.now()}`,
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
    
    const emoji = level === 'error' ? '🚨' : level === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} ${level.toUpperCase()}: ${message}`);
  }
  
  /**
   * Resolve an alert by ID
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    
    if (alert) {
      alert.resolved = true;
      console.log(`✅ Resolved alert: ${alertId}`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Get alerts filtered by level and resolution status
   */
  getFilteredAlerts(options: {
    level?: Alert['level'];
    resolved?: boolean;
    limit?: number;
  } = {}): Alert[] {
    let filtered = [...this.alerts];
    
    if (options.level !== undefined) {
      filtered = filtered.filter(alert => alert.level === options.level);
    }
    
    if (options.resolved !== undefined) {
      filtered = filtered.filter(alert => alert.resolved === options.resolved);
    }
    
    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }
    
    return filtered;
  }
  
  /**
   * Generate comprehensive monitoring report
   */
  async generateReport(): Promise<string> {
    const data = await this.getDashboardData();
    const cacheStats = this.optimizer.getCacheStats();
    
    const report = `
# Unified Memory System Monitoring Report

**Generated:** ${data.timestamp}
**System Health:** ${data.systemHealth.toUpperCase()}

## Executive Summary

The unified memory system is currently in **${data.systemHealth}** status with ${data.alerts.filter(a => !a.resolved).length} active alerts.

## Memory Libraries Status

### Mem0 Library
- **Total Memories:** ${data.unifiedStats.mem0.totalMemories}
- **Total Users:** ${data.unifiedStats.mem0.userCount}
- **Vector Count:** ${data.unifiedStats.mem0.vectorCount}

### Graphiti Library
- **Total Entities:** ${data.unifiedStats.graphiti.totalEntities}
- **Total Relationships:** ${data.unifiedStats.graphiti.totalRelationships}
- **Knowledge Graphs:** ${data.unifiedStats.graphiti.graphCount}

### Letta Library
- **Total Agents:** ${data.unifiedStats.letta.totalAgents}
- **Total Memories:** ${data.unifiedStats.letta.totalMemories}
- **Compression Ratio:** ${data.unifiedStats.letta.compressionRatio}

## Performance Metrics

- **Queries/Second:** ${data.performanceMetrics.queriesPerSecond.toFixed(2)}
- **Average Response Time:** ${data.performanceMetrics.averageResponseTime.toFixed(0)}ms
- **Cache Hit Ratio:** ${(data.performanceMetrics.cacheHitRatio * 100).toFixed(1)}%
- **Memory Usage:** ${data.performanceMetrics.memoryUsage.toFixed(1)}MB
- **Active Connections:** ${data.performanceMetrics.activeConnections}

## Cache Performance

- **Cache Size:** ${cacheStats.size}/${cacheStats.maxSize} entries (${((cacheStats.size / cacheStats.maxSize) * 100).toFixed(1)}% full)
- **Hit Rate:** ${(cacheStats.hitRate * 100).toFixed(1)}%
- **Total Hits:** ${cacheStats.totalHits}
- **Total Misses:** ${cacheStats.totalMisses}
- **TTL:** ${cacheStats.ttlMinutes} minutes

## Unified System

- **Total Synced Items:** ${data.unifiedStats.unified.totalSyncedItems}
- **Last Sync:** ${data.unifiedStats.unified.lastSyncTimestamp || 'Never'}
- **SSD Usage:** ${data.unifiedStats.unified.storageUsage.ssd}
- **HDD Usage:** ${data.unifiedStats.unified.storageUsage.hdd}

## Recent Sync Operations

${data.recentSyncOperations.length > 0 
  ? data.recentSyncOperations.slice(-5).map(op => 
    `- **${op.operation}** (${op.sourceLibrary} → ${op.targetLibrary}): ${op.status} - ${op.itemCount} items`
  ).join('\n')
  : 'No recent sync operations'
}

## Active Alerts

${data.alerts.filter(a => !a.resolved).length > 0
  ? data.alerts.filter(a => !a.resolved).slice(-5).map(alert => 
    `- **[${alert.level.toUpperCase()}]** ${alert.message} (${new Date(alert.timestamp).toLocaleString()})`
  ).join('\n')
  : 'No active alerts'
}

## System Recommendations

${this.generateRecommendations(data)}

---
*Report generated by Cortex OS Unified Memory System*
*Monitoring interval: ${this.isMonitoring ? 'Active' : 'Inactive'}*
`;
    
    return report;
  }
  
  /**
   * Generate system recommendations based on current state
   */
  private generateRecommendations(data: DashboardData): string {
    const recommendations: string[] = [];
    
    if (data.performanceMetrics.cacheHitRatio < 0.5) {
      recommendations.push('- Consider increasing cache TTL or optimizing query patterns to improve cache hit ratio');
    }
    
    if (data.performanceMetrics.averageResponseTime > 500) {
      recommendations.push('- Investigate query optimization opportunities to reduce response times');
    }
    
    if (data.unifiedStats.unified.totalSyncedItems === 0) {
      recommendations.push('- Verify synchronization configuration and trigger initial sync');
    }
    
    const activeErrors = data.alerts.filter(a => !a.resolved && a.level === 'error').length;
    if (activeErrors > 0) {
      recommendations.push(`- Address ${activeErrors} critical error alert(s) immediately`);
    }
    
    if (data.unifiedStats.mem0.totalMemories === 0) {
      recommendations.push('- Initialize Mem0 with some test data to verify functionality');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- System is operating within normal parameters');
    }
    
    return recommendations.join('\n');
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopMonitoring();
    this.alerts = [];
    
    console.log('🧹 Monitoring dashboard cleanup completed');
  }
}

/**
 * Factory function to create and start monitoring dashboard
 */
export async function startMonitoringDashboard(
  manager: UnifiedMemoryManager,
  optimizer: PerformanceOptimizer,
  intervalSeconds: number = 30
): Promise<MonitoringDashboard> {
  const dashboard = new MonitoringDashboard(manager, optimizer);
  
  // Start monitoring with specified interval
  dashboard.startMonitoring(intervalSeconds);
  
  console.log(`📊 Monitoring dashboard started successfully (${intervalSeconds}s intervals)`);
  
  return dashboard;
}