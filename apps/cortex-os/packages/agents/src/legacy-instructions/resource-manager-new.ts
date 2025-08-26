/**
 * @file Resource Manager - Refactored Version
 * @description Orchestrates resource management services in a modular architecture
 * @refactored_from resource-manager.ts (2,079 lines → ~300 lines)
 * @version 2.0.0
 */

import { EventEmitter } from "node:events";
import type { ILogger } from "../core/logger.js";
import { generateId } from "../utils/helpers.js";

// Import modular services
import { ResourceAllocationService } from "./resource-management/services/resource-allocation-service.js";
import { ResourceMonitoringService } from "./resource-management/services/resource-monitoring-service.js";
import { ResourcePoolService } from "./resource-management/services/resource-pool-service.js";
import { ResourceOptimizationService } from "./resource-management/services/resource-optimization-service.js";

// Import types
import type {
  ResourceManagerConfig,
  Resource,
  ResourceType,
  ResourceLimits,
  ResourceMetadata,
  ResourceRequirements,
  ResourcePriority,
  PoolStrategy,
  AgentId,
  TaskId,
  AllocationResult,
  ResourceManagerMetrics,
  OptimizationResult
} from "./resource-management/types/index.js";

/**
 * Main Resource Manager - Orchestrates all resource management services
 * Dramatically simplified from original 2,079 lines to focus on coordination
 */
export class ResourceManager extends EventEmitter {
  private logger: ILogger;
  private config: ResourceManagerConfig;

  // Core resource storage
  private resources = new Map<string, Resource>();
  
  // Modular services
  private allocationService: ResourceAllocationService;
  private monitoringService: ResourceMonitoringService;
  private poolService: ResourcePoolService;
  private optimizationService: ResourceOptimizationService;

  // Service intervals
  private monitoringInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(logger: ILogger, config: Partial<ResourceManagerConfig> = {}) {
    super();
    this.logger = logger;
    
    // Apply default configuration
    this.config = {
      enableResourcePooling: true,
      enableResourceMonitoring: true,
      enableAutoScaling: true,
      enableQoS: true,
      monitoringInterval: 30000,
      cleanupInterval: 300000,
      defaultLimits: {
        cpu: 1,
        memory: 1024 * 1024 * 1024, // 1GB
        disk: 10 * 1024 * 1024 * 1024, // 10GB
        network: 100 * 1024 * 1024, // 100MB/s
        custom: {}
      },
      reservationTimeout: 300000,
      allocationStrategy: "best-fit",
      priorityWeights: {
        critical: 1.0,
        high: 0.8,
        normal: 0.6,
        low: 0.4,
        background: 0.2
      },
      enablePredictiveAllocation: true,
      enableResourceSharing: true,
      debugMode: false,
      ...config
    };

    this.initializeServices();
    this.setupEventHandlers();
  }

  /**
   * Initialize all modular services
   */
  private initializeServices(): void {
    // Initialize allocation service
    this.allocationService = new ResourceAllocationService(this.logger);
    
    // Initialize monitoring service
    this.monitoringService = new ResourceMonitoringService(this.logger, {
      enabled: this.config.enableResourceMonitoring,
      interval: this.config.monitoringInterval,
      enablePredictive: this.config.enablePredictiveAllocation,
      enableAnomalyDetection: true,
      retentionPeriod: 86400000, // 24 hours
      alertThresholds: {
        utilization: 0.9,
        errorRate: 0.05,
        latency: 1000
      }
    });

    // Initialize pool service
    this.poolService = new ResourcePoolService(this.logger, {
      enableAutoScaling: this.config.enableAutoScaling,
      defaultMinResources: 1,
      defaultMaxResources: 10,
      scaleUpThreshold: 0.8,
      scaleDownThreshold: 0.3,
      cooldownPeriod: 300000,
      loadBalancing: "least-connections"
    });

    // Initialize optimization service
    this.optimizationService = new ResourceOptimizationService(this.logger, {
      enabled: true,
      interval: 60000,
      enablePredictive: this.config.enablePredictiveAllocation,
      enableQoS: this.config.enableQoS,
      optimizationTargets: [
        { metric: "cost", direction: "minimize", weight: 0.3 },
        { metric: "performance", direction: "maximize", weight: 0.4 },
        { metric: "utilization", direction: "maximize", weight: 0.3 }
      ],
      predictionHorizon: 3600000, // 1 hour
      confidenceThreshold: 0.7
    });

    this.logger.info("Resource management services initialized");
  }

