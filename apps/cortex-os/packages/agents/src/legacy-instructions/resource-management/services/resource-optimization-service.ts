/**
 * @file Resource Optimization Service
 * @description Handles resource optimization, QoS management, and predictive analysis
 * @split_from resource-manager.ts
 */

import { EventEmitter } from "node:events";
import type { ILogger } from "../../core/logger.js";
import type {
  Resource,
  ResourceUsage,
  ResourceRequirements,
  ResourcePrediction,
  OptimizationTarget,
  OptimizationResult,
  QoSObjective,
  ResourceAllocation,
  ResourcePool,
  PerformanceMetrics,
  ResourcePriority
} from "../types/index.js";

export interface OptimizationConfig {
  enabled: boolean;
  interval: number;
  enablePredictive: boolean;
  enableQoS: boolean;
  optimizationTargets: OptimizationTarget[];
  predictionHorizon: number;
  confidenceThreshold: number;
}

export interface QoSViolation {
  timestamp: Date;
  metric: string;
  expected: number;
  actual: number;
  severity: "low" | "medium" | "high" | "critical";
  duration: number;
  resolved: boolean;
}

export class ResourceOptimizationService extends EventEmitter {
  private logger: ILogger;
  private config: OptimizationConfig;
  private resources = new Map<string, Resource>();
  private allocations = new Map<string, ResourceAllocation>();
  private pools = new Map<string, ResourcePool>();
  private predictions = new Map<string, ResourcePrediction>();
  private optimizationHistory = new Map<string, OptimizationResult[]>();
  private optimizationInterval?: NodeJS.Timeout;

  constructor(logger: ILogger, config: OptimizationConfig) {
    super();
    this.logger = logger;
    this.config = config;
  }

  /**
   * Initialize optimization service
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.debug("Resource optimization is disabled");
      return;
    }

    this.logger.info("Initializing resource optimization service", {
      interval: this.config.interval,
      predictive: this.config.enablePredictive,
      qos: this.config.enableQoS
    });

    // Start optimization cycle
    this.optimizationInterval = setInterval(
      () => this.performOptimizationCycle(),
      this.config.interval
    );

    this.emit("optimization:initialized");
  }

  /**
   * Shutdown optimization service
   */
  async shutdown(): Promise<void> {
    this.logger.info("Shutting down resource optimization service");

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = undefined;
    }

