/**
 * @file Resource Allocation Service
 * @description Handles resource allocation, reservation, and release operations
 * @split_from resource-manager.ts
 */

import { EventEmitter } from "node:events";
import type { ILogger } from "../../core/logger.js";
import { generateId } from "../../utils/helpers.js";
import type {
  Resource,
  ResourceAllocation,
  ResourceReservation,
  ResourceRequirements,
  ResourceLimits,
  AllocationResult,
  ResourcePriority,
  AgentId,
  TaskId,
  ReservationStatus,
  ResourceUsage
} from "../types/index.js";

export class ResourceAllocationService extends EventEmitter {
  private logger: ILogger;
  private resources = new Map<string, Resource>();
  private reservations = new Map<string, ResourceReservation>();
  private allocations = new Map<string, ResourceAllocation>();

  constructor(logger: ILogger) {
    super();
    this.logger = logger;
  }

  /**
   * Request resources with specific requirements
   */
  async requestResources(
    agentId: AgentId,
    requirements: ResourceRequirements,
    taskId?: TaskId,
    timeout = 300000
  ): Promise<AllocationResult> {
    const reservationId = generateId("reservation");
    
    this.logger.debug("Processing resource request", {
      agentId,
      requirements,
      taskId,
      reservationId
    });

    try {
      // Find suitable resources
      const suitableResources = await this.findSuitableResources(requirements);
      
      if (suitableResources.length === 0) {
        return {
          success: false,
          allocatedResources: [],
          totalCost: 0,
          estimatedDuration: 0,
          warnings: ["No suitable resources found"],
          errors: ["Resource allocation failed - no matching resources"]
        };
      }

      // Create reservation
      const reservation: ResourceReservation = {
        id: reservationId,
        resourceId: suitableResources[0].id,
        agentId,
        taskId,
        requirements,
        status: "pending",
        priority: requirements.priority || "normal",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + timeout),
        metadata: {}
      };

      this.reservations.set(reservationId, reservation);

      // Calculate allocation
      const allocation = this.calculateAllocation(suitableResources[0], requirements);
      
      // Update resource availability
      this.updateResourceAllocation(suitableResources[0].id, allocation, true);

      this.emit("resource:reserved", { reservationId, agentId, allocation });

      return {
        success: true,
        reservationId,
        allocatedResources: [suitableResources[0]],
        totalCost: this.calculateTotalCost(allocation),
        estimatedDuration: requirements.duration || 3600000,
        warnings: [],
        errors: []
      };

    } catch (error) {
      this.logger.error("Resource allocation failed", { error, agentId, requirements });
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
   * Activate a reservation and create allocation
   */
  async activateReservation(reservationId: string): Promise<string> {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      throw new Error(`Reservation not found: ${reservationId}`);
    }

    if (reservation.status !== "pending") {
      throw new Error(`Cannot activate reservation in status: ${reservation.status}`);
    }

    const resource = this.resources.get(reservation.resourceId);
    if (!resource) {
      throw new Error(`Resource not found: ${reservation.resourceId}`);
    }

    // Create allocation
    const allocationId = generateId("allocation");
    const allocation: ResourceAllocation = {
      id: allocationId,
      reservationId,
      resourceId: reservation.resourceId,
      agentId: reservation.agentId,
      taskId: reservation.taskId,
      allocated: this.calculateAllocation(resource, reservation.requirements),
      actualUsage: this.createEmptyUsage(),
      efficiency: 0,
      startTime: new Date(),
      cost: 0
    };

    this.allocations.set(allocationId, allocation);

    // Update reservation status
    reservation.status = "active";
    reservation.activatedAt = new Date();

    // Update resource
    resource.allocations.push(allocation);

    this.emit("allocation:created", { allocationId, allocation });
    this.logger.info("Reservation activated", { reservationId, allocationId });

    return allocationId;
  }