  /**
   * Setup event handlers for service coordination
   */
  private setupEventHandlers(): void {
    // Forward critical events from services
    this.allocationService.on("resource:reserved", (data) => {
      this.emit("resource:reserved", data);
    });

    this.allocationService.on("allocation:created", (data) => {
      this.emit("allocation:created", data);
    });

    this.monitoringService.on("alert:high-utilization", (data) => {
      this.emit("alert:high-utilization", data);
      this.handleHighUtilizationAlert(data);
    });

    this.monitoringService.on("critical-failure", (data) => {
      this.emit("critical-failure", data);
      this.handleCriticalFailure(data);
    });

    this.poolService.on("pool:scale-up-needed", (data) => {
      this.emit("pool:scale-up-needed", data);
    });

    this.poolService.on("pool:scale-down-needed", (data) => {
      this.emit("pool:scale-down-needed", data);
    });

    this.optimizationService.on("qos:violation", (data) => {
      this.emit("qos:violation", data);
    });

    this.optimizationService.on("pool:optimized", (data) => {
      this.emit("pool:optimized", data);
    });
  }

  /**
   * Initialize the resource manager
   */
  async initialize(): Promise<void> {
    this.logger.info("Initializing resource manager", {
      pooling: this.config.enableResourcePooling,
      monitoring: this.config.enableResourceMonitoring,
      autoScaling: this.config.enableAutoScaling
    });

    // Share resource data with all services
    this.syncResourcesWithServices();

    // Initialize optimization service
    await this.optimizationService.initialize();

    // Start monitoring if enabled
    if (this.config.enableResourceMonitoring) {
      await this.monitoringService.startMonitoring();
    }

    // Start cleanup cycle
    this.startCleanup();

    this.emit("resource-manager:initialized");
  }

  /**
   * Shutdown the resource manager
   */
  async shutdown(): Promise<void> {
    this.logger.info("Shutting down resource manager");

    // Stop intervals
    if (this.monitoringInterval) clearInterval(this.monitoringInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);

    // Shutdown services
    await this.monitoringService.stopMonitoring();
    await this.poolService.shutdown();
    await this.optimizationService.shutdown();

    // Release all active allocations
    await this.releaseAllAllocations();

    this.emit("resource-manager:shutdown");
  }

  // === PUBLIC API METHODS ===

  /**
   * Register a new resource
   */
  async registerResource(
    type: ResourceType,
    name: string,
    capacity: ResourceLimits,
    metadata: Partial<ResourceMetadata> = {}
  ): Promise<string> {
    const resourceId = generateId("resource");

    const resource: Resource = {
      id: resourceId,
      type,
      name,
      description: `${type} resource: ${name}`,
      capacity,
      allocated: this.createEmptyLimits(),
      available: { ...capacity },
      status: "available",
      metadata: {
        capabilities: [],
        features: {},
        performanceMetrics: {
          throughput: 100,
          latency: 10,
          utilization: 0,
          efficiency: 1.0,
          quality: 0.9
        },
        reliabilityMetrics: {
          uptime: 0.99,
          mtbf: 8760,
          mttr: 1,
          errorRate: 0.01
        },
        costMetrics: {
          hourlyRate: 1.0,
          utilizationCost: 0.1,
          totalCost: 0,
          costPerUnit: 1.0
        },
        ...metadata
      },
      reservations: [],
      allocations: [],
      sharable: this.config.enableResourceSharing,
      persistent: true,
      cost: 1.0,
      location: metadata.location || "local",
      tags: metadata.tags || []
    };

    this.resources.set(resourceId, resource);
    this.syncResourcesWithServices();

    this.logger.info("Resource registered", {
      resourceId,
      type,
      name,
      capacity
    });

    this.emit("resource:registered", { resource });

    return resourceId;
  }

