/**
 * Core types and interfaces for the Orchestration Engine
 * Defines the fundamental data structures for task planning, execution, and coordination
 */

import { z } from 'zod';

// ================================
// Core Enums
// ================================

export enum TaskStatus {
  PENDING = 'pending',
  PLANNING = 'planning',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}

export enum OrchestrationStrategy {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  ADAPTIVE = 'adaptive',
  HIERARCHICAL = 'hierarchical',
  REACTIVE = 'reactive',
}

export enum AgentRole {
  PLANNER = 'planner',
  EXECUTOR = 'executor',
  COORDINATOR = 'coordinator',
  VALIDATOR = 'validator',
  MONITOR = 'monitor',
  SPECIALIST = 'specialist',
  WORKER = 'worker',
}

// ================================
// Zod Schemas for Runtime Validation
// ================================

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string(),
  status: z.nativeEnum(TaskStatus),
  priority: z.number().min(1).max(10),
  dependencies: z.array(z.string().uuid()).default([]),
  requiredCapabilities: z.array(z.string()).default([]),
  context: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  completedAt: z.date().optional(),
  estimatedDuration: z.number().optional(),
  actualDuration: z.number().optional(),
});

export const ExecutionPlanSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  strategy: z.nativeEnum(OrchestrationStrategy),
  phases: z.array(z.string()),
  dependencies: z.record(z.array(z.string())),
  estimatedDuration: z.number(),
  resourceRequirements: z.object({
    minAgents: z.number().min(1),
    maxAgents: z.number().min(1),
    requiredCapabilities: z.array(z.string()),
    memoryRequirement: z.number().optional(),
    computeRequirement: z.number().optional(),
  }),
  checkpoints: z.array(
    z.object({
      phase: z.string(),
      criteria: z.array(z.string()),
      validation: z.string(),
    }),
  ),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});

// ================================
// Type Definitions
// ================================

export type Task = z.infer<typeof TaskSchema>;
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

// ================================
// Agent Interfaces
// ================================

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  capabilities: string[];
  status: 'available' | 'busy' | 'offline';
  metadata: Record<string, any>;
  lastSeen: Date;
}

export interface AgentAssignment {
  agentId: string;
  taskId: string;
  phase: string;
  role: AgentRole;
  startTime: Date;
  endTime?: Date;
  status: TaskStatus;
  result?: unknown;
  error?: string;
}

// ================================
// Planning Interfaces
// ================================

export interface PlanningContext {
  task: Task;
  availableAgents: Agent[];
  resources: {
    memory: number;
    compute: number;
    storage: number;
  };
  constraints: {
    maxDuration: number;
    maxCost: number;
    availabilityWindow: [Date, Date];
  };
  preferences: {
    strategy: OrchestrationStrategy;
    quality: 'fast' | 'balanced' | 'thorough';
    failureHandling: 'strict' | 'resilient' | 'permissive';
  };
}

export interface PlanningResult {
  plan: ExecutionPlan;
  alternatives: ExecutionPlan[];
  confidence: number;
  reasoning: string;
  risks: Array<{
    description: string;
    probability: number;
    impact: number;
    mitigation: string;
  }>;
}

// ================================
// Orchestration Interfaces
// ================================

export interface OrchestrationContext {
  tasks: Map<string, Task>;
  plans: Map<string, ExecutionPlan>;
  agents: Map<string, Agent>;
  assignments: Map<string, AgentAssignment[]>;
  activeExecutions: Map<string, unknown>;
  completedTasks: Set<string>;
  failedTasks: Set<string>;
}

// ================================
// LangChain Integration Types
// ================================

export interface LangChainTool {
  name: string;
  description: string;
  schema: z.ZodSchema;
  execute: (input: unknown) => Promise<unknown>;
}

export interface LangChainAgent {
  id: string;
  chain: unknown; // LangChain Runnable
  tools: LangChainTool[];
  memory: unknown; // LangChain Memory
  callbacks: unknown[]; // LangChain Callbacks
}

// ================================
// Multi-Agent Coordination Types
// ================================

export interface CoordinationProtocol {
  type: 'consensus' | 'voting' | 'auction' | 'hierarchy';
  participants: string[];
  rules: Record<string, unknown>;
  timeout: number;
}

export interface CoordinationMessage {
  id: string;
  from: string;
  to: string | string[];
  type: 'proposal' | 'vote' | 'decision' | 'status' | 'resource_request';
  payload: any;
  timestamp: Date;
  priority: number;
}

export interface MultiAgentState {
  coordinationProtocol: CoordinationProtocol;
  messages: CoordinationMessage[];
  decisions: Array<{
    decision: string;
    reasoning: string;
    confidence: number;
    consensus: number;
    timestamp: Date;
  }>;
  resourceAllocation: Record<string, unknown>;
}

// ================================
// Adaptive Decision Making Types
// ================================

