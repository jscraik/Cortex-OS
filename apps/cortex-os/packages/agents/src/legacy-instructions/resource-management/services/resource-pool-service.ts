/**
 * @file Resource Pool Service
 * @description Handles resource pool management, load balancing, and scaling operations
 * @split_from resource-manager.ts
 */

import { EventEmitter } from "node:events";
import type { ILogger } from "../../core/logger.js";
import { generateId } from "../../utils/helpers.js";
import type {
  Resource,
  ResourcePool,
  PoolStrategy,
  LoadBalancingStrategy,
  ScalingStrategy,
  PoolStatistics,
  ResourceFilter,
  ResourceRequirements,
  ResourcePriority,
  ScalingConfig
} from "../types/index.js";

export interface PoolConfig {
  enableAutoScaling: boolean;
  defaultMinResources: number;
  defaultMaxResources: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number;
  loadBalancing: LoadBalancingStrategy;
}

export class ResourcePoolService extends EventEmitter {
  private logger: ILogger;
  private config: PoolConfig;
  private pools = new Map<string, ResourcePool>();
  private resources = new Map<string, Resource>();
  private scalingTimers = new Map<string, NodeJS.Timeout>();
  private poolMetrics = new Map<string, PoolStatistics>();

  constructor(logger: ILogger, config: PoolConfig) {
    super();
    this.logger = logger;
    this.config = config;
  }

  /**
   * Create a new resource pool
   */
  async createResourcePool(
    name: string,
    type: string,
    resourceIds: string[],
    strategy: PoolStrategy = "least-used",
    scaling?: Partial<ScalingConfig>
  ): Promise<string> {
    const poolId = generateId("pool");

    // Validate resources exist and are of correct type
    for (const resourceId of resourceIds) {
      const resource = this.resources.get(resourceId);
      if (!resource) {
        throw new Error(`Resource ${resourceId} not found`);
      }
      if (resource.type !== type) {
        throw new Error(
          `Resource ${resourceId} type mismatch: expected ${type}, got ${resource.type}`
        );
      }
    }

    const scalingConfig: ScalingConfig = {
      enabled: this.config.enableAutoScaling,
      minResources: scaling?.minResources || this.config.defaultMinResources,
      maxResources: scaling?.maxResources || this.config.defaultMaxResources,
      scaleUpThreshold: scaling?.scaleUpThreshold || this.config.scaleUpThreshold,
      scaleDownThreshold: scaling?.scaleDownThreshold || this.config.scaleDownThreshold,
      cooldownPeriod: scaling?.cooldownPeriod || this.config.cooldownPeriod,
      strategy: scaling?.strategy || "reactive"
    };

    const pool: ResourcePool = {
      id: poolId,
      name,
      type,
      resources: [...resourceIds],
      strategy,
      loadBalancing: this.config.loadBalancing,
      scaling: scalingConfig,
      qos: {
        enabled: true,
        guarantees: [],
        objectives: []
      },
      statistics: this.createEmptyStatistics(),
      filters: []
    };

    this.pools.set(poolId, pool);
    this.poolMetrics.set(poolId, pool.statistics);

    // Start auto-scaling if enabled
    if (scalingConfig.enabled) {
      this.startAutoScaling(poolId);
    }

    this.logger.info("Resource pool created", {
      poolId,
      name,
      type,
      resourceCount: resourceIds.length,
      strategy
    });

    this.emit("pool:created", { pool });

    return poolId;
  }

