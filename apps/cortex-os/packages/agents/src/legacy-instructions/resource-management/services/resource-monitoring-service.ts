/**
 * @file Resource Monitoring Service
 * @description Handles resource monitoring, metrics collection, and performance tracking
 * @split_from resource-manager.ts
 */

import { EventEmitter } from "node:events";
import type { ILogger } from "../../core/logger.js";
import type {
  Resource,
  ResourceUsage,
  PerformanceMetrics,
  ReliabilityMetrics,
  ResourceManagerMetrics,
  ResourcePrediction,
  FailureRecord,
  QoSRequirements,
  QoSObjective
} from "../types/index.js";

export interface MonitoringConfig {
  enabled: boolean;
  interval: number;
  enablePredictive: boolean;
  enableAnomalyDetection: boolean;
  retentionPeriod: number;
  alertThresholds: {
    utilization: number;
    errorRate: number;
    latency: number;
  };
}

export class ResourceMonitoringService extends EventEmitter {
  private logger: ILogger;
  private config: MonitoringConfig;
  private resources = new Map<string, Resource>();
  private usageHistory = new Map<string, ResourceUsage[]>();
  private failureHistory = new Map<string, FailureRecord[]>();
  private performanceHistory = new Map<string, PerformanceMetrics[]>();
  private predictions = new Map<string, ResourcePrediction[]>();
  private monitoringInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(logger: ILogger, config: MonitoringConfig) {
    super();
    this.logger = logger;
    this.config = config;
  }

  /**
   * Start monitoring services
   */
  async startMonitoring(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.debug("Resource monitoring is disabled");
      return;
    }

    this.logger.info("Starting resource monitoring", {
      interval: this.config.interval,
      predictive: this.config.enablePredictive
    });

    // Start periodic monitoring
    this.monitoringInterval = setInterval(
      () => this.performMonitoringCycle(),
      this.config.interval
    );

    // Start cleanup for old data
    this.cleanupInterval = setInterval(
      () => this.cleanupOldData(),
      this.config.retentionPeriod / 10 // Cleanup every 10% of retention period
    );

