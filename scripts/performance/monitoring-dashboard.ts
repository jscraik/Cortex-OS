#!/usr/bin/env tsx

/**
 * Performance Monitoring Dashboard for Cortex-OS
 *
 * This script provides real-time performance monitoring with:
 * - System resource monitoring (CPU, memory, disk)
 * - Application performance metrics
 * - Database performance tracking
 * - Cache performance analysis
 * - GPU utilization (if available)
 * - Real-time alerts and recommendations
 */

import { performanceMonitor } from '../../packages/memory-core/src/monitoring/PerformanceMonitor.js';
import { getDatabaseOptimizer } from '../../packages/memory-core/src/database/DatabaseOptimizer.js';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  uptime: number;
}

interface ApplicationMetrics {
  queries: {
    count: number;
    averageTime: number;
    cacheHitRate: number;
    slowQueries: number;
  };
  cache: {
    hitRate: number;
    memoryUsage: number;
    totalKeys: number;
    evictions: number;
  };
  errors: {
    count: number;
    rate: number;
  };
  uptime: number;
}

interface GPUMetrics {
  available: boolean;
  name?: string;
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  utilization: number;
  temperature?: number;
}

class PerformanceDashboard {
  private systemMetrics: SystemMetrics | null = null;
  private applicationMetrics: ApplicationMetrics | null = null;
  private gpuMetrics: GPUMetrics | null = null;
  private alerts: string[] = [];
  private isRunning = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    process.on('SIGINT', () => {
      log('\nShutting down performance monitoring...', 'yellow');
      this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      log('\nShutting down performance monitoring...', 'yellow');
      this.stop();
      process.exit(0);
    });
  }

  async collectSystemMetrics(): Promise<SystemMetrics> {
    try {
      // CPU metrics
      const cpuUsage = await this.getCPUUsage();
      const loadAverage = await this.getLoadAverage();
      const cores = await this.getCPUCount();

      // Memory metrics
      const memoryStats = await this.getMemoryStats();

      // Disk metrics
      const diskStats = await this.getDiskStats();

      // Uptime
      const uptime = process.uptime();

      return {
        cpu: {
          usage: cpuUsage,
          loadAverage,
          cores,
        },
        memory: memoryStats,
        disk: diskStats,
        uptime,
      };
    } catch (error) {
      log(`Failed to collect system metrics: ${error}`, 'red');
      throw error;
    }
  }

  private async getCPUUsage(): Promise<number> {
    try {
      const { execSync } = await import('child_process');
      const usage = execSync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\' | cut -d\'%\' -f1', { encoding: 'utf8' });
      return parseFloat(usage.trim()) || 0;
    } catch {
      return 0;
    }
  }

  private async getLoadAverage(): Promise<number[]> {
    try {
      const { loadavg } = await import('os');
      return loadavg();
    } catch {
      return [0, 0, 0];
    }
  }

  private async getCPUCount(): Promise<number> {
    try {
      const { cpus } = await import('os');
      return cpus().length;
    } catch {
      return 1;
    }
  }

  private async getMemoryStats(): Promise<SystemMetrics['memory']> {
    try {
      const { execSync } = await import('child_process');
      const output = execSync('free -m | grep Mem', { encoding: 'utf8' });
      const parts = output.trim().split(/\s+/);

      const total = parseInt(parts[1], 10);
      const used = parseInt(parts[2], 10);
      const free = parseInt(parts[3], 10);
      const usagePercent = (used / total) * 100;

      return { total, used, free, usagePercent };
    } catch {
      const memUsage = process.memoryUsage();
      const total = memUsage.heapTotal / 1024 / 1024;
      const used = memUsage.heapUsed / 1024 / 1024;
      const free = total - used;
      const usagePercent = (used / total) * 100;

      return { total, used, free, usagePercent };
    }
  }

  private async getDiskStats(): Promise<SystemMetrics['disk']> {
    try {
      const { execSync } = await import('child_process');
      const output = execSync('df -h . | tail -1', { encoding: 'utf8' });
      const parts = output.trim().split(/\s+/);

      const total = this.parseSize(parts[1]);
      const used = this.parseSize(parts[2]);
      const free = this.parseSize(parts[3]);
      const usagePercent = parseFloat(parts[4].replace('%', ''));

      return { total, used, free, usagePercent };
    } catch {
      return { total: 0, used: 0, free: 0, usagePercent: 0 };
    }
  }

  private parseSize(sizeStr: string): number {
    const units: Record<string, number> = { K: 1024, M: 1024 ** 2, G: 1024 ** 3, T: 1024 ** 4 };
    const match = sizeStr.match(/^(\d+)([KMG])?/);
    if (!match) return 0;
    const [, num, unit] = match;
    return parseInt(num, 10) * (units[unit] || 1);
  }

  async collectApplicationMetrics(): Promise<ApplicationMetrics> {
    try {
      const perfMetrics = performanceMonitor.getMetrics();
      const perfSummary = performanceMonitor.getPerformanceSummary();

      return {
        queries: {
          count: perfMetrics.queryCount,
          averageTime: perfMetrics.averageQueryTime,
          cacheHitRate: perfMetrics.cacheHitRatio,
          slowQueries: perfMetrics.averageQueryTime > 5000 ? 1 : 0, // Simplified
        },
        cache: {
          hitRate: perfMetrics.cacheHitRatio,
          memoryUsage: perfMetrics.memoryUsageMB,
          totalKeys: 0, // Would need cache manager instance
          evictions: 0,
        },
        errors: {
          count: perfSummary.issues.length,
          rate: perfSummary.issues.length / Math.max(1, perfMetrics.queryCount),
        },
        uptime: perfMetrics.uptimeSeconds,
      };
    } catch (error) {
      log(`Failed to collect application metrics: ${error}`, 'red');
      return this.getDefaultApplicationMetrics();
    }
  }

  private getDefaultApplicationMetrics(): ApplicationMetrics {
    return {
      queries: { count: 0, averageTime: 0, cacheHitRate: 0, slowQueries: 0 },
      cache: { hitRate: 0, memoryUsage: 0, totalKeys: 0, evictions: 0 },
      errors: { count: 0, rate: 0 },
      uptime: 0,
    };
  }

  async collectGPUMetrics(): Promise<GPUMetrics> {
    try {
      const { execSync } = await import('child_process');

      // Try nvidia-smi first
      try {
        const output = execSync('nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu --format=csv,noheader,nounits', { encoding: 'utf8' });
        const [name, memTotal, memUsed, memFree, util, temp] = output.trim().split(',').map(s => s.trim());

        return {
          available: true,
          name,
          memory: {
            total: parseInt(memTotal, 10),
            used: parseInt(memUsed, 10),
            free: parseInt(memFree, 10),
            usagePercent: (parseInt(memUsed, 10) / parseInt(memTotal, 10)) * 100,
          },
          utilization: parseInt(util, 10),
          temperature: parseInt(temp, 10),
        };
      } catch {
        // GPU not available or nvidia-smi not installed
        return {
          available: false,
          memory: { total: 0, used: 0, free: 0, usagePercent: 0 },
          utilization: 0,
        };
      }
    } catch (error) {
      return {
        available: false,
        memory: { total: 0, used: 0, free: 0, usagePercent: 0 },
        utilization: 0,
      };
    }
  }

  private analyzeMetrics(): void {
    this.alerts = [];

    if (!this.systemMetrics || !this.applicationMetrics) return;

    // System alerts
    if (this.systemMetrics.cpu.usage > 80) {
      this.alerts.push('🔥 High CPU usage detected');
    }

    if (this.systemMetrics.memory.usagePercent > 85) {
      this.alerts.push('🔥 High memory usage detected');
    }

    if (this.systemMetrics.disk.usagePercent > 90) {
      this.alerts.push('🔥 Low disk space');
    }

    // Application alerts
    if (this.applicationMetrics.queries.averageTime > 5000) {
      this.alerts.push('⚠️  Slow query performance detected');
    }

    if (this.applicationMetrics.cache.hitRate < 0.5 && this.applicationMetrics.queries.count > 100) {
      this.alerts.push('⚠️  Low cache hit rate');
    }

    if (this.applicationMetrics.errors.rate > 0.1) {
      this.alerts.push('🔥 High error rate detected');
    }

    // GPU alerts
    if (this.gpuMetrics?.available) {
      if (this.gpuMetrics.memory.usagePercent > 90) {
        this.alerts.push('🔥 High GPU memory usage');
      }

      if (this.gpuMetrics.utilization > 95) {
        this.alerts.push('⚠️  High GPU utilization');
      }

      if (this.gpuMetrics.temperature && this.gpuMetrics.temperature > 85) {
        this.alerts.push('🔥 High GPU temperature');
      }
    }
  }

  private renderDashboard(): void {
    // Clear screen
    console.clear();

    // Header
    log('╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════╗', 'cyan');
    log('║                                      CORTEX-OS PERFORMANCE MONITOR                                          ║', 'cyan');
    log('║                                    Real-time Performance Metrics                                           ║', 'cyan');
    log(`║                                      ${new Date().toLocaleString()}                                             ║`, 'cyan');
    log('╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝', 'cyan');
    console.log();

    // System Metrics Section
    if (this.systemMetrics) {
      log('╔═══════════════════════════════════ SYSTEM METRICS ════════════════════════════════════╗', 'blue');
      log(`║ CPU Usage:     ${this.formatPercentage(this.systemMetrics.cpu.usage)}${''.padEnd(48 - this.formatPercentage(this.systemMetrics.cpu.usage).length)} ║`);
      log(`║ Load Average:  ${this.systemMetrics.cpu.loadAverage.map(l => l.toFixed(2)).join(', ')}${''.padEnd(48 - this.systemMetrics.cpu.loadAverage.map(l => l.toFixed(2)).join(', ').length)} ║`);
      log(`║ Memory Usage:  ${this.formatPercentage(this.systemMetrics.memory.usagePercent)} (${Math.round(this.systemMetrics.memory.used)}MB/${Math.round(this.systemMetrics.memory.total)}MB)${''.padEnd(48 - (this.formatPercentage(this.systemMetrics.memory.usagePercent) + ` (${Math.round(this.systemMetrics.memory.used)}MB/${Math.round(this.systemMetrics.memory.total)}MB)`).length)} ║`);
      log(`║ Disk Usage:    ${this.formatPercentage(this.systemMetrics.disk.usagePercent)} (${Math.round(this.systemMetrics.disk.used)}GB/${Math.round(this.systemMetrics.disk.total)}GB)${''.padEnd(48 - (this.formatPercentage(this.systemMetrics.disk.usagePercent) + ` (${Math.round(this.systemMetrics.disk.used)}GB/${Math.round(this.systemMetrics.disk.total)}GB)`).length)} ║`);
      log('╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝', 'blue');
      console.log();
    }

    // Application Metrics Section
    if (this.applicationMetrics) {
      log('╔═════════════════════════════════ APPLICATION METRICS ════════════════════════════════════╗', 'green');
      log(`║ Queries:       ${this.applicationMetrics.queries.count.toString()}${''.padEnd(48 - this.applicationMetrics.queries.count.toString().length)} ║`);
      log(`║ Avg Query Time: ${this.applicationMetrics.queries.averageTime.toFixed(2)}ms${''.padEnd(48 - this.applicationMetrics.queries.averageTime.toFixed(2).length - 2)} ║`);
      log(`║ Cache Hit Rate: ${this.formatPercentage(this.applicationMetrics.queries.cacheHitRate)}${''.padEnd(48 - this.formatPercentage(this.applicationMetrics.queries.cacheHitRate).length)} ║`);
      log(`║ Slow Queries:   ${this.applicationMetrics.queries.slowQueries.toString()}${''.padEnd(48 - this.applicationMetrics.queries.slowQueries.toString().length)} ║`);
      log(`║ Error Rate:     ${this.formatPercentage(this.applicationMetrics.errors.rate)}${''.padEnd(48 - this.formatPercentage(this.applicationMetrics.errors.rate).length)} ║`);
      log(`║ Uptime:         ${this.formatUptime(this.applicationMetrics.uptime)}${''.padEnd(48 - this.formatUptime(this.applicationMetrics.uptime).length)} ║`);
      log('╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝', 'green');
      console.log();
    }

    // GPU Metrics Section
    if (this.gpuMetrics?.available) {
      log('╔═══════════════════════════════════ GPU METRICS ════════════════════════════════════════╗', 'magenta');
      log(`║ GPU:           ${this.gpuMetrics.name || 'Unknown'}${''.padEnd(48 - (this.gpuMetrics.name || 'Unknown').length)} ║`);
      log(`║ Memory Usage:  ${this.formatPercentage(this.gpuMetrics.memory.usagePercent)} (${this.gpuMetrics.memory.used}MB/${this.gpuMetrics.memory.total}MB)${''.padEnd(48 - (this.formatPercentage(this.gpuMetrics.memory.usagePercent) + ` (${this.gpuMetrics.memory.used}MB/${this.gpuMetrics.memory.total}MB)`).length)} ║`);
      log(`║ Utilization:   ${this.formatPercentage(this.gpuMetrics.utilization)}${''.padEnd(48 - this.formatPercentage(this.gpuMetrics.utilization).length)} ║`);
      if (this.gpuMetrics.temperature !== undefined) {
        log(`║ Temperature:   ${this.gpuMetrics.temperature}°C${''.padEnd(48 - `${this.gpuMetrics.temperature}°C`.length)} ║`);
      }
      log('╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝', 'magenta');
      console.log();
    }

    // Alerts Section
    if (this.alerts.length > 0) {
      log('╔═══════════════════════════════════ ALERTS ════════════════════════════════════════════════╗', 'red');
      this.alerts.forEach(alert => {
        log(`║ ${alert}${''.padEnd(76 - alert.length)} ║`, 'yellow');
      });
      log('╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝', 'red');
      console.log();
    }

    // Performance Recommendations
    this.renderRecommendations();

    // Controls
    log('Controls: Press Ctrl+C to stop monitoring | Updates every 5 seconds', 'cyan');
  }

  private renderRecommendations(): void {
    log('╔═════════════════════════════════ PERFORMANCE RECOMMENDATIONS ══════════════════════════════════╗', 'blue');

    const recommendations: string[] = [];

    if (this.systemMetrics) {
      if (this.systemMetrics.cpu.usage > 70) {
        recommendations.push('• Consider enabling GPU acceleration for CPU-intensive tasks');
        recommendations.push('• Optimize query patterns to reduce CPU load');
      }

      if (this.systemMetrics.memory.usagePercent > 70) {
        recommendations.push('• Increase cache size to reduce memory pressure');
        recommendations.push('• Implement memory cleanup routines');
      }
    }

    if (this.applicationMetrics) {
      if (this.applicationMetrics.queries.cacheHitRate < 0.7) {
        recommendations.push('• Increase cache TTL or size to improve hit rate');
        recommendations.push('• Implement query result precomputation');
      }

      if (this.applicationMetrics.queries.averageTime > 1000) {
        recommendations.push('• Enable database query optimization');
        recommendations.push('• Consider query batching for better performance');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('• System performance is optimal');
      recommendations.push('• Continue monitoring for performance trends');
    }

    recommendations.slice(0, 5).forEach(rec => {
      log(`║ ${rec}${''.padEnd(76 - rec.length)} ║`);
    });

    log('╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════╝', 'blue');
    console.log();
  }

  private formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  private formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      log('Performance monitoring is already running', 'yellow');
      return;
    }

    log('Starting Performance Monitoring Dashboard...', 'bright');
    this.isRunning = true;

    // Initial data collection
    try {
      await Promise.all([
        this.collectSystemMetrics().then(metrics => this.systemMetrics = metrics),
        this.collectApplicationMetrics().then(metrics => this.applicationMetrics = metrics),
        this.collectGPUMetrics().then(metrics => this.gpuMetrics = metrics),
      ]);
    } catch (error) {
      log(`Failed to collect initial metrics: ${error}`, 'red');
    }

    // Start monitoring loop
    this.monitoringInterval = setInterval(async () => {
      try {
        await Promise.all([
          this.collectSystemMetrics().then(metrics => this.systemMetrics = metrics),
          this.collectApplicationMetrics().then(metrics => this.applicationMetrics = metrics),
          this.collectGPUMetrics().then(metrics => this.gpuMetrics = metrics),
        ]);

        this.analyzeMetrics();
        this.renderDashboard();
      } catch (error) {
        log(`Monitoring error: ${error}`, 'red');
      }
    }, 5000); // Update every 5 seconds

    // Initial render
    this.analyzeMetrics();
    this.renderDashboard();
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    log('Performance monitoring stopped', 'yellow');
  }

  async generateReport(): Promise<void> {
    if (!this.systemMetrics || !this.applicationMetrics) {
      log('No metrics available for report generation', 'red');
      return;
    }

    const report = {
      timestamp: new Date().toISOString(),
      system: this.systemMetrics,
      application: this.applicationMetrics,
      gpu: this.gpuMetrics,
      alerts: this.alerts,
    };

    const reportPath = `reports/performance-report-${Date.now()}.json`;
    await import('fs').then(fs => {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    });

    log(`Performance report saved to: ${reportPath}`, 'green');
  }
}

async function main() {
  const dashboard = new PerformanceDashboard();

  // Handle command line arguments
  const args = process.argv.slice(2);
  if (args.includes('--report-only')) {
    await dashboard.start();
    setTimeout(async () => {
      await dashboard.generateReport();
      dashboard.stop();
    }, 10000); // Collect data for 10 seconds then generate report
  } else {
    await dashboard.start();
  }
}

// Run the dashboard
main().catch(console.error);