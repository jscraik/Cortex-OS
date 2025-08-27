/**
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
        this.addAlert('error', `Monitoring system error: ${error}`);
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
    console.log(`📊 Memory System Status: ${data.systemHealth}`);
    console.log(`   - Total Memories: ${data.unifiedStats.mem0.totalMemories}`);
    console.log(`   - Total Entities: ${data.unifiedStats.graphiti.totalEntities}`);
    console.log(`   - Cache Hit Ratio: ${data.performanceMetrics.cacheHitRatio.toFixed(2)}`);
    console.log(
      `   - Avg Response Time: ${data.performanceMetrics.averageResponseTime.toFixed(0)}ms`,
    );
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
    const totalMemories =
      data.unifiedStats.mem0.totalMemories + data.unifiedStats.letta.totalMemories;

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
        this.addAlert('warning', `Last sync was ${hoursSinceSync.toFixed(1)} hours ago`);
      }
    }
  }

  private assessSystemHealth(
    stats: UnifiedMemoryStats,
    metrics: PerformanceMetrics,
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
      id: `alert_${Date.now()}`,
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

    console.log(`🚨 ${level.toUpperCase()}: ${message}`);
  }

  /**
   * Generate monitoring report
   */
  async generateReport(): Promise<string> {
    const data = await this.getDashboardData();

    const report = `
# Unified Memory System Monitoring Report

**Generated:** ${data.timestamp}
**System Health:** ${data.systemHealth.toUpperCase()}

## Memory Libraries Status

### Mem0
- Total Memories: ${data.unifiedStats.mem0.totalMemories}
- Total Users: ${data.unifiedStats.mem0.userCount}
- Vector Count: ${data.unifiedStats.mem0.vectorCount}

### Graphiti
- Total Entities: ${data.unifiedStats.graphiti.totalEntities}
- Total Relationships: ${data.unifiedStats.graphiti.totalRelationships}
- Knowledge Graphs: ${data.unifiedStats.graphiti.graphCount}

### Letta
- Total Agents: ${data.unifiedStats.letta.totalAgents}
- Total Memories: ${data.unifiedStats.letta.totalMemories}
- Compression Ratio: ${data.unifiedStats.letta.compressionRatio}

## Performance Metrics

- Queries/Second: ${data.performanceMetrics.queriesPerSecond}
- Average Response Time: ${data.performanceMetrics.averageResponseTime}ms
- Cache Hit Ratio: ${(data.performanceMetrics.cacheHitRatio * 100).toFixed(1)}%
- Memory Usage: ${data.performanceMetrics.memoryUsage}MB
- Active Connections: ${data.performanceMetrics.activeConnections}

## Unified System

- Total Synced Items: ${data.unifiedStats.unified.totalSyncedItems}
- Last Sync: ${data.unifiedStats.unified.lastSyncTimestamp || 'Never'}
- SSD Usage: ${data.unifiedStats.unified.storageUsage.ssd}
- HDD Usage: ${data.unifiedStats.unified.storageUsage.hdd}

## Recent Alerts

${data.alerts
  .slice(-5)
  .map((alert) => `- [${alert.level.toUpperCase()}] ${alert.message} (${alert.timestamp})`)
  .join('\n')}

---
Report generated by Cortex OS Unified Memory System
`;

    return report;
  }
}

// Example usage
export async function startMonitoringDashboard(
  manager: UnifiedMemoryManager,
  optimizer: PerformanceOptimizer,
): Promise<MonitoringDashboard> {
  const dashboard = new MonitoringDashboard(manager, optimizer);

  // Start monitoring with 30-second intervals
  dashboard.startMonitoring(30);

  console.log('📊 Monitoring dashboard started successfully');

  return dashboard;
}