    this.emit("monitoring:started");
  }

  /**
   * Stop monitoring services
   */
  async stopMonitoring(): Promise<void> {
    this.logger.info("Stopping resource monitoring");

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.emit("monitoring:stopped");
  }

  /**
   * Update resource usage data
   */
  updateResourceUsage(resourceId: string, usage: ResourceUsage): void {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      this.logger.warn("Attempted to update usage for unknown resource", { resourceId });
      return;
    }

    // Store usage history
    if (!this.usageHistory.has(resourceId)) {
      this.usageHistory.set(resourceId, []);
    }

    const history = this.usageHistory.get(resourceId)!;
    history.push({
      ...usage,
      timestamp: new Date()
    });

    // Limit history size
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    // Update resource with current usage
    resource.metadata.currentUsage = usage;

    // Check for alerts
    this.checkAlerts(resource, usage);

    // Update performance metrics
    this.updatePerformanceMetrics(resourceId, usage);

    this.emit("usage:updated", { resourceId, usage });
  }

  /**
   * Record resource failure
   */
  recordFailure(resourceId: string, failure: Omit<FailureRecord, "timestamp">): void {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      this.logger.warn("Attempted to record failure for unknown resource", { resourceId });
      return;
    }

    const failureRecord: FailureRecord = {
      ...failure,
      timestamp: new Date()
    };

    if (!this.failureHistory.has(resourceId)) {
      this.failureHistory.set(resourceId, []);
    }

    this.failureHistory.get(resourceId)!.push(failureRecord);

    // Update reliability metrics
    this.updateReliabilityMetrics(resourceId);

    this.logger.warn("Resource failure recorded", {
      resourceId,
      type: failure.type,
      severity: failure.severity
    });

    this.emit("failure:recorded", { resourceId, failure: failureRecord });

    // Handle critical failures
    if (failure.severity === "critical") {
      this.handleCriticalFailure(resourceId, failureRecord);
    }
  }

  /**
   * Get resource metrics
   */
  getResourceMetrics(resourceId: string): ResourceManagerMetrics | null {
    const resource = this.resources.get(resourceId);
    if (!resource) return null;

    const usage = this.usageHistory.get(resourceId) || [];
    const failures = this.failureHistory.get(resourceId) || [];

    const totalAllocations = resource.allocations.length;
    const activeAllocations = resource.allocations.filter(a => !a.endTime).length;
    const utilization = this.calculateResourceUtilization(resource);

    return {
      totalResources: 1,
      totalAllocations,
      totalReservations: resource.reservations.length,
      averageUtilization: utilization,
      allocationSuccessRate: this.calculateSuccessRate(resourceId),
      averageAllocationTime: this.calculateAverageAllocationTime(resourceId),
      totalCost: this.calculateTotalCost(resourceId),
      qosViolations: this.countQoSViolations(resourceId)
    };
  }

  /**
   * Get usage predictions for a resource
   */
  getPredictions(resourceId: string): ResourcePrediction[] {
    if (!this.config.enablePredictive) {
      return [];
    }

    return this.predictions.get(resourceId) || [];
  }

  /**
   * Perform a complete monitoring cycle
   */
  private async performMonitoringCycle(): Promise<void> {
    try {
      // Collect current metrics for all resources
      for (const [resourceId, resource] of this.resources) {
        await this.collectResourceMetrics(resourceId, resource);
      }

      // Generate predictions if enabled
      if (this.config.enablePredictive) {
        await this.generatePredictions();
      }

      // Detect anomalies if enabled
      if (this.config.enableAnomalyDetection) {
        await this.detectAnomalies();
      }

      this.emit("monitoring:cycle-complete");

    } catch (error) {
      this.logger.error("Monitoring cycle failed", { error });
      this.emit("monitoring:cycle-failed", { error });
    }
  }

  /**
   * Collect metrics for a specific resource
   */
  private async collectResourceMetrics(resourceId: string, resource: Resource): Promise<void> {
    try {
      // Simulate metric collection (in real implementation, this would query actual resource)
      const usage: ResourceUsage = {
        cpu: resource.allocated.cpu,
        memory: resource.allocated.memory,
        disk: resource.allocated.disk,
        network: resource.allocated.network,
        gpu: resource.allocated.gpu,
        custom: { ...resource.allocated.custom },
        timestamp: new Date(),
        duration: this.config.interval
      };

      this.updateResourceUsage(resourceId, usage);

    } catch (error) {
      this.logger.error("Failed to collect metrics for resource", {
        resourceId,
        error
      });

      this.recordFailure(resourceId, {
        type: "monitoring_failure",
        description: `Failed to collect metrics: ${error}`,
        severity: "medium",
        resolved: false
      });
    }
  }

  /**
   * Generate usage predictions
   */
  private async generatePredictions(): Promise<void> {
    for (const [resourceId, history] of this.usageHistory) {
      if (history.length < 10) continue; // Need minimum history

      try {
        const prediction = this.generateResourcePrediction(resourceId, history);
        
        if (!this.predictions.has(resourceId)) {
          this.predictions.set(resourceId, []);
        }

        const predictions = this.predictions.get(resourceId)!;
        predictions.push(prediction);

        // Keep only recent predictions
        if (predictions.length > 100) {
          predictions.splice(0, predictions.length - 100);
        }

      } catch (error) {
        this.logger.error("Failed to generate prediction", { resourceId, error });
      }
    }
  }

  /**
   * Generate prediction for a resource
   */
  private generateResourcePrediction(resourceId: string, history: ResourceUsage[]): ResourcePrediction {
    // Simple trend-based prediction (in real implementation, use ML)
    const recent = history.slice(-10);
    const avgUsage = this.calculateAverageUsage(recent);
    
    // Apply simple trend analysis
    const trend = this.calculateTrend(recent);

    return {
      resourceId,
      predictedUsage: {
        cpu: Math.max(0, avgUsage.cpu + trend.cpu),
        memory: Math.max(0, avgUsage.memory + trend.memory),
        disk: Math.max(0, avgUsage.disk + trend.disk),
        network: Math.max(0, avgUsage.network + trend.network),
        gpu: avgUsage.gpu ? Math.max(0, avgUsage.gpu + (trend.gpu || 0)) : undefined,
        custom: { ...avgUsage.custom },
        timestamp: new Date(),
        duration: this.config.interval
      },
      confidence: this.calculatePredictionConfidence(recent),
      timeHorizon: this.config.interval * 5, // Predict 5 intervals ahead
      factors: ["historical_trend", "time_series_analysis"]
    };
  }

  /**
   * Detect usage anomalies
   */
  private async detectAnomalies(): Promise<void> {
    for (const [resourceId, history] of this.usageHistory) {
      if (history.length < 20) continue; // Need sufficient history

      const recent = history.slice(-5);
      const baseline = history.slice(-20, -5);

      for (const currentUsage of recent) {
        if (this.isAnomalous(currentUsage, baseline)) {
          this.logger.warn("Resource usage anomaly detected", {
            resourceId,
            usage: currentUsage
          });

          this.emit("anomaly:detected", {
            resourceId,
            usage: currentUsage,
            baseline: this.calculateAverageUsage(baseline)
          });
        }
      }
    }
  }

  /**
   * Check if usage is anomalous compared to baseline
   */
  private isAnomalous(usage: ResourceUsage, baseline: ResourceUsage[]): boolean {
    const baselineAvg = this.calculateAverageUsage(baseline);
    const baselineStd = this.calculateStandardDeviation(baseline);

    // Check if any metric is more than 2 standard deviations from mean
    const cpuZ = Math.abs(usage.cpu - baselineAvg.cpu) / (baselineStd.cpu || 1);
    const memoryZ = Math.abs(usage.memory - baselineAvg.memory) / (baselineStd.memory || 1);
    const diskZ = Math.abs(usage.disk - baselineAvg.disk) / (baselineStd.disk || 1);

    return cpuZ > 2 || memoryZ > 2 || diskZ > 2;
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(resource: Resource, usage: ResourceUsage): void {
    const utilization = this.calculateUtilizationFromUsage(resource, usage);

    // Utilization alert
    if (utilization > this.config.alertThresholds.utilization) {
      this.emit("alert:high-utilization", {
        resourceId: resource.id,
        utilization,
        threshold: this.config.alertThresholds.utilization
      });
    }

    // Error rate alert
    const errorRate = this.calculateErrorRate(resource.id);
    if (errorRate > this.config.alertThresholds.errorRate) {
      this.emit("alert:high-error-rate", {
        resourceId: resource.id,
        errorRate,
        threshold: this.config.alertThresholds.errorRate
      });
    }
  }

  /**
   * Handle critical resource failures
   */
  private handleCriticalFailure(resourceId: string, failure: FailureRecord): void {
    const resource = this.resources.get(resourceId);
    if (!resource) return;

    // Mark resource as failed
    resource.status = "failed";

    // Emit critical failure event
    this.emit("critical-failure", {
      resourceId,
      failure,
      resource
    });

    this.logger.error("Critical resource failure", {
      resourceId,
      failure
    });
  }

  /**
   * Update performance metrics for a resource
   */
  private updatePerformanceMetrics(resourceId: string, usage: ResourceUsage): void {
    const resource = this.resources.get(resourceId);
    if (!resource) return;

    const metrics: PerformanceMetrics = {
      throughput: this.calculateThroughput(resourceId),
      latency: this.calculateLatency(resourceId),
      utilization: this.calculateUtilizationFromUsage(resource, usage),
      efficiency: this.calculateEfficiency(resourceId),
      quality: this.calculateQualityScore(resourceId)
    };

    // Store performance history
    if (!this.performanceHistory.has(resourceId)) {
      this.performanceHistory.set(resourceId, []);
    }

    const history = this.performanceHistory.get(resourceId)!;
    history.push(metrics);

    // Limit history size
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    // Update resource metadata
    resource.metadata.performanceMetrics = metrics;
  }

  /**
   * Update reliability metrics for a resource
   */
  private updateReliabilityMetrics(resourceId: string): void {
    const resource = this.resources.get(resourceId);
    if (!resource) return;

    const failures = this.failureHistory.get(resourceId) || [];
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    // Calculate uptime (simplified)
    const recentFailures = failures.filter(f => 
      now.getTime() - f.timestamp.getTime() < oneDay
    );

    const uptime = Math.max(0, 1 - (recentFailures.length / 100)); // Simplified calculation

    const reliability: ReliabilityMetrics = {
      uptime,
      mtbf: this.calculateMTBF(failures),
      mttr: this.calculateMTTR(failures),
      errorRate: this.calculateErrorRate(resourceId)
    };

    resource.metadata.reliabilityMetrics = reliability;
  }

  /**
   * Clean up old monitoring data
   */
  private cleanupOldData(): void {
    const cutoff = new Date(Date.now() - this.config.retentionPeriod);

    for (const [resourceId, history] of this.usageHistory) {
      const filtered = history.filter(h => h.timestamp > cutoff);
      this.usageHistory.set(resourceId, filtered);
    }

    for (const [resourceId, history] of this.failureHistory) {
      const filtered = history.filter(h => h.timestamp > cutoff);
      this.failureHistory.set(resourceId, filtered);
    }

    for (const [resourceId, history] of this.performanceHistory) {
      const filtered = history.filter(h => h.timestamp > cutoff);
      this.performanceHistory.set(resourceId, filtered);
    }
  }

  // Utility calculation methods
  private calculateResourceUtilization(resource: Resource): number {
    const cpuUtil = resource.allocated.cpu / resource.capacity.cpu;
    const memUtil = resource.allocated.memory / resource.capacity.memory;
    const diskUtil = resource.allocated.disk / resource.capacity.disk;
    
    return Math.max(cpuUtil, memUtil, diskUtil);
  }

  private calculateUtilizationFromUsage(resource: Resource, usage: ResourceUsage): number {
    const cpuUtil = usage.cpu / resource.capacity.cpu;
    const memUtil = usage.memory / resource.capacity.memory;
    const diskUtil = usage.disk / resource.capacity.disk;
    
    return Math.max(cpuUtil, memUtil, diskUtil);
  }

  private calculateAverageUsage(history: ResourceUsage[]): ResourceUsage {
    if (history.length === 0) {
      return {
        cpu: 0,
        memory: 0,
        disk: 0,
        network: 0,
        custom: {},
        timestamp: new Date(),
        duration: 0
      };
    }

    const sum = history.reduce((acc, usage) => ({
      cpu: acc.cpu + usage.cpu,
      memory: acc.memory + usage.memory,
      disk: acc.disk + usage.disk,
      network: acc.network + usage.network,
      gpu: (acc.gpu || 0) + (usage.gpu || 0),
      custom: acc.custom,
      timestamp: new Date(),
      duration: acc.duration + (usage.duration || 0)
    }));

    return {
      cpu: sum.cpu / history.length,
      memory: sum.memory / history.length,
      disk: sum.disk / history.length,
      network: sum.network / history.length,
      gpu: sum.gpu ? sum.gpu / history.length : undefined,
      custom: sum.custom,
      timestamp: new Date(),
      duration: sum.duration / history.length
    };
  }

  private calculateStandardDeviation(history: ResourceUsage[]): ResourceUsage {
    const avg = this.calculateAverageUsage(history);
    
    const variance = history.reduce((acc, usage) => ({
      cpu: acc.cpu + Math.pow(usage.cpu - avg.cpu, 2),
      memory: acc.memory + Math.pow(usage.memory - avg.memory, 2),
      disk: acc.disk + Math.pow(usage.disk - avg.disk, 2),
      network: acc.network + Math.pow(usage.network - avg.network, 2),
      custom: acc.custom,
      timestamp: new Date(),
      duration: 0
    }), { cpu: 0, memory: 0, disk: 0, network: 0, custom: {}, timestamp: new Date(), duration: 0 });

    return {
      cpu: Math.sqrt(variance.cpu / history.length),
      memory: Math.sqrt(variance.memory / history.length),
      disk: Math.sqrt(variance.disk / history.length),
      network: Math.sqrt(variance.network / history.length),
      custom: {},
      timestamp: new Date(),
      duration: 0
    };
  }

  private calculateTrend(history: ResourceUsage[]): ResourceUsage {
    if (history.length < 2) {
      return {
        cpu: 0,
        memory: 0,
        disk: 0,
        network: 0,
        custom: {},
        timestamp: new Date(),
        duration: 0
      };
    }

    const first = history[0];
    const last = history[history.length - 1];
    const periods = history.length - 1;

    return {
      cpu: (last.cpu - first.cpu) / periods,
      memory: (last.memory - first.memory) / periods,
      disk: (last.disk - first.disk) / periods,
      network: (last.network - first.network) / periods,
      gpu: first.gpu && last.gpu ? (last.gpu - first.gpu) / periods : undefined,
      custom: {},
      timestamp: new Date(),
      duration: 0
    };
  }

  private calculatePredictionConfidence(history: ResourceUsage[]): number {
    // Simple confidence based on history length and variance
    const length = Math.min(history.length / 100, 1);
    const variance = this.calculateStandardDeviation(history);
    const varianceScore = 1 / (1 + variance.cpu + variance.memory + variance.disk);
    
    return (length + varianceScore) / 2;
  }

  private calculateSuccessRate(resourceId: string): number {
    // Simplified calculation
    return 0.95; // 95% success rate
  }

  private calculateAverageAllocationTime(resourceId: string): number {
    // Simplified calculation
    return 1000; // 1 second average
  }

  private calculateTotalCost(resourceId: string): number {
    const resource = this.resources.get(resourceId);
    if (!resource) return 0;
    
    return resource.allocations.reduce((sum, alloc) => sum + (alloc.cost || 0), 0);
  }

  private countQoSViolations(resourceId: string): number {
    // Simplified calculation
    return 0;
  }

  private calculateThroughput(resourceId: string): number {
    // Simplified calculation
    return 100; // Operations per second
  }

  private calculateLatency(resourceId: string): number {
    // Simplified calculation
    return 10; // Milliseconds
  }

  private calculateEfficiency(resourceId: string): number {
    // Simplified calculation
    return 0.85; // 85% efficiency
  }

  private calculateQualityScore(resourceId: string): number {
    // Simplified calculation
    return 0.9; // 90% quality
  }

  private calculateMTBF(failures: FailureRecord[]): number {
    if (failures.length < 2) return Infinity;
    
    const intervals = [];
    for (let i = 1; i < failures.length; i++) {
      intervals.push(failures[i].timestamp.getTime() - failures[i-1].timestamp.getTime());
    }
    
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  private calculateMTTR(failures: FailureRecord[]): number {
    const resolvedFailures = failures.filter(f => f.resolved && f.resolutionTime);
    if (resolvedFailures.length === 0) return 0;
    
    const totalTime = resolvedFailures.reduce((sum, f) => sum + (f.resolutionTime || 0), 0);
    return totalTime / resolvedFailures.length;
  }

  private calculateErrorRate(resourceId: string): number {
    const failures = this.failureHistory.get(resourceId) || [];
    const recentFailures = failures.filter(f => 
      Date.now() - f.timestamp.getTime() < 3600000 // Last hour
    );
    
    return recentFailures.length / 100; // Simplified rate
  }

  // Getters for external access
  setResources(resources: Map<string, Resource>): void {
    this.resources = resources;
  }

  getUsageHistory(resourceId: string): ResourceUsage[] {
    return this.usageHistory.get(resourceId) || [];
  }

  getFailureHistory(resourceId: string): FailureRecord[] {
    return this.failureHistory.get(resourceId) || [];
  }

  getPerformanceHistory(resourceId: string): PerformanceMetrics[] {
    return this.performanceHistory.get(resourceId) || [];
  }
}