/**
 * @file_path packages/orchestration-analytics/src/types.ts
 * @description Type definitions for orchestration analytics platform
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-04
 * @version 1.0.0
 * @status active
 * @ai_generated_by human
 * @ai_provenance_hash N/A
 */

import type { SpanContext } from "@opentelemetry/api";

/**
 * Core agent metrics interface
 */
export interface AgentMetrics {
	agentId: string;
	agentType: "langgraph" | "crewai" | "autogen" | "custom";
	framework: string;
	timestamp: Date;
	executionTime: number;
	successRate: number;
	resourceUsage: {
		memory: number;
		cpu: number;
		gpu?: number;
	};
	taskCount: number;
	errorCount: number;
	responseTime: number;
	throughput: number;
	availability: number;
}

/**
 * Orchestration-level metrics
 */
export interface OrchestrationMetrics {
	orchestrationId: string;
	framework: string;
	timestamp: Date;
	totalAgents: number;
	activeAgents: number;
	completedTasks: number;
	failedTasks: number;
	averageExecutionTime: number;
	totalResourceUtilization: ResourceUtilization;
	workflowEfficiency: number;
	coordinationOverhead: number;
}

/**
 * Agent interaction patterns
 */
export interface InteractionPattern {
	id: string;
	patternType: "request-response" | "broadcast" | "cascade" | "circular";
	participants: string[];
	frequency: number;
	averageLatency: number;
	successRate: number;
	communicationVolume: number;
	dependencies: string[];
	criticality: "low" | "medium" | "high";
	detectedAt: Date;
}

/**
 * Optimization recommendations
 */
export interface OptimizationRecommendation {
	id: string;
	type:
		| "resource-allocation"
		| "workflow-restructure"
		| "agent-scaling"
		| "bottleneck-resolution";
	priority: "low" | "medium" | "high" | "critical";
	title: string;
	description: string;
	expectedImpact: {
		performanceGain: number;
		resourceSavings: number;
		reliabilityImprovement: number;
	};
	implementation: {
		difficulty: "easy" | "medium" | "hard";
		estimatedTime: number;
		requiredResources: string[];
		steps: string[];
	};
	affectedAgents: string[];
	confidence: number;
	generatedAt: Date;
}

/**
 * Real-time dashboard data structure
 */
export interface DashboardData {
	timestamp: Date;
	overview: {
		totalOrchestrations: number;
		activeAgents: number;
		averagePerformance: number;
		systemLoad: number;
	};
	agentStatuses: AgentStatus[];
	performanceMetrics: PerformanceMetrics;
	interactionGraph: InteractionNode[];
	alerts: Alert[];
	recommendations: OptimizationRecommendation[];
}

/**
 * Agent status for real-time monitoring
 */
export interface AgentStatus {
	agentId: string;
	name: string;
	framework: string;
	status: "active" | "idle" | "busy" | "error" | "offline";
	currentTask?: string;
	lastActivity: Date;
	healthScore: number;
	workload: number;
}

/**
 * Performance analysis results
 */
export interface PerformanceAnalysis {
	timeRange: { start: Date; end: Date };
	overall: {
		averageResponseTime: number;
		throughput: number;
		errorRate: number;
		resourceUtilization: ResourceUtilization;
	};
	byFramework: Map<string, FrameworkPerformance>;
	byAgent: Map<string, AgentPerformance>;
	trends: TrendAnalysis;
	anomalies: PerformanceAnomaly[];
}

/**
 * Framework-specific performance metrics
 */
export interface FrameworkPerformance {
	framework: string;
	agentCount: number;
	averageExecutionTime: number;
	successRate: number;
	resourceEfficiency: number;
	coordinationOverhead: number;
	strengths: string[];
	weaknesses: string[];
}

/**
 * Individual agent performance
 */
export interface AgentPerformance {
	agentId: string;
	executionStats: {
		totalTasks: number;
		successfulTasks: number;
		averageTime: number;
		peakTime: number;
	};
	resourceStats: ResourceUtilization;
	reliability: number;
	efficiency: number;
	adaptability: number;
}

/**
 * Workflow bottleneck identification
 */
export interface WorkflowBottleneck {
	id: string;
	location: string;
	type:
		| "agent-overload"
		| "communication-lag"
		| "resource-contention"
		| "dependency-wait";
	severity: "low" | "medium" | "high" | "critical";
	impactScope: string[];
	averageDelay: number;
	frequency: number;
	rootCause: string;
	suggestedResolution: string[];
	detectedAt: Date;
}

/**
 * Resource utilization metrics
 */