export interface DecisionContext {
  id: string;
  type: string;
  taskId?: string;
  situation: string;
  options: Array<{
    id: string;
    description: string;
    cost: number;
    benefit: number;
    risk: number;
    confidence: number;
  }>;
  constraints: Record<string, unknown>;
  deadline?: Date;
  history: Array<{
    decision: string;
    outcome: string;
    learned: string;
  }>;
}

export interface AdaptiveDecision {
  id: string;
  contextId: string;
  selectedOption: string;
  confidence: number;
  reasoning: string;
  strategy: DecisionStrategy;
  alternativeOptions: Array<{
    option: string;
    score: number;
    reasoning: string;
  }>;
  learningFactors: Record<string, unknown>;
  adaptationData: {
    patternsUsed: number;
    strategyConfidence: number;
    historicalAccuracy: number;
    uncertaintyFactors: string[];
  };
  timestamp: Date;
  executionTime: number;
  chosen?: string;
  expectedOutcome?: string;
  fallbacks?: string[];
  learningPoints?: string[];
}

// ================================
// Docker Database Configuration Types
// ================================

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database: string;
  maxConnections: number;
  acquireTimeout: number;
}

export interface QdrantConfig {
  host: string;
  port: number;
  apiKey?: string;
  collectionName: string;
  vectorSize: number;
  distance: 'cosine' | 'euclid' | 'dot';
  timeout: number;
}

export interface DatabaseConfig {
  neo4j: Neo4jConfig;
  qdrant: QdrantConfig;
  redis?: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
}

// ================================
// Event Types
// ================================

export interface OrchestrationEvent {
  type:
    | 'task_created'
    | 'task_started'
    | 'task_completed'
    | 'task_failed'
    | 'agent_assigned'
    | 'agent_freed'
    | 'plan_created'
    | 'plan_updated'
    | 'coordination_started'
    | 'decision_made'
    | 'resource_allocated';
  taskId?: string;
  agentId?: string;
  planId?: string;
  data: any;
  timestamp: Date;
  source: string;
}

export interface PlanCheckpoint {
  phase: string;
  criteria: string[];
  validation: string;
}

export interface PlanRisk {
  description: string;
  probability: number;
  impact: number;
  mitigation: string;
}

export interface ResourceRequirements {
  minAgents: number;
  maxAgents: number;
  requiredCapabilities: string[];
  memoryRequirement?: number;
  computeRequirement?: number;
}

export interface LangChainConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  retryAttempts: number;
  apiKey: string;
  enableMemory: boolean;
  toolTimeout: number;
}

export interface LangChainResult {
  success: boolean;
  result?: any;
  error?: string;
  reasoning?: string;
  toolsUsed?: string[];
  executionTime: number;
  tokensUsed: number;
}

export enum AgentCapability {
  TASK_PLANNING = 'task_planning',
  RESOURCE_OPTIMIZATION = 'resource_optimization',
  RISK_ASSESSMENT = 'risk_assessment',
  CODE_GENERATION = 'code_generation',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  MONITORING = 'monitoring',
  COMMUNICATION = 'communication',
  LEARNING = 'learning',
  DECISION_MAKING = 'decision_making',
}

export enum CoordinationStrategy {
  HIERARCHICAL = 'hierarchical',
  PEER_TO_PEER = 'peer_to_peer',
  PIPELINE = 'pipeline',
  BROADCAST = 'broadcast',
}

export interface MultiAgentConfig {
  maxConcurrentTasks: number;
  communicationTimeout: number;
  synchronizationTimeout: number;
  conflictResolutionStrategy: string;
  loadBalancingStrategy: string;
  failureRecoveryStrategy: string;
  enablePerformanceMonitoring: boolean;
  heartbeatInterval: number;
}

export interface MessageProtocol {
  id: string;
  fromAgent: string;
  toAgent: string;
  type: 'peer-to-peer' | 'supervisor-subordinate' | 'broadcast';
  status: 'active' | 'inactive' | 'error';
  messageQueue: any[];
  lastActivity: Date;
}

export interface SynchronizationPoint {
  id: string;
  type: 'phase-dependency' | 'checkpoint' | 'barrier';
  dependentPhase: string;
  prerequisites: string[];
  status: 'pending' | 'completed' | 'failed';
  waitingAgents: string[];
  completedPrerequisites: string[];
  timeout: number;
  createdAt: Date;
}

export interface AgentCoordination {
  id: string;
  taskId: string;
  strategy: CoordinationStrategy;
  participants: Array<{
    agentId: string;
    role: AgentRole;
    capabilities: string[];
    status: string;
    currentPhase: string | null;
    performance: {
      tasksCompleted: number;
      averageTime: number;
      successRate: number;
      lastActivity: Date;
    };
  }>;
  phases: Array<{
    id: string;
    name: string;
    status: string;
    assignedAgents: string[];
    dependencies: string[];
    startTime: Date | null;
    endTime: Date | null;
    results: any;
  }>;
  communicationChannels: MessageProtocol[];
  synchronizationPoints: SynchronizationPoint[];
  status: string;
  startTime: Date;
  endTime: Date | null;
}