  /**
   * Delete a resource pool
   */
  async deleteResourcePool(poolId: string): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Pool ${poolId} not found`);
    }

    // Stop auto-scaling
    this.stopAutoScaling(poolId);

    // Remove pool
    this.pools.delete(poolId);
    this.poolMetrics.delete(poolId);

    this.logger.info("Resource pool deleted", { poolId });
    this.emit("pool:deleted", { poolId });
  }

  /**
   * Add resource to pool
   */
  async addResourceToPool(poolId: string, resourceId: string): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Pool ${poolId} not found`);
    }

    const resource = this.resources.get(resourceId);
    if (!resource) {
      throw new Error(`Resource ${resourceId} not found`);
    }

    if (resource.type !== pool.type) {
      throw new Error(
        `Resource type mismatch: pool expects ${pool.type}, resource is ${resource.type}`
      );
    }

    if (!pool.resources.includes(resourceId)) {
      pool.resources.push(resourceId);
      this.updatePoolStatistics(pool);
    }

    this.logger.info("Resource added to pool", { poolId, resourceId });
    this.emit("pool:resource-added", { poolId, resourceId });
  }

  /**
   * Remove resource from pool
   */
  async removeResourceFromPool(poolId: string, resourceId: string): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Pool ${poolId} not found`);
    }

    if (pool.resources.length <= pool.scaling.minResources) {
      throw new Error(
        "Cannot remove resource: pool would go below minimum size"
      );
    }

    pool.resources = pool.resources.filter(id => id !== resourceId);
    this.updatePoolStatistics(pool);

    this.logger.info("Resource removed from pool", { poolId, resourceId });
    this.emit("pool:resource-removed", { poolId, resourceId });
  }

  /**
   * Select best resource from pool based on strategy
   */
  selectResourceFromPool(
    poolId: string,
    requirements: ResourceRequirements,
    priority: ResourcePriority
  ): Resource | null {
    const pool = this.pools.get(poolId);
    if (!pool) {
      throw new Error(`Pool ${poolId} not found`);
    }

    // Get available resources from pool
    const availableResources = pool.resources
      .map(id => this.resources.get(id))
      .filter(resource => resource && resource.status === "available")
      .filter(resource => this.canSatisfyRequirements(resource!, requirements)) as Resource[];

    if (availableResources.length === 0) {
      return null;
    }

    // Apply pool strategy
    return this.applyPoolStrategy(pool, availableResources, requirements, priority);
  }

  /**
   * Apply pool selection strategy
   */
  private applyPoolStrategy(
    pool: ResourcePool,
    resources: Resource[],
    requirements: ResourceRequirements,
    priority: ResourcePriority
  ): Resource {
    switch (pool.strategy) {
      case "round-robin":
        return this.selectRoundRobin(pool, resources);

      case "least-used":
        return this.selectLeastUsed(resources);

      case "most-used":
        return this.selectMostUsed(resources);

      case "random":
        return this.selectRandom(resources);

      case "weighted":
        return this.selectWeighted(resources, requirements, priority);

      default:
        return this.selectLeastUsed(resources);
    }
  }

  /**
   * Round-robin selection
   */
  private selectRoundRobin(pool: ResourcePool, resources: Resource[]): Resource {
    const statistics = this.poolMetrics.get(pool.id)!;
    const index = statistics.totalRequests % resources.length;
    return resources[index];
  }

  /**
   * Least-used selection
   */
  private selectLeastUsed(resources: Resource[]): Resource {
    return resources.reduce((least, current) => {
      const leastUtil = this.calculateResourceUtilization(least);
      const currentUtil = this.calculateResourceUtilization(current);
      return currentUtil < leastUtil ? current : least;
    });
  }

  /**
   * Most-used selection
   */
  private selectMostUsed(resources: Resource[]): Resource {
    return resources.reduce((most, current) => {
      const mostUtil = this.calculateResourceUtilization(most);
      const currentUtil = this.calculateResourceUtilization(current);
      return currentUtil > mostUtil ? current : most;
    });
  }

  /**
   * Random selection
   */
  private selectRandom(resources: Resource[]): Resource {
    const index = Math.floor(Math.random() * resources.length);
    return resources[index];
  }

  /**
   * Weighted selection based on performance and priority
   */
  private selectWeighted(
    resources: Resource[],
    requirements: ResourceRequirements,
    priority: ResourcePriority
  ): Resource {
    const scores = resources.map(resource => ({
      resource,
      score: this.calculateResourceScore(resource, requirements, priority)
    }));

    // Sort by score (highest first)
    scores.sort((a, b) => b.score - a.score);

    return scores[0].resource;
  }

  /**
   * Calculate resource score for weighted selection
   */
  private calculateResourceScore(
    resource: Resource,
    requirements: ResourceRequirements,
    priority: ResourcePriority
  ): number {
    let score = 0;

    // Performance score
    score += resource.metadata.performanceMetrics.efficiency * 40;

    // Utilization score (prefer less utilized)
    const utilization = this.calculateResourceUtilization(resource);
    score += (1 - utilization) * 30;

    // Reliability score
    score += resource.metadata.reliabilityMetrics.uptime * 20;

    // Cost efficiency (lower cost is better)
    score += (1 / resource.cost) * 10;

    return score;
  }

  /**
   * Update pool statistics
   */
  updatePoolStatistics(pool: ResourcePool): void {
    const resources = pool.resources
      .map(id => this.resources.get(id))
      .filter(r => r) as Resource[];

    const totalResources = resources.length;
    const availableResources = resources.filter(r => r.status === "available").length;
    const allocatedResources = totalResources - availableResources;

    let totalUtilization = 0;
    let peakUtilization = 0;

    for (const resource of resources) {
      const utilization = this.calculateResourceUtilization(resource);
      totalUtilization += utilization;
      peakUtilization = Math.max(peakUtilization, utilization);
    }

    const averageUtilization = totalResources > 0 ? totalUtilization / totalResources : 0;

    const statistics: PoolStatistics = {
      totalResources,
      availableResources,
      allocatedResources,
      averageUtilization,
      peakUtilization,
      totalRequests: pool.statistics.totalRequests,
      successfulAllocations: pool.statistics.successfulAllocations,
      failedAllocations: pool.statistics.failedAllocations,
      averageWaitTime: pool.statistics.averageWaitTime
    };

    pool.statistics = statistics;
    this.poolMetrics.set(pool.id, statistics);

    this.emit("pool:statistics-updated", { poolId: pool.id, statistics });
  }

  /**
   * Record pool allocation attempt
   */
  recordPoolAllocation(poolId: string, success: boolean, waitTime: number): void {
    const pool = this.pools.get(poolId);
    if (!pool) return;

    pool.statistics.totalRequests++;
    
    if (success) {
      pool.statistics.successfulAllocations++;
    } else {
      pool.statistics.failedAllocations++;
    }

    // Update average wait time (exponential moving average)
    const alpha = 0.1;
    pool.statistics.averageWaitTime = 
      alpha * waitTime + (1 - alpha) * pool.statistics.averageWaitTime;

    this.updatePoolStatistics(pool);
  }

  /**
   * Start auto-scaling for a pool
   */
  private startAutoScaling(poolId: string): void {
    const pool = this.pools.get(poolId);
    if (!pool || !pool.scaling.enabled) return;

    // Clear existing timer if any
    this.stopAutoScaling(poolId);

    // Start new scaling timer
    const timer = setInterval(
      () => this.evaluateScaling(poolId),
      pool.scaling.cooldownPeriod / 2 // Check twice per cooldown period
    );

    this.scalingTimers.set(poolId, timer);

    this.logger.debug("Auto-scaling started for pool", { poolId });
  }

  /**
   * Stop auto-scaling for a pool
   */
  private stopAutoScaling(poolId: string): void {
    const timer = this.scalingTimers.get(poolId);
    if (timer) {
      clearInterval(timer);
      this.scalingTimers.delete(poolId);
      this.logger.debug("Auto-scaling stopped for pool", { poolId });
    }
  }

  /**
   * Evaluate if pool needs scaling
   */
  private async evaluateScaling(poolId: string): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool || !pool.scaling.enabled) return;

    const statistics = pool.statistics;
    const currentSize = pool.resources.length;

    try {
      // Check if we need to scale up
      if (
        statistics.averageUtilization > pool.scaling.scaleUpThreshold &&
        currentSize < pool.scaling.maxResources
      ) {
        await this.scalePoolUp(poolId);
      }
      // Check if we need to scale down
      else if (
        statistics.averageUtilization < pool.scaling.scaleDownThreshold &&
        currentSize > pool.scaling.minResources
      ) {
        await this.scalePoolDown(poolId);
      }

    } catch (error) {
      this.logger.error("Pool scaling evaluation failed", {
        poolId,
        error
      });
    }
  }

  /**
   * Scale pool up by adding resources
   */
  private async scalePoolUp(poolId: string): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) return;

    this.logger.info("Scaling pool up", {
      poolId,
      currentSize: pool.resources.length,
      utilization: pool.statistics.averageUtilization
    });

    // In a real implementation, this would provision new resources
    // For now, we'll simulate by emitting an event
    this.emit("pool:scale-up-needed", {
      poolId,
      currentSize: pool.resources.length,
      targetSize: Math.min(pool.resources.length + 1, pool.scaling.maxResources),
      reason: "high_utilization"
    });
  }

  /**
   * Scale pool down by removing resources
   */
  private async scalePoolDown(poolId: string): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) return;

    // Find least utilized resource to remove
    const resources = pool.resources
      .map(id => this.resources.get(id))
      .filter(r => r) as Resource[];

    const leastUsed = this.selectLeastUsed(resources);
    
    // Only remove if resource has no active allocations
    if (leastUsed.allocations.length === 0) {
      this.logger.info("Scaling pool down", {
        poolId,
        currentSize: pool.resources.length,
        removingResource: leastUsed.id,
        utilization: pool.statistics.averageUtilization
      });

      this.emit("pool:scale-down-needed", {
        poolId,
        currentSize: pool.resources.length,
        targetSize: Math.max(pool.resources.length - 1, pool.scaling.minResources),
        candidateResource: leastUsed.id,
        reason: "low_utilization"
      });
    }
  }

  /**
   * Apply filters to resources
   */
  applyFilters(resources: Resource[], filters: ResourceFilter[]): Resource[] {
    return resources.filter(resource => {
      return filters.every(filter => this.evaluateFilter(resource, filter));
    });
  }

  /**
   * Evaluate a single filter against a resource
   */
  private evaluateFilter(resource: Resource, filter: ResourceFilter): boolean {
    const value = this.getResourceFieldValue(resource, filter.field);
    
    switch (filter.operator) {
      case "eq":
        return value === filter.value;
      case "ne":
        return value !== filter.value;
      case "gt":
        return value > filter.value;
      case "lt":
        return value < filter.value;
      case "gte":
        return value >= filter.value;
      case "lte":
        return value <= filter.value;
      case "in":
        return Array.isArray(filter.value) && filter.value.includes(value);
      case "nin":
        return Array.isArray(filter.value) && !filter.value.includes(value);
      default:
        return true;
    }
  }

  /**
   * Get field value from resource
   */
  private getResourceFieldValue(resource: Resource, field: string): any {
    const parts = field.split(".");
    let value: any = resource;
    
    for (const part of parts) {
      if (value && typeof value === "object") {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Check if resource can satisfy requirements
   */
  private canSatisfyRequirements(resource: Resource, requirements: ResourceRequirements): boolean {
    // Check CPU
    if (requirements.cpu && requirements.cpu > resource.available.cpu) {
      return false;
    }

    // Check memory
    if (requirements.memory && requirements.memory > resource.available.memory) {
      return false;
    }

    // Check disk
    if (requirements.disk && requirements.disk > resource.available.disk) {
      return false;
    }

    // Check network
    if (requirements.network && requirements.network > resource.available.network) {
      return false;
    }

    // Check GPU
    if (requirements.gpu && (!resource.available.gpu || requirements.gpu > resource.available.gpu)) {
      return false;
    }

    // Check custom resources
    if (requirements.custom) {
      for (const [key, value] of Object.entries(requirements.custom)) {
        if (!resource.available.custom[key] || resource.available.custom[key] < value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Calculate resource utilization
   */
  private calculateResourceUtilization(resource: Resource): number {
    const cpuUtil = resource.allocated.cpu / resource.capacity.cpu;
    const memUtil = resource.allocated.memory / resource.capacity.memory;
    const diskUtil = resource.allocated.disk / resource.capacity.disk;
    const netUtil = resource.allocated.network / resource.capacity.network;

    return Math.max(cpuUtil, memUtil, diskUtil, netUtil);
  }

  /**
   * Create empty statistics object
   */
  private createEmptyStatistics(): PoolStatistics {
    return {
      totalResources: 0,
      availableResources: 0,
      allocatedResources: 0,
      averageUtilization: 0,
      peakUtilization: 0,
      totalRequests: 0,
      successfulAllocations: 0,
      failedAllocations: 0,
      averageWaitTime: 0
    };
  }

  // Getters for external access
  setResources(resources: Map<string, Resource>): void {
    this.resources = resources;
  }

  getPools(): Map<string, ResourcePool> {
    return this.pools;
  }

  getPool(poolId: string): ResourcePool | undefined {
    return this.pools.get(poolId);
  }

  getPoolStatistics(poolId: string): PoolStatistics | undefined {
    return this.poolMetrics.get(poolId);
  }

  getAllPoolStatistics(): Map<string, PoolStatistics> {
    return this.poolMetrics;
  }

  /**
   * Shutdown pool service
   */
  async shutdown(): Promise<void> {
    // Stop all scaling timers
    for (const poolId of this.scalingTimers.keys()) {
      this.stopAutoScaling(poolId);
    }

    this.emit("pool-service:shutdown");
    this.logger.info("Resource pool service shutdown complete");
  }
}