    this.emit("optimization:shutdown");
  }

  /**
   * Predict future resource usage
   */
  async predictUsage(resource: Resource, history: ResourceUsage[]): Promise<ResourcePrediction> {
    if (history.length < 5) {
      // Not enough history for prediction
      return {
        resourceId: resource.id,
        predictedUsage: history[history.length - 1] || this.createEmptyUsage(),
        confidence: 0.1,
        timeHorizon: this.config.predictionHorizon,
        factors: ["insufficient_data"]
      };
    }

    try {
      // Simple trend-based prediction (in production, use ML models)
      const trend = this.calculateTrend(history);
      const seasonal = this.detectSeasonality(history);
      const baseUsage = this.calculateAverageUsage(history.slice(-5));

      const predictedUsage: ResourceUsage = {
        cpu: Math.max(0, baseUsage.cpu + trend.cpu + seasonal.cpu),
        memory: Math.max(0, baseUsage.memory + trend.memory + seasonal.memory),
        disk: Math.max(0, baseUsage.disk + trend.disk + seasonal.disk),
        network: Math.max(0, baseUsage.network + trend.network + seasonal.network),
        gpu: baseUsage.gpu ? Math.max(0, baseUsage.gpu + (trend.gpu || 0) + (seasonal.gpu || 0)) : undefined,
        custom: { ...baseUsage.custom },
        timestamp: new Date(Date.now() + this.config.predictionHorizon),
        duration: this.config.predictionHorizon
      };

      const confidence = this.calculatePredictionConfidence(history, trend, seasonal);

      return {
        resourceId: resource.id,
        predictedUsage,
        confidence,
        timeHorizon: this.config.predictionHorizon,
        factors: ["trend_analysis", "seasonal_pattern", "historical_average"]
      };

    } catch (error) {
      this.logger.error("Failed to predict resource usage", {
        resourceId: resource.id,
        error
      });

      return {
        resourceId: resource.id,
        predictedUsage: this.createEmptyUsage(),
        confidence: 0,
        timeHorizon: this.config.predictionHorizon,
        factors: ["prediction_error"]
      };
    }
  }

  /**
   * Optimize resource allocation
   */
  async optimizeAllocation(
    requirements: ResourceRequirements,
    candidates: Resource[]
  ): Promise<Resource | null> {
    if (candidates.length === 0) {
      return null;
    }

    // Score each candidate resource
    const scoredCandidates = candidates.map(resource => ({
      resource,
      score: this.calculateOptimizationScore(resource, requirements)
    }));

    // Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Apply optimization targets
    const optimized = this.applyOptimizationTargets(scoredCandidates, requirements);

    return optimized?.resource || null;
  }

  /**
   * Optimize pool configuration
   */
  async optimizePool(poolId: string): Promise<OptimizationResult> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Pool ${poolId} not found`);
    }

    this.logger.debug("Optimizing pool configuration", { poolId });

    const improvements: Record<string, number> = {};
    const recommendations: string[] = [];
    let estimatedSavings = 0;

    try {
      // Analyze current pool performance
      const currentMetrics = this.calculatePoolPerformanceMetrics(pool);
      
      // Check for optimization opportunities
      const underutilizedResources = this.findUnderutilizedResources(pool);
      const overloadedResources = this.findOverloadedResources(pool);
      
      // Recommend scaling adjustments
      if (underutilizedResources.length > 0) {
        const potentialSavings = this.calculatePotentialSavings(underutilizedResources);
        improvements["cost_reduction"] = potentialSavings;
        estimatedSavings += potentialSavings;
        recommendations.push(`Consider scaling down ${underutilizedResources.length} underutilized resources`);
      }

      if (overloadedResources.length > 0) {
        improvements["performance_gain"] = overloadedResources.length * 0.1;
        recommendations.push(`Consider scaling up ${overloadedResources.length} overloaded resources`);
      }

      // Analyze load balancing efficiency
      const loadBalanceScore = this.calculateLoadBalanceScore(pool);
      if (loadBalanceScore < 0.8) {
        improvements["load_balance"] = 0.8 - loadBalanceScore;
        recommendations.push("Improve load balancing strategy for better resource distribution");
      }

      // Check for better allocation strategies
      const optimalStrategy = this.recommendAllocationStrategy(pool);
      if (optimalStrategy !== pool.strategy) {
        improvements["allocation_efficiency"] = 0.15;
        recommendations.push(`Consider switching to ${optimalStrategy} allocation strategy`);
      }

      const result: OptimizationResult = {
        success: true,
        improvements,
        recommendations,
        estimatedSavings,
        confidence: 0.85
      };

      // Store optimization history
      if (!this.optimizationHistory.has(poolId)) {
        this.optimizationHistory.set(poolId, []);
      }
      this.optimizationHistory.get(poolId)!.push(result);

      this.emit("pool:optimized", { poolId, result });

      return result;

    } catch (error) {
      this.logger.error("Pool optimization failed", { poolId, error });
      
      return {
        success: false,
        improvements: {},
        recommendations: ["Optimization failed - check pool configuration"],
        estimatedSavings: 0,
        confidence: 0
      };
    }
  }

  /**
   * Check QoS violations for an allocation
   */
  async checkQoSViolation(
    allocation: ResourceAllocation,
    metric: string,
    expected: number,
    actual: number,
    operator: "min" | "max" | "equal"
  ): Promise<QoSViolation | null> {
    const violated = this.evaluateQoSCondition(actual, operator, expected);
    
    if (!violated) {
      return null;
    }

    const severity = this.calculateViolationSeverity(expected, actual, operator);
    
    const violation: QoSViolation = {
      timestamp: new Date(),
      metric,
      expected,
      actual,
      severity,
      duration: 0,
      resolved: false
    };

    this.logger.warn("QoS violation detected", {
      allocationId: allocation.id,
      metric,
      expected,
      actual,
      severity
    });

    this.emit("qos:violation", { allocation, violation });

    return violation;
  }

  /**
   * Remediate QoS violation
   */
  async remediateQoSViolation(
    allocation: ResourceAllocation,
    violation: QoSViolation
  ): Promise<boolean> {
    this.logger.info("Attempting QoS violation remediation", {
      allocationId: allocation.id,
      metric: violation.metric,
      severity: violation.severity
    });

    try {
      switch (violation.metric) {
        case "cpu_utilization":
          return await this.remediateCpuViolation(allocation, violation);
        
        case "memory_utilization":
          return await this.remediateMemoryViolation(allocation, violation);
        
        case "latency":
          return await this.remediateLatencyViolation(allocation, violation);
        
        case "throughput":
          return await this.remediateThroughputViolation(allocation, violation);
        
        default:
          this.logger.warn("Unknown QoS metric for remediation", {
            metric: violation.metric
          });
          return false;
      }

    } catch (error) {
      this.logger.error("QoS remediation failed", {
        allocationId: allocation.id,
        error
      });
      return false;
    }
  }

  /**
   * Perform optimization cycle
   */
  private async performOptimizationCycle(): Promise<void> {
    try {
      this.logger.debug("Starting optimization cycle");

      // Update predictions if enabled
      if (this.config.enablePredictive) {
        await this.updateAllPredictions();
      }

      // Optimize all pools
      for (const poolId of this.pools.keys()) {
        await this.optimizePool(poolId);
      }

      // Check QoS violations if enabled
      if (this.config.enableQoS) {
        await this.checkAllQoSViolations();
      }

      this.emit("optimization:cycle-complete");

    } catch (error) {
      this.logger.error("Optimization cycle failed", { error });
      this.emit("optimization:cycle-failed", { error });
    }
  }

  /**
   * Update predictions for all resources
   */
  private async updateAllPredictions(): Promise<void> {
    for (const resource of this.resources.values()) {
      try {
        // Get usage history (simulated - in real implementation, get from monitoring)
        const history = this.generateSimulatedUsageHistory(resource);
        
        if (history.length >= 5) {
          const prediction = await this.predictUsage(resource, history);
          this.predictions.set(resource.id, prediction);

          if (prediction.confidence > this.config.confidenceThreshold) {
            this.emit("prediction:updated", { resourceId: resource.id, prediction });
          }
        }

      } catch (error) {
        this.logger.error("Failed to update prediction for resource", {
          resourceId: resource.id,
          error
        });
      }
    }
  }

  /**
   * Check QoS violations for all active allocations
   */
  private async checkAllQoSViolations(): Promise<void> {
    for (const allocation of this.allocations.values()) {
      if (allocation.endTime) continue; // Skip completed allocations

      const resource = this.resources.get(allocation.resourceId);
      if (!resource) continue;

      // Find pools containing this resource
      const pools = Array.from(this.pools.values()).filter(pool =>
        pool.resources.includes(resource.id)
      );

      // Check QoS for each pool
      for (const pool of pools) {
        if (!pool.qos.enabled) continue;

        for (const objective of pool.qos.objectives) {
          const actualValue = this.getMetricValue(allocation, objective.metric);
          const violation = await this.checkQoSViolation(
            allocation,
            objective.metric,
            objective.target,
            actualValue,
            "min" // Simplified - in real implementation, derive from objective
          );

          if (violation) {
            // Attempt remediation
            const remediated = await this.remediateQoSViolation(allocation, violation);
            if (remediated) {
              violation.resolved = true;
              this.logger.info("QoS violation automatically remediated", {
                allocationId: allocation.id,
                metric: violation.metric
              });
            }
          }
        }
      }
    }
  }

  // Optimization scoring methods
  private calculateOptimizationScore(resource: Resource, requirements: ResourceRequirements): number {
    let score = 0;

    // Apply optimization targets
    for (const target of this.config.optimizationTargets) {
      const metricValue = this.getResourceMetricValue(resource, target.metric);
      const normalizedValue = this.normalizeMetricValue(target.metric, metricValue);
      
      if (target.direction === "maximize") {
        score += normalizedValue * target.weight;
      } else {
        score += (1 - normalizedValue) * target.weight;
      }
    }

    return score;
  }

  private applyOptimizationTargets(
    candidates: Array<{ resource: Resource; score: number }>,
    requirements: ResourceRequirements
  ): { resource: Resource; score: number } | null {
    if (candidates.length === 0) return null;

    // For now, return the highest scored candidate
    // In production, this would apply more sophisticated optimization logic
    return candidates[0];
  }

  // Utility calculation methods
  private calculateTrend(history: ResourceUsage[]): ResourceUsage {
    if (history.length < 2) {
      return this.createEmptyUsage();
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

  private detectSeasonality(history: ResourceUsage[]): ResourceUsage {
    // Simplified seasonality detection
    // In production, use proper time series analysis
    return this.createEmptyUsage();
  }

  private calculateAverageUsage(history: ResourceUsage[]): ResourceUsage {
    if (history.length === 0) {
      return this.createEmptyUsage();
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

  private calculatePredictionConfidence(
    history: ResourceUsage[],
    trend: ResourceUsage,
    seasonal: ResourceUsage
  ): number {
    // Simplified confidence calculation
    const variance = this.calculateUsageVariance(history);
    const trendStability = this.calculateTrendStability(history);
    
    return Math.min(1.0, (1 / (1 + variance)) * trendStability);
  }

  private calculateUsageVariance(history: ResourceUsage[]): number {
    const avg = this.calculateAverageUsage(history);
    const variance = history.reduce((acc, usage) => 
      acc + Math.pow(usage.cpu - avg.cpu, 2) + 
           Math.pow(usage.memory - avg.memory, 2), 0
    ) / history.length;
    
    return Math.sqrt(variance);
  }

  private calculateTrendStability(history: ResourceUsage[]): number {
    // Simple stability measure
    return Math.max(0.1, 1 - (this.calculateUsageVariance(history) / 100));
  }

  private calculatePoolPerformanceMetrics(pool: ResourcePool): Record<string, number> {
    const resources = pool.resources
      .map(id => this.resources.get(id))
      .filter(r => r) as Resource[];

    const totalUtilization = resources.reduce((sum, r) => 
      sum + this.calculateResourceUtilization(r), 0);
    
    return {
      averageUtilization: resources.length > 0 ? totalUtilization / resources.length : 0,
      totalResources: resources.length,
      availableResources: resources.filter(r => r.status === "available").length
    };
  }

  private findUnderutilizedResources(pool: ResourcePool): Resource[] {
    return pool.resources
      .map(id => this.resources.get(id))
      .filter(r => r && this.calculateResourceUtilization(r) < 0.3) as Resource[];
  }

  private findOverloadedResources(pool: ResourcePool): Resource[] {
    return pool.resources
      .map(id => this.resources.get(id))
      .filter(r => r && this.calculateResourceUtilization(r) > 0.9) as Resource[];
  }

  private calculatePotentialSavings(resources: Resource[]): number {
    return resources.reduce((sum, resource) => sum + resource.cost * 0.5, 0);
  }

  private calculateLoadBalanceScore(pool: ResourcePool): number {
    const resources = pool.resources
      .map(id => this.resources.get(id))
      .filter(r => r) as Resource[];

    if (resources.length === 0) return 1.0;

    const utilizations = resources.map(r => this.calculateResourceUtilization(r));
    const avg = utilizations.reduce((sum, util) => sum + util, 0) / utilizations.length;
    const variance = utilizations.reduce((sum, util) => sum + Math.pow(util - avg, 2), 0) / utilizations.length;
    
    return Math.max(0, 1 - Math.sqrt(variance));
  }

  private recommendAllocationStrategy(pool: ResourcePool): string {
    const metrics = this.calculatePoolPerformanceMetrics(pool);
    
    if (metrics.averageUtilization > 0.8) {
      return "least-used";
    } else if (metrics.averageUtilization < 0.3) {
      return "most-used";
    } else {
      return "weighted";
    }
  }

  private evaluateQoSCondition(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case "min":
        return actual < expected;
      case "max":
        return actual > expected;
      case "equal":
        return Math.abs(actual - expected) > expected * 0.1; // 10% tolerance
      default:
        return false;
    }
  }

  private calculateViolationSeverity(expected: number, actual: number, operator: string): "low" | "medium" | "high" | "critical" {
    const deviation = Math.abs(actual - expected) / expected;
    
    if (deviation > 0.5) return "critical";
    if (deviation > 0.3) return "high";
    if (deviation > 0.1) return "medium";
    return "low";
  }

  private getMetricValue(allocation: ResourceAllocation, metric: string): number {
    switch (metric) {
      case "cpu_utilization":
        return allocation.actualUsage.cpu;
      case "memory_utilization":
        return allocation.actualUsage.memory;
      case "latency":
        return 10; // Simplified
      case "throughput":
        return 100; // Simplified
      default:
        return 0;
    }
  }

  private getResourceMetricValue(resource: Resource, metric: string): number {
    switch (metric) {
      case "utilization":
        return this.calculateResourceUtilization(resource);
      case "cost":
        return resource.cost;
      case "performance":
        return resource.metadata.performanceMetrics.efficiency;
      case "reliability":
        return resource.metadata.reliabilityMetrics.uptime;
      default:
        return 0;
    }
  }

  private normalizeMetricValue(metric: string, value: number): number {
    // Normalize values to 0-1 range based on metric type
    switch (metric) {
      case "utilization":
        return Math.min(1, value);
      case "cost":
        return Math.min(1, 1 / Math.max(0.1, value));
      case "performance":
      case "reliability":
        return Math.min(1, value);
      default:
        return value;
    }
  }

  private calculateResourceUtilization(resource: Resource): number {
    const cpuUtil = resource.allocated.cpu / resource.capacity.cpu;
    const memUtil = resource.allocated.memory / resource.capacity.memory;
    const diskUtil = resource.allocated.disk / resource.capacity.disk;
    
    return Math.max(cpuUtil, memUtil, diskUtil);
  }

  // QoS remediation methods
  private async remediateCpuViolation(allocation: ResourceAllocation, violation: QoSViolation): Promise<boolean> {
    // Simplified remediation
    this.logger.info("Attempting CPU violation remediation", { allocationId: allocation.id });
    return true;
  }

  private async remediateMemoryViolation(allocation: ResourceAllocation, violation: QoSViolation): Promise<boolean> {
    this.logger.info("Attempting memory violation remediation", { allocationId: allocation.id });
    return true;
  }

  private async remediateLatencyViolation(allocation: ResourceAllocation, violation: QoSViolation): Promise<boolean> {
    this.logger.info("Attempting latency violation remediation", { allocationId: allocation.id });
    return true;
  }

  private async remediateThroughputViolation(allocation: ResourceAllocation, violation: QoSViolation): Promise<boolean> {
    this.logger.info("Attempting throughput violation remediation", { allocationId: allocation.id });
    return true;
  }

  private generateSimulatedUsageHistory(resource: Resource): ResourceUsage[] {
    // Generate simulated history for testing
    const history: ResourceUsage[] = [];
    const now = Date.now();
    
    for (let i = 0; i < 20; i++) {
      history.push({
        cpu: Math.random() * resource.capacity.cpu * 0.7,
        memory: Math.random() * resource.capacity.memory * 0.7,
        disk: Math.random() * resource.capacity.disk * 0.7,
        network: Math.random() * resource.capacity.network * 0.7,
        custom: {},
        timestamp: new Date(now - (20 - i) * 60000),
        duration: 60000
      });
    }
    
    return history;
  }

  private createEmptyUsage(): ResourceUsage {
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

  // Getters for external access
  setResources(resources: Map<string, Resource>): void {
    this.resources = resources;
  }

  setAllocations(allocations: Map<string, ResourceAllocation>): void {
    this.allocations = allocations;
  }

  setPools(pools: Map<string, ResourcePool>): void {
    this.pools = pools;
  }

  getPredictions(): Map<string, ResourcePrediction> {
    return this.predictions;
  }

  getOptimizationHistory(poolId: string): OptimizationResult[] {
    return this.optimizationHistory.get(poolId) || [];
  }
}