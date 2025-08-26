/**
 * @file Resource Management Types
 * @description Comprehensive type definitions for resource management system
 * @split_from resource-manager.ts
 */

import type { AgentId, TaskId } from "../../swarm/types.js";

export interface ResourceManagerConfig {
  enableResourcePooling: boolean;
  enableResourceMonitoring: boolean;
  enableAutoScaling: boolean;
  enableQoS: boolean;
  monitoringInterval: number;
  cleanupInterval: number;
  defaultLimits: ResourceLimits;
  reservationTimeout: number;
  allocationStrategy: "first-fit" | "best-fit" | "worst-fit" | "balanced";
  priorityWeights: PriorityWeights;
  enablePredictiveAllocation: boolean;
  enableResourceSharing: boolean;
  debugMode: boolean;
}

export interface ResourceLimits {
  cpu: number; // CPU cores
  memory: number; // Bytes
  disk: number; // Bytes
  network: number; // Bytes per second
  gpu?: number; // GPU units
  custom: Record<string, number>;
}

export interface PriorityWeights {
  critical: number;
  high: number;
  normal: number;
  low: number;
  background: number;
}

export interface Resource {
  id: string;
  type: ResourceType;
  name: string;
  description: string;
  capacity: ResourceLimits;
  allocated: ResourceLimits;
  available: ResourceLimits;
  status: ResourceStatus;
  metadata: ResourceMetadata;
  reservations: ResourceReservation[];
  allocations: ResourceAllocation[];
  sharable: boolean;
  persistent: boolean;
  cost: number;
  location?: string;
  tags: string[];
}

export interface ResourcePool {
  id: string;
  name: string;
  type: ResourceType;
  resources: string[]; // Resource IDs
  strategy: PoolStrategy;
  loadBalancing: LoadBalancingStrategy;
  scaling: ScalingConfig;
  qos: QoSConfig;
  statistics: PoolStatistics;
  filters: ResourceFilter[];
}

export interface ResourceReservation {
  id: string;
  resourceId: string;
  agentId: AgentId;
  taskId?: TaskId;
  requirements: ResourceRequirements;
  status: ReservationStatus;
  priority: ResourcePriority;
  createdAt: Date;
  expiresAt?: Date;
  activatedAt?: Date;
  releasedAt?: Date;
  metadata: Record<string, any>;
}

export interface ResourceAllocation {
  id: string;
  reservationId: string;
  resourceId: string;
  agentId: AgentId;
  taskId?: TaskId;
  allocated: ResourceLimits;
  actualUsage: ResourceUsage;
  efficiency: number;
  startTime: Date;
  endTime?: Date;
  cost: number;
}

export interface ResourceRequirements {
  cpu?: number;
  memory?: number;
  disk?: number;
  network?: number;
  gpu?: number;
  custom?: Record<string, number>;
  duration?: number;
  priority: ResourcePriority;
  constraints?: ResourceConstraints;
  preferences?: ResourcePreferences;
}

export interface ResourceSpec {
  type: ResourceType;
  requirements: ResourceRequirements;
  constraints: ResourceConstraints;
  preferences: ResourcePreferences;
  qos?: QoSRequirements;
}

export interface ResourceConstraints {
  location?: string[];
  tags?: string[];
  excludeResources?: string[];
  requiredFeatures?: string[];
  maxCost?: number;
  deadline?: Date;
}

export interface ResourcePreferences {
  location?: string;
  performance?: "high" | "balanced" | "cost-optimized";
  reliability?: "high" | "normal" | "best-effort";
  costWeight?: number;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  gpu?: number;
  custom: Record<string, number>;
  timestamp: Date;
  duration?: number;
}

export interface ResourceMetadata {
  vendor?: string;
  model?: string;
  version?: string;
  capabilities: string[];
  features: Record<string, any>;
  performanceMetrics: PerformanceMetrics;
  reliabilityMetrics: ReliabilityMetrics;
  costMetrics: CostMetrics;
}

export interface PerformanceMetrics {
  throughput: number;
  latency: number;
  utilization: number;
  efficiency: number;
  quality: number;
}

export interface ReliabilityMetrics {
  uptime: number;
  mtbf: number; // Mean Time Between Failures
  mttr: number; // Mean Time To Repair
  errorRate: number;
}

export interface CostMetrics {
  hourlyRate: number;
  utilizationCost: number;
  totalCost: number;
  costPerUnit: number;
}

export interface FailureRecord {
  timestamp: Date;
  type: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  resolved: boolean;
  resolutionTime?: number;
}

export interface QoSConfig {
  enabled: boolean;
  guarantees: QoSGuarantee[];
  objectives: QoSObjective[];
}

export interface QoSGuarantee {
  metric: string;
  threshold: number;
  operator: "min" | "max" | "equal";
  penalty?: number;
}

export interface QoSObjective {
  metric: string;
  target: number;
  weight: number;
  tolerance: number;
}

export interface QoSRequirements {
  throughput?: number;
  latency?: number;
  availability?: number;
  reliability?: number;
  priority: ResourcePriority;
}

// Enums and Types
export type ResourceType = 
  | "compute" 
  | "storage" 
  | "network" 
  | "gpu" 
  | "memory" 
  | "custom";

export type ResourceStatus = 
  | "available" 
  | "allocated" 
  | "reserved" 
  | "maintenance" 
  | "failed" 
  | "unknown";

export type ReservationStatus = 
  | "pending" 
  | "confirmed" 
  | "active" 
  | "released" 
  | "expired" 
  | "cancelled";

export type ResourcePriority = 
  | "critical" 
  | "high" 
  | "normal" 
  | "low" 
  | "background";

export type PoolStrategy = 
  | "round-robin" 
  | "least-used" 
  | "most-used" 
  | "random" 
  | "weighted";

export type LoadBalancingStrategy = 
  | "least-connections" 
  | "least-used" 
  | "round-robin" 
  | "weighted-round-robin" 
  | "ip-hash";

export interface ScalingConfig {
  enabled: boolean;
  minResources: number;
  maxResources: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number;
  strategy: ScalingStrategy;
}

export type ScalingStrategy = 
  | "reactive" 
  | "predictive" 
  | "scheduled" 
  | "manual";

export interface PoolStatistics {
  totalResources: number;
  availableResources: number;
  allocatedResources: number;
  averageUtilization: number;
  peakUtilization: number;
  totalRequests: number;
  successfulAllocations: number;
  failedAllocations: number;
  averageWaitTime: number;
}

export interface ResourceFilter {
  field: string;
  operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "in" | "nin";
  value: any;
}

export interface ResourcePrediction {
  resourceId: string;
  predictedUsage: ResourceUsage;
  confidence: number;
  timeHorizon: number;
  factors: string[];
}

export interface AllocationResult {
  success: boolean;
  reservationId?: string;
  allocatedResources: Resource[];
  totalCost: number;
  estimatedDuration: number;
  qosLevel?: string;
  warnings: string[];
  errors: string[];
}

export interface ResourceManagerMetrics {
  totalResources: number;
  totalAllocations: number;
  totalReservations: number;
  averageUtilization: number;
  allocationSuccessRate: number;
  averageAllocationTime: number;
  totalCost: number;
  qosViolations: number;
}

export interface OptimizationTarget {
  metric: string;
  direction: "minimize" | "maximize";
  weight: number;
  constraints?: any[];
}

export interface OptimizationResult {
  success: boolean;
  improvements: Record<string, number>;
  recommendations: string[];
  estimatedSavings: number;
  confidence: number;
}