  /**
   * Request resources for an agent
   */
  async requestResources(
    agentId: AgentId,
    requirements: ResourceRequirements,
    options: {
      taskId?: TaskId;
      priority?: ResourcePriority;
      timeout?: number;
      preemptible?: boolean;
    } = {}
  ): Promise<AllocationResult> {
    this.logger.debug("Processing resource request", {
      agentId,
      requirements,
      options
    });

    try {
      // Use allocation service for the actual allocation
      return await this.allocationService.requestResources(
        agentId,
        requirements,
        options.taskId,
        options.timeout || this.config.reservationTimeout
      );

    } catch (error) {
      this.logger.error("Resource request failed", {
        agentId,
        requirements,
        error
      });

      return {
        success: false,
        allocatedResources: [],
        totalCost: 0,
        estimatedDuration: 0,
        warnings: [],
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Release resources for an agent
   */
  async releaseResources(agentId: AgentId, taskId?: TaskId): Promise<void> {
    await this.allocationService.releaseResources(agentId, taskId);
  }

  /**
   * Create a resource pool
   */
  async createResourcePool(
    name: string,
    type: ResourceType,
    resourceIds: string[],
    strategy: PoolStrategy = "least-used"
  ): Promise<string> {
    return await this.poolService.createResourcePool(name, type, resourceIds, strategy);
  }

  /**
   * Get resource metrics
   */
  getResourceMetrics(resourceId?: string): ResourceManagerMetrics | Map<string, ResourceManagerMetrics> {
    if (resourceId) {
      return this.monitoringService.getResourceMetrics(resourceId) || {
        totalResources: 0,
        totalAllocations: 0,
        totalReservations: 0,
        averageUtilization: 0,
        allocationSuccessRate: 0,
        averageAllocationTime: 0,
        totalCost: 0,
        qosViolations: 0
      };
    }

    // Return metrics for all resources
    const allMetrics = new Map<string, ResourceManagerMetrics>();
    for (const resourceId of this.resources.keys()) {
      const metrics = this.monitoringService.getResourceMetrics(resourceId);
      if (metrics) {
        allMetrics.set(resourceId, metrics);
      }
    }
    
    return allMetrics;
  }

  /**
   * Optimize a resource pool
   */
  async optimizePool(poolId: string): Promise<OptimizationResult> {
    return await this.optimizationService.optimizePool(poolId);
  }

  /**
   * Get resource predictions
   */
  getResourcePredictions(resourceId?: string) {
    if (resourceId) {
      return this.monitoringService.getPredictions(resourceId);
    }
    
    return this.optimizationService.getPredictions();
  }

  // === PRIVATE HELPER METHODS ===

  /**
   * Sync resource data with all services
   */
  private syncResourcesWithServices(): void {
    this.allocationService.setResources(this.resources);
    this.monitoringService.setResources(this.resources);
    this.poolService.setResources(this.resources);
    this.optimizationService.setResources(this.resources);
  }

  /**
   * Start cleanup cycle
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(
      () => this.performCleanup(),
      this.config.cleanupInterval
    );
  }

  /**
   * Perform cleanup of expired resources and data
   */
  private async performCleanup(): Promise<void> {
    try {
      const now = new Date();
      
      // Get all reservations and cancel expired ones
      const reservations = this.allocationService.getReservations();
      for (const [reservationId, reservation] of reservations) {
        if (reservation.expiresAt && reservation.expiresAt < now && reservation.status === "pending") {
          await this.allocationService.cancelReservation(reservationId);
        }
      }

      this.logger.debug("Cleanup cycle completed");

    } catch (error) {
      this.logger.error("Cleanup cycle failed", { error });
    }
  }

  /**
   * Release all active allocations
   */
  private async releaseAllAllocations(): Promise<void> {
    const allocations = this.allocationService.getAllocations();
    for (const [allocationId, allocation] of allocations) {
      if (!allocation.endTime) {
        try {
          await this.allocationService.releaseResources(allocation.agentId, allocation.taskId);
        } catch (error) {
          this.logger.warn("Failed to release allocation during shutdown", {
            allocationId,
            error
          });
        }
      }
    }
  }

  /**
   * Handle high utilization alerts
   */
  private async handleHighUtilizationAlert(data: any): Promise<void> {
    this.logger.warn("High utilization detected", data);
    
    // Trigger pool optimization if applicable
    const pools = this.poolService.getPools();
    for (const [poolId, pool] of pools) {
      if (pool.resources.includes(data.resourceId)) {
        await this.optimizationService.optimizePool(poolId);
      }
    }
  }

  /**
   * Handle critical resource failures
   */
  private async handleCriticalFailure(data: any): Promise<void> {
    this.logger.error("Critical resource failure", data);
    
    // Mark resource as failed and try to migrate allocations
    const resource = this.resources.get(data.resourceId);
    if (resource) {
      resource.status = "failed";
      
      // Emit failure event for higher-level systems to handle
      this.emit("resource:failed", { resourceId: data.resourceId, resource });
    }
  }

  /**
   * Create empty resource limits
   */
  private createEmptyLimits(): ResourceLimits {
    return {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: 0,
      custom: {}
    };
  }

  // === GETTER METHODS FOR EXTERNAL ACCESS ===

  getResources(): Map<string, Resource> {
    return this.resources;
  }

  getResource(resourceId: string): Resource | undefined {
    return this.resources.get(resourceId);
  }

  getAllocations() {
    return this.allocationService.getAllocations();
  }

  getReservations() {
    return this.allocationService.getReservations();
  }

  getPools() {
    return this.poolService.getPools();
  }

  getConfig(): ResourceManagerConfig {
    return this.config;
  }
}