export interface ResourceUtilization {
	cpu: {
		current: number;
		average: number;
		peak: number;
	};
	memory: {
		current: number;
		average: number;
		peak: number;
	};
	gpu?: {
		current: number;
		average: number;
		peak: number;
	};
	network: {
		inbound: number;
		outbound: number;
	};
	storage: {
		reads: number;
		writes: number;
	};
}

/**
 * Trend analysis for historical data
 */
export interface TrendAnalysis {
	period: string;
	performance: {
		direction: "improving" | "declining" | "stable";
		magnitude: number;
		confidence: number;
	};
	resourceUsage: {
		direction: "increasing" | "decreasing" | "stable";
		magnitude: number;
		projectedCapacity: Date;
	};
	errorRates: {
		direction: "improving" | "worsening" | "stable";
		magnitude: number;
	};
	scalability: {
		currentCapacity: number;
		projectedGrowth: number;
		bottleneckAt: number;
	};
}

/**
 * Predictive model for workload distribution
 */
export interface PredictiveModel {
	modelType: "linear-regression" | "neural-network" | "ensemble";
	accuracy: number;
	predictions: {
		timeHorizon: string;
		expectedLoad: number;
		confidence: number;
		factors: string[];
	}[];
	lastTrained: Date;
	features: string[];
	recommendedActions: string[];
}

/**
 * Cross-agent dependency mapping
 */
export interface CrossAgentDependency {
	sourceAgent: string;
	targetAgent: string;
	dependencyType: "data" | "control" | "resource" | "timing";
	strength: number;
	frequency: number;
	criticality: "low" | "medium" | "high";
	latency: number;
	reliability: number;
	impact: {
		onFailure: "cascade" | "isolated" | "degraded";
		recoveryTime: number;
	};
}

/**
 * Performance metrics structure
 */
export interface PerformanceMetrics {
	executionTimes: TimeSeriesData[];
	throughput: TimeSeriesData[];
	errorRates: TimeSeriesData[];
	resourceUtilization: TimeSeriesData[];
	agentDistribution: { framework: string; count: number; percentage: number }[];
}

/**
 * Time series data point
 */
export interface TimeSeriesData {
	timestamp: Date;
	value: number;
	metadata?: Record<string, unknown>;
}

/**
 * Interaction node for network visualization
 */
export interface InteractionNode {
	id: string;
	type: "agent" | "orchestrator" | "service";
	framework: string;
	position: { x: number; y: number };
	size: number;
	color: string;
	connections: Array<{
		target: string;
		weight: number;
		type: string;
		latency: number;
	}>;
	metrics: {
		activity: number;
		load: number;
		health: number;
	};
}

/**
 * Alert definitions
 */
export interface Alert {
	id: string;
	type: "performance" | "resource" | "error" | "security";
	severity: "info" | "warning" | "error" | "critical";
	title: string;
	description: string;
	source: string;
	timestamp: Date;
	acknowledged: boolean;
	resolvedAt?: Date;
	actions: string[];
}

/**
 * Performance anomaly detection
 */
export interface PerformanceAnomaly {
	id: string;
	type: "spike" | "dip" | "pattern-break" | "drift";
	metric: string;
	severity: number;
	duration: number;
	impact: string[];
	possibleCauses: string[];
	detectedAt: Date;
	confidence: number;
}

/**
 * Agent trace from OpenTelemetry
 */
export interface AgentTrace {
	traceId: string;
	spanId: string;
	parentSpanId?: string;
	agentId: string;
	operationName: string;
	startTime: Date;
	endTime?: Date;
	duration?: number;
	status: "started" | "completed" | "error";
	tags: Record<string, unknown>;
	logs: TraceLog[];
	context: SpanContext;
}

/**
 * Trace log entry
 */
export interface TraceLog {
	timestamp: Date;
	level: "debug" | "info" | "warning" | "error";
	message: string;
	fields?: Record<string, unknown>;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
	collection: {
		enabled: boolean;
		interval: number;
		batchSize: number;
		retentionPeriod: number;
	};
	analysis: {
		patternDetection: boolean;
		anomalyDetection: boolean;
		predictiveModeling: boolean;
		optimizationRecommendations: boolean;
	};
	visualization: {
		realTimeUpdates: boolean;
		maxDataPoints: number;
		refreshInterval: number;
	};
	alerts: {
		enabled: boolean;
		thresholds: Record<string, number>;
		notificationChannels: string[];
	};
	storage: {
		backend: "memory" | "file" | "database";
		compressionEnabled: boolean;
		encryptionEnabled: boolean;
	};
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