export interface CoordinationState {
  coordination: AgentCoordination;
  activeAgents: Set<string>;
  completedPhases: Set<string>;
  failedPhases: Set<string>;
  pendingCommunications: any[];
  resourceLocks: Map<string, any>;
  conflictLog: any[];
}

export interface PhaseExecutionData {
  id: string;
  name: string;
  status: string;
  assignedAgents: string[];
  dependencies: string[];
  startTime: Date | null;
  endTime: Date | null;
  results: any;
}

export interface CoordinationResult {
  coordinationId: string;
  success: boolean;
  results: Record<string, unknown>;
  agentPerformance: Record<string, any>;
  communicationStats: {
    messagesSent: number;
    messagesReceived: number;
    errors: number;
  };
  synchronizationEvents: any[];
  resourceUtilization: Record<string, any>;
  executionTime: number;
  completedPhases: string[];
  errors: string[];
}

export enum DecisionStrategy {
  GREEDY = 'greedy',
  CONSERVATIVE = 'conservative',
  BALANCED = 'balanced',
  AGGRESSIVE = 'aggressive',
  ADAPTIVE = 'adaptive',
}

export interface AdaptiveConfig {
  learningRate: number;
  memoryWindow: number;
  confidenceThreshold: number;
  adaptationInterval: number;
  enableRealTimeLearning: boolean;
  performanceWeights: {
    accuracy: number;
    speed: number;
    resourceEfficiency: number;
    quality: number;
  };
  decisionStrategies: string[];
}

export interface DecisionResult {
  decisionId: string;
  contextType: string;
  success: boolean;
  timestamp: Date;
  performance?: number;
  actualPerformance?: number;
  executionTime?: number;
  resourceUsage?: Record<string, unknown>;
  conditions?: Record<string, unknown>;
}

export interface LearningPattern {
  id: string;
  context: {
    type: string;
    features: Record<string, unknown>;
    conditions: Record<string, unknown>;
  };
  decision: {
    option: string;
    strategy: string;
    confidence: number;
  };
  outcome: {
    success: boolean;
    performance: number;
    duration: number;
    resourceUsage: Record<string, unknown>;
  };
  confidence: number;
  frequency: number;
  lastUpdated: Date;
  adjustments?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  accuracy: number;
  speed: number;
  efficiency: number;
  quality: number;
}

export interface OrchestrationConfig {
  maxConcurrentOrchestrations: number;
  defaultStrategy: OrchestrationStrategy;
  enableMultiAgentCoordination: boolean;
  enableAdaptiveDecisions: boolean;
  planningTimeout: number;
  executionTimeout: number;
  qualityThreshold: number;
  performanceMonitoring: boolean;
}

export interface OrchestrationState {
  id: string;
  taskId: string;
  status:
    | 'initializing'
    | 'planning'
    | 'deciding'
    | 'executing'
    | 'validating'
    | 'completed'
    | 'failed'
    | 'cancelled';
  strategy: OrchestrationStrategy;
  planningContext: PlanningContext;
  currentPhase: string;
  progress: number;
  startTime: Date;
  endTime: Date | null;
  assignedAgents: Agent[];
  errors: string[];
  metrics: {
    planningDuration: number;
    executionDuration: number;
    coordinationEfficiency: number;
    qualityScore: number;
  };
}

export interface OrchestrationResult {
  orchestrationId: string;
  taskId: string;
  success: boolean;
  plan: ExecutionPlan | null;
  executionResults: Record<string, unknown>;
  coordinationResults: CoordinationResult | null;
  decisions: AdaptiveDecision[];
  performance: {
    totalDuration: number;
    planningTime: number;
    executionTime: number;
    efficiency: number;
    qualityScore: number;
  };
  errors: string[];
  timestamp: Date;
}

export interface StrategicDecision {
  id: string;
  type: string;
  description: string;
  context: Record<string, unknown>;
  option: {
    id: string;
    description: string;
    cost: number;
    benefit: number;
    risk: number;
    confidence: number;
  };
  reasoning: string;
  confidence: number;
  timestamp: Date;
}

export interface OrchestrationStatistics {
  orchestration: {
    activeOrchestrations: number;
    totalStates: number;
    maxConcurrent: number;
  };
  planning: PerformanceMetrics & {
    totalPlans: number;
    averagePlanningTime: number;
    successRate: number;
  };
  langchain: PerformanceMetrics & {
    totalExecutions: number;
    averageResponseTime: number;
    tokenUsage: number;
  };
  coordination: PerformanceMetrics & {
    totalCoordinations: number;
    averageAgentsPerTask: number;
    communicationEfficiency: number;
  };
  decisions: PerformanceMetrics & {
    totalDecisions: number;
    averageConfidence: number;
    learningRate: number;
  };
}

export const Schemas = {
  Task: TaskSchema,
  ExecutionPlan: ExecutionPlanSchema,
};