  /**
   * Release resources for an agent
   */
  async releaseResources(agentId: AgentId, taskId?: TaskId): Promise<void> {
    this.logger.debug("Releasing resources", { agentId, taskId });

    const allocationsToRelease = Array.from(this.allocations.values())
      .filter(alloc => 
        alloc.agentId === agentId && 
        (!taskId || alloc.taskId === taskId) &&
        !alloc.endTime
      );

    for (const allocation of allocationsToRelease) {
      await this.releaseAllocation(allocation.id);
    }

    this.emit("resources:released", { agentId, taskId });
  }

  /**
   * Cancel a reservation
   */
  async cancelReservation(reservationId: string): Promise<void> {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      throw new Error(`Reservation not found: ${reservationId}`);
    }

    // Release resource allocation if any
    if (reservation.status === "active") {
      const allocation = Array.from(this.allocations.values())
        .find(alloc => alloc.reservationId === reservationId);
      
      if (allocation) {
        await this.releaseAllocation(allocation.id);
      }
    }

    // Update reservation status
    reservation.status = "cancelled";
    reservation.releasedAt = new Date();

    this.emit("reservation:cancelled", { reservationId });
    this.logger.info("Reservation cancelled", { reservationId });
  }

  /**
   * Release a specific allocation
   */
  private async releaseAllocation(allocationId: string): Promise<void> {
    const allocation = this.allocations.get(allocationId);
    if (!allocation || allocation.endTime) {
      return; // Already released or not found
    }

    const resource = this.resources.get(allocation.resourceId);
    if (resource) {
      // Update resource availability
      this.updateResourceAllocation(resource.id, allocation.allocated, false);
      
      // Remove allocation from resource
      resource.allocations = resource.allocations.filter(a => a.id !== allocationId);
    }

    // Update allocation
    allocation.endTime = new Date();
    allocation.cost = this.calculateFinalCost(allocation);

    // Update reservation
    const reservation = this.reservations.get(allocation.reservationId);
    if (reservation) {
      reservation.status = "released";
      reservation.releasedAt = new Date();
    }

    this.emit("allocation:released", { allocationId, allocation });
    this.logger.debug("Allocation released", { allocationId });
  }

  /**
   * Find suitable resources for requirements
   */
  private async findSuitableResources(requirements: ResourceRequirements): Promise<Resource[]> {
    const candidates: Resource[] = [];

    for (const resource of this.resources.values()) {
      if (resource.status !== "available") continue;
      
      if (this.canSatisfyRequirements(resource, requirements)) {
        candidates.push(resource);
      }
    }

    // Sort by score (best fit first)
    return candidates.sort((a, b) => 
      this.calculateResourceScore(b, requirements) - 
      this.calculateResourceScore(a, requirements)
    );
  }

  /**
   * Check if resource can satisfy requirements
   */
  private canSatisfyRequirements(resource: Resource, requirements: ResourceRequirements): boolean {
    // Check basic capacity
    if (requirements.cpu && resource.available.cpu < requirements.cpu) return false;
    if (requirements.memory && resource.available.memory < requirements.memory) return false;
    if (requirements.disk && resource.available.disk < requirements.disk) return false;
    if (requirements.network && resource.available.network < requirements.network) return false;
    if (requirements.gpu && resource.available.gpu && resource.available.gpu < requirements.gpu) return false;

    // Check custom resources
    if (requirements.custom) {
      for (const [key, value] of Object.entries(requirements.custom)) {
        if (!resource.available.custom[key] || resource.available.custom[key] < value) {
          return false;
        }
      }
    }

    // Check constraints
    if (requirements.constraints) {
      if (!this.checkConstraints(resource, requirements.constraints)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate resource allocation score
   */
  private calculateResourceScore(resource: Resource, requirements: ResourceRequirements): number {
    let score = 0;

    // Efficiency score (prefer tight fit)
    const cpuRatio = requirements.cpu ? requirements.cpu / resource.capacity.cpu : 0;
    const memoryRatio = requirements.memory ? requirements.memory / resource.capacity.memory : 0;
    const diskRatio = requirements.disk ? requirements.disk / resource.capacity.disk : 0;

    score += (cpuRatio + memoryRatio + diskRatio) / 3;

    // Performance score
    score += resource.metadata.performanceMetrics.efficiency * 0.3;

    // Cost efficiency
    score += (1 / resource.cost) * 0.2;

    // Availability score
    const utilizationRatio = this.calculateUtilization(resource);
    score += (1 - utilizationRatio) * 0.1;

    return score;
  }

  /**
   * Calculate resource allocation
   */
  private calculateAllocation(resource: Resource, requirements: ResourceRequirements): ResourceLimits {
    return {
      cpu: requirements.cpu || 0,
      memory: requirements.memory || 0,
      disk: requirements.disk || 0,
      network: requirements.network || 0,
      gpu: requirements.gpu || 0,
      custom: requirements.custom || {}
    };
  }

  /**
   * Update resource allocation
   */
  private updateResourceAllocation(resourceId: string, allocation: ResourceLimits, allocate: boolean): void {
    const resource = this.resources.get(resourceId);
    if (!resource) return;

    const multiplier = allocate ? -1 : 1;

    resource.available.cpu += allocation.cpu * multiplier;
    resource.available.memory += allocation.memory * multiplier;
    resource.available.disk += allocation.disk * multiplier;
    resource.available.network += allocation.network * multiplier;
    if (allocation.gpu) resource.available.gpu = (resource.available.gpu || 0) + allocation.gpu * multiplier;

    for (const [key, value] of Object.entries(allocation.custom)) {
      resource.available.custom[key] = (resource.available.custom[key] || 0) + value * multiplier;
    }

    resource.allocated.cpu += allocation.cpu * (allocate ? 1 : -1);
    resource.allocated.memory += allocation.memory * (allocate ? 1 : -1);
    resource.allocated.disk += allocation.disk * (allocate ? 1 : -1);
    resource.allocated.network += allocation.network * (allocate ? 1 : -1);
    if (allocation.gpu) resource.allocated.gpu = (resource.allocated.gpu || 0) + allocation.gpu * (allocate ? 1 : -1);
  }

  /**
   * Calculate resource utilization
   */
  private calculateUtilization(resource: Resource): number {
    const cpuUtil = resource.allocated.cpu / resource.capacity.cpu;
    const memUtil = resource.allocated.memory / resource.capacity.memory;
    const diskUtil = resource.allocated.disk / resource.capacity.disk;
    const netUtil = resource.allocated.network / resource.capacity.network;

    return Math.max(cpuUtil, memUtil, diskUtil, netUtil);
  }

  /**
   * Check resource constraints
   */
  private checkConstraints(resource: Resource, constraints: any): boolean {
    // Simplified constraint checking
    if (constraints.location && !constraints.location.includes(resource.location)) {
      return false;
    }

    if (constraints.tags) {
      const hasAllTags = constraints.tags.every((tag: string) => resource.tags.includes(tag));
      if (!hasAllTags) return false;
    }

    return true;
  }

  /**
   * Calculate total cost
   */
  private calculateTotalCost(allocation: ResourceLimits): number {
    // Simplified cost calculation
    return allocation.cpu * 0.1 + allocation.memory * 0.00001 + allocation.disk * 0.000001;
  }

  /**
   * Calculate final cost for completed allocation
   */
  private calculateFinalCost(allocation: ResourceAllocation): number {
    const duration = allocation.endTime!.getTime() - allocation.startTime.getTime();
    const hourlyRate = this.calculateTotalCost(allocation.allocated);
    return (hourlyRate * duration) / 3600000; // Convert to hours
  }

  /**
   * Create empty resource usage
   */
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

  // Getters for resource access
  setResources(resources: Map<string, Resource>): void {
    this.resources = resources;
  }

  getReservations(): Map<string, ResourceReservation> {
    return this.reservations;
  }

  getAllocations(): Map<string, ResourceAllocation> {
    return this.allocations;
  }
}