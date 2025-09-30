/**
 * @fileoverview Dashboard Tool Layer for nO Architecture
 * @module DashboardToolLayer
 * @description High-level visualization, monitoring, and reporting tools - Phase 3.2
 */

import { z } from 'zod';
import { ToolLayer } from './tool-layer.js';

// Local types to eliminate `any` usage and satisfy lint rules
type Step = { id: string; name?: string; dependencies?: string[] };
type ExecutionPlan = { steps?: Step[]; estimatedDuration?: number };
type ExecutionState = {
	completedSteps?: string[];
	activeSteps?: string[];
	failedSteps?: string[];
	agentAssignments?: Record<string, string>;
};
type VisualizeExecutionInput = {
	planId?: string;
	executionPlan?: ExecutionPlan;
	layout?: string;
	realTime?: boolean;
	interactive?: boolean;
	enableCaching?: boolean;
	executionState?: ExecutionState;
	fallbackEnabled?: boolean;
};

type PerformanceDashboardInput = {
	data?: { metrics?: Record<string, unknown> };
	dashboardType?: 'comprehensive' | 'summary';
	includeCharts?: Array<'line' | 'bar' | 'pie'>;
	theme?: 'light' | 'dark' | 'high-contrast' | 'minimal';
	exportFormat?: 'html' | 'pdf' | 'png' | 'json';
	customConfig?: DashboardConfig;
};

type Agent = {
	id: string;
	status: 'active' | 'idle' | 'failed';
	performance?: { averageTime?: number; errorRate?: number };
};
type HealthPoint = { health: number };
type HealthHistory = Record<string, HealthPoint[]>;
type AnomalyThresholds = { responseTime: number; errorRate: number };
type AgentStatusReportInput = {
	agents?: Agent[];
	includeHealthMetrics?: boolean;
	includePerformanceAnalysis?: boolean;
	includeHealthTrending?: boolean;
	detectAnomalies?: boolean;
	healthHistory?: HealthHistory;
	anomalyThresholds?: AnomalyThresholds;
};

type ComponentHealth = {
	status: 'healthy' | 'degraded' | 'critical' | 'offline';
	lastError?: string;
};
type HealthData = { overall: string; components?: Record<string, ComponentHealth> };
type SystemHealthOverviewInput = {
	healthData: HealthData;
	includeResourceMonitoring?: boolean;
	alertThresholds?: Record<string, unknown>;
	highlightCritical?: boolean;
};

type Workflow = {
	startTime?: string | Date;
	endTime?: string | Date;
	steps?: unknown[];
	[key: string]: unknown;
};
type WorkflowTimelineInput = {
	workflows?: Workflow[];
	timeRange?: { from?: Date | string; to?: Date | string };
	includeStepDetails?: boolean;
	groupBy?: string;
	filterBy?: Record<string, string | string[]>;
};

type VizNode = {
	id: string;
	label?: string;
	status?: string;
	clickable?: boolean;
	tooltip?: string;
};
type VizEdge = { source: string; target: string; type?: string };

// Report and dashboard data shapes
type TrendInfo = { trend: 'improving' | 'declining' | 'stable'; changeRate: number };
type Anomaly = { agentId: string; issues: string[]; severity: 'critical' | 'warning' };
type AgentStatusReportData = {
	totalAgents: number;
	activeAgents: number;
	idleAgents: number;
	failedAgents: number;
	healthTrends?: Record<string, TrendInfo>;
	anomalies?: Anomaly[];
};

type CriticalIssue = { component: string; severity: string; message: string; timestamp: Date };
type SystemHealthData = {
	overallStatus: string;
	componentsTotal: number;
	healthyComponents: number;
	degradedComponents: number;
	criticalComponents: number;
	criticalIssues?: CriticalIssue[];
};

type WorkflowTimelineData = {
	nodes: unknown[];
	edges: unknown[];
	workflows: Workflow[];
	filteredCount?: number;
	groups?: Record<string, Workflow[]>;
};

// Dashboard configuration schema
export const DashboardConfigSchema = z.object({
	layout: z.enum(['grid', 'flex', 'masonry']).default('grid'),
	columns: z.number().min(1).max(12).default(3),
	theme: z.enum(['light', 'dark', 'high-contrast', 'minimal']).default('light'),
	refreshInterval: z.number().min(1000).default(30000),
	widgets: z
		.array(
			z.object({
				type: z.string(),
				position: z.object({ row: z.number(), col: z.number() }).optional(),
				size: z.enum(['small', 'medium', 'large']).default('medium'),
			}),
		)
		.default([]),
});
export type DashboardConfig = z.infer<typeof DashboardConfigSchema>;

// Visualization result schema
export const VisualizationResultSchema = z.object({
	type: z.literal('visualization'),
	format: z.enum(['svg', 'html', 'json', 'png']),
	data: z.object({
		nodes: z.array(z.unknown()).default([]),
		edges: z.array(z.unknown()).default([]),
		groups: z.record(z.array(z.unknown())).optional(),
		workflows: z.array(z.unknown()).optional(),
	}),
	metadata: z.record(z.unknown()),
	interactive: z.boolean().default(false),
});
export type VisualizationResult = z.infer<typeof VisualizationResultSchema>;

// Dashboard result schema
export const DashboardResultSchema = z.object({
	type: z.literal('dashboard'),
	format: z.enum(['html', 'pdf', 'png', 'json']),
	components: z.array(z.string()),
	widgets: z.array(z.unknown()).optional(),
	layout: z.string().optional(),
	configuration: z.record(z.unknown()).optional(),
	styling: z.record(z.unknown()).optional(),
	metadata: z.record(z.unknown()),
	exportable: z.boolean().default(false),
	data: z.record(z.unknown()).optional(),
});
export type DashboardResult = z.infer<typeof DashboardResultSchema>;

// Report result schema
export const ReportResultSchema = z.object({
	type: z.literal('report'),
	format: z.enum(['html', 'pdf', 'json', 'markdown']),
	sections: z.array(z.string()),
	data: z.record(z.unknown()),
	components: z.array(z.string()).optional(),
	metadata: z.record(z.unknown()),
});
export type ReportResult = z.infer<typeof ReportResultSchema>;

// Dashboard Tool Layer - High-level visualization and monitoring tools
export class DashboardToolLayer extends ToolLayer {
	private readonly visualizationCache = new Map<string, VisualizationResult>();
	private readonly dashboardMetrics = {
		totalInvocations: 0,
		successRate: 1.0,
		averageResponseTime: 0,
		toolUsage: {} as Record<string, number>,
	};

	constructor() {
		super('dashboard');
		this.initializeDashboardTools();
	}

	// Register dashboard-specific tools
	private initializeDashboardTools(): void {
		const dashboardTools = [
			{
				id: 'visualize-execution-graph',
				name: 'Execution Graph Visualizer',
				capabilities: ['visualization'],
				execute: async (input: unknown, _ctx: unknown) =>
					this.visualizeExecutionGraph(input as VisualizeExecutionInput),
				validate: this.validateVisualizationInput.bind(this),
				description: 'Creates interactive execution graph visualizations',
			},
			{
				id: 'create-performance-dashboard',
				name: 'Performance Dashboard Creator',
				capabilities: ['monitoring', 'dashboard-management'],
				execute: async (input: unknown, _ctx: unknown) =>
					this.createPerformanceDashboard(input as PerformanceDashboardInput),
				validate: this.validateDashboardInput.bind(this),
				description: 'Generates comprehensive performance monitoring dashboards',
			},
			{
				id: 'generate-agent-status-report',
				name: 'Agent Status Reporter',
				capabilities: ['reporting', 'monitoring'],
				execute: async (input: unknown, _ctx: unknown) =>
					this.generateAgentStatusReport(input as AgentStatusReportInput),
				validate: this.validateReportInput.bind(this),
				description: 'Creates detailed agent status and health reports',
			},
			{
				id: 'create-system-health-overview',
				name: 'System Health Overview',
				capabilities: ['monitoring', 'dashboard-management'],
				execute: async (input: unknown, _ctx: unknown) =>
					this.createSystemHealthOverview(input as SystemHealthOverviewInput),
				validate: this.validateHealthInput.bind(this),
				description: 'Provides comprehensive system health dashboards',
			},
			{
				id: 'visualize-workflow-timeline',
				name: 'Workflow Timeline Visualizer',
				capabilities: ['visualization', 'analytics'],
				execute: async (input: unknown, _ctx: unknown) =>
					this.visualizeWorkflowTimeline(input as WorkflowTimelineInput),
				validate: this.validateTimelineInput.bind(this),
				description: 'Creates interactive workflow timeline visualizations',
			},
		];
		dashboardTools.forEach(async (tool) => {
			try {
				await this.registerTool(tool);
			} catch (error) {
				console.error(`Failed to register dashboard tool ${tool.id}:`, error);
			}
		});
	}

	getAvailableTools(): string[] {
		return this.getRegisteredTools().map((tool) => tool.id);
	}

	async invoke(toolId: string, input: unknown): Promise<unknown> {
		const startTime = Date.now();
		try {
			const result = await this.invokeTool(toolId, input);
			this.updateDashboardMetrics(toolId, Date.now() - startTime, true);
			return result;
		} catch (error) {
			this.updateDashboardMetrics(toolId, Date.now() - startTime, false);
			throw error;
		}
	}

	getDashboardMetrics() {
		return { ...this.dashboardMetrics };
	}

	// Overloads to satisfy base ToolLayer signature and tests that call getToolMetrics()
	getToolMetrics(toolId: string): import('./tool-layer.js').ToolMetrics | undefined;
	getToolMetrics(): {
		totalInvocations: number;
		successRate: number;
		averageResponseTime: number;
		toolUsage: Record<string, number>;
	};
	getToolMetrics(toolId?: string) {
		if (typeof toolId === 'string') {
			// Call base implementation for per-tool metrics
			return super.getToolMetrics(toolId as string);
		}
		// No-arg usage: return dashboard-level metrics snapshot for tests
		return { ...this.dashboardMetrics };
	}

	private async visualizeExecutionGraph(
		input: VisualizeExecutionInput,
	): Promise<VisualizationResult> {
		const {
			planId,
			executionPlan,
			layout = 'hierarchical',
			realTime = false,
			interactive = false,
			enableCaching = false,
			fallbackEnabled = false,
		} = input ?? {};
		const cacheKey = `execution-graph-${planId}-${layout}`;
		if (enableCaching && this.visualizationCache.has(cacheKey)) {
			const cached = this.visualizationCache.get(cacheKey);
			if (cached) {
				const ret = {
					...cached,
					metadata: { ...cached.metadata, cached: true },
				} as VisualizationResult & { planId?: string };
				ret.planId = planId;
				return ret;
			}
		}
		const nodes: VizNode[] = [];
		const edges: VizEdge[] = [];
		// If executionPlan is missing but executionState is provided, synthesize nodes from the state
		if (
			(!executionPlan?.steps || executionPlan.steps.length === 0) &&
			(input as VisualizeExecutionInput).executionState
		) {
			const execState = (input as VisualizeExecutionInput).executionState as ExecutionState;
			const completed: string[] = Array.isArray(execState.completedSteps)
				? execState.completedSteps
				: [];
			const active: string[] = Array.isArray(execState.activeSteps) ? execState.activeSteps : [];
			const failed: string[] = Array.isArray(execState.failedSteps) ? execState.failedSteps : [];
			const all = Array.from(new Set([...completed, ...active, ...failed]));
			for (const id of all) {
				nodes.push({
					id,
					label: id,
					status: completed.includes(id) ? 'completed' : active.includes(id) ? 'active' : 'failed',
					clickable: interactive,
					tooltip: interactive ? `Step: ${id}` : undefined,
				});
			}
			// Return synthesized visualization when real-time updates are requested
			const result = {
				type: 'visualization',
				format: 'svg',
				data: { nodes, edges },
				metadata: {
					planId,
					layout,
					realTime,
					cached: false,
					totalDuration: executionPlan?.estimatedDuration || 0,
				},
				interactive,
			} as VisualizationResult & { planId?: string };
			return result;
		}
		if (!executionPlan?.steps || executionPlan.steps.length === 0) {
			const errResult = this.handleDataError(
				'visualize-execution-graph',
				fallbackEnabled,
			) as VisualizationResult & { planId?: string };
			errResult.planId = planId;
			return errResult;
		}
		if (executionPlan?.steps) {
			executionPlan.steps.forEach((step: Step) => {
				let status = 'pending';
				if (input.executionState) {
					if (input.executionState.completedSteps?.includes(step.id)) status = 'completed';
					else if (input.executionState.activeSteps?.includes(step.id)) status = 'active';
					else if (input.executionState.failedSteps?.includes(step.id)) status = 'failed';
				}
				nodes.push({
					id: step.id,
					label: step.name || step.id,
					status,
					clickable: interactive,
					tooltip: interactive ? `Step: ${step.name || step.id}` : undefined,
				});
			});
			executionPlan.steps.forEach((step: Step) => {
				if (step.dependencies?.length) {
					step.dependencies.forEach((dep: string) => {
						edges.push({ source: dep, target: step.id, type: 'dependency' });
					});
				}
			});
		}
		const result = {
			type: 'visualization',
			format: 'svg',
			data: { nodes, edges },
			metadata: {
				planId,
				layout,
				realTime,
				cached: false,
				totalDuration: executionPlan?.estimatedDuration || 0,
			},
			interactive,
		} as VisualizationResult & { planId?: string };
		if (enableCaching) this.visualizationCache.set(cacheKey, result);
		return result;
	}

	private async createPerformanceDashboard(
		input: PerformanceDashboardInput,
	): Promise<DashboardResult> {
		const {
			data,
			dashboardType = 'comprehensive',
			includeCharts = [],
			theme = 'light',
			exportFormat = 'html',
			customConfig,
		} = input ?? {};
		if (customConfig) {
			try {
				DashboardConfigSchema.parse(customConfig);
			} catch {
				throw new Error('Invalid dashboard configuration');
			}
		}
		const components = ['metrics-overview'];
		const widgets: unknown[] = [];
		if (dashboardType === 'comprehensive')
			components.push('agent-performance-chart', 'execution-timeline');
		if (data?.metrics) components.push('metrics-summary');
		if (includeCharts.includes('line')) components.push('line-chart');
		if (includeCharts.includes('bar')) components.push('bar-chart');
		if (includeCharts.includes('pie')) components.push('pie-chart');
		if (customConfig?.widgets) widgets.push(...customConfig.widgets);
		return {
			type: 'dashboard',
			format: exportFormat,
			components,
			widgets: widgets.length > 0 ? widgets : undefined,
			layout: customConfig?.layout,
			configuration: customConfig ? { columns: customConfig.columns } : undefined,
			styling: { theme },
			metadata: {
				dashboardType,
				chartTypes: includeCharts,
				theme,
				refreshInterval: customConfig?.refreshInterval,
				dataMetrics: data?.metrics ? Object.keys(data.metrics).length : 0,
			},
			exportable: true,
		};
	}

	private async generateAgentStatusReport(input: AgentStatusReportInput): Promise<ReportResult> {
		const {
			agents = [],
			includeHealthMetrics = false,
			includePerformanceAnalysis = false,
			includeHealthTrending = false,
			detectAnomalies = false,
			healthHistory,
			anomalyThresholds,
		} = input ?? {};
		const sections = ['agent-overview'];
		const components = ['agent-status-grid'];
		const data: AgentStatusReportData = {
			totalAgents: agents.length,
			activeAgents: agents.filter((a: Agent) => a.status === 'active').length,
			idleAgents: agents.filter((a: Agent) => a.status === 'idle').length,
			failedAgents: agents.filter((a: Agent) => a.status === 'failed').length,
		};
		if (includeHealthMetrics) {
			sections.push('health-analysis');
			components.push('health-analysis');
		}
		if (includePerformanceAnalysis) {
			sections.push('performance-summary');
			components.push('performance-summary');
		}
		if (includeHealthTrending && healthHistory) {
			sections.push('health-trending-chart');
			components.push('health-trending-chart');
			data.healthTrends = this.computeHealthTrends(healthHistory);
		}
		if (detectAnomalies && anomalyThresholds) {
			sections.push('anomaly-detection');
			components.push('anomaly-detection');
			data.anomalies = this.detectAnomalies(agents, anomalyThresholds);
		}
		return {
			type: 'report',
			format: 'html',
			sections,
			data,
			components,
			metadata: { generatedAt: new Date(), reportType: 'agent-status' },
		};
	}

	private computeHealthTrends(healthHistory: HealthHistory): Record<string, TrendInfo> {
		const trends: Record<string, TrendInfo> = {};
		for (const [agentId, history] of Object.entries(healthHistory)) {
			if (history.length >= 2) {
				const first = history[0].health;
				const last = history[history.length - 1].health;
				const change = last - first;
				let trend: TrendInfo['trend'];
				if (change > 0) trend = 'improving';
				else if (change < 0) trend = 'declining';
				else trend = 'stable';
				trends[agentId] = { trend, changeRate: change / history.length };
			}
		}
		return trends;
	}

	// Extracted to reduce cognitive complexity
	private detectAnomalies(agents: Agent[], anomalyThresholds: AnomalyThresholds): Anomaly[] {
		const anomalies: Anomaly[] = [];
		for (const agent of agents) {
			const issues: string[] = [];
			if ((agent.performance?.averageTime ?? 0) > anomalyThresholds.responseTime)
				issues.push('high-response-time');
			if ((agent.performance?.errorRate ?? 0) > anomalyThresholds.errorRate)
				issues.push('high-error-rate');
			if (issues.length > 0)
				anomalies.push({
					agentId: agent.id,
					issues,
					severity: issues.length > 1 ? ('critical' as const) : ('warning' as const),
				});
		}
		return anomalies;
	}

	private async createSystemHealthOverview(
		input: SystemHealthOverviewInput,
	): Promise<DashboardResult> {
		const {
			healthData,
			includeResourceMonitoring = false,
			alertThresholds,
			highlightCritical = false,
		} = input;
		const components = ['system-status-overview', 'component-health-grid'];
		const data: SystemHealthData = {
			overallStatus: healthData.overall,
			componentsTotal: Object.keys(healthData.components || {}).length,
			healthyComponents: Object.values(healthData.components || {}).filter(
				(c: ComponentHealth) => c.status === 'healthy',
			).length,
			degradedComponents: Object.values(healthData.components || {}).filter(
				(c: ComponentHealth) => c.status === 'degraded',
			).length,
			criticalComponents: Object.values(healthData.components || {}).filter(
				(c: ComponentHealth) => c.status === 'critical',
			).length,
		};
		if (includeResourceMonitoring) components.push('resource-usage-charts');
		if (highlightCritical) {
			const criticalIssues: CriticalIssue[] = [];
			Object.entries(healthData.components || {}).forEach(
				([name, component]: [string, ComponentHealth]) => {
					if (component.status === 'critical' || component.status === 'offline') {
						criticalIssues.push({
							component: name,
							severity: component.status,
							message: component.lastError || `Component is ${component.status}`,
							timestamp: new Date(),
						});
					}
				},
			);
			data.criticalIssues = criticalIssues;
		}
		return {
			type: 'dashboard',
			format: 'html',
			components,
			data,
			metadata: { healthCheckTime: new Date(), alertThresholds },
			exportable: true,
		};
	}

	private async visualizeWorkflowTimeline(
		input: WorkflowTimelineInput,
	): Promise<VisualizationResult> {
		const {
			workflows = [],
			timeRange,
			includeStepDetails = false,
			groupBy,
			filterBy,
		} = input ?? {};
		let processedWorkflows: Workflow[] = [...workflows];
		if (filterBy) {
			for (const [key, values] of Object.entries(filterBy)) {
				processedWorkflows = processedWorkflows.filter((wf) => {
					const val = String((wf as Record<string, unknown>)[key] ?? '');
					return Array.isArray(values) ? values.map(String).includes(val) : val === String(values);
				});
			}
		}
		const totalDuration = workflows.reduce((sum: number, wf: Workflow) => {
			if (wf.startTime && wf.endTime)
				return sum + (new Date(wf.endTime).getTime() - new Date(wf.startTime).getTime());
			return sum;
		}, 0);
		const data: WorkflowTimelineData = {
			nodes: [],
			edges: [],
			workflows: processedWorkflows,
			filteredCount: filterBy ? processedWorkflows.length : undefined,
		};
		if (includeStepDetails)
			data.workflows = data.workflows.map((wf: Workflow) => ({
				...wf,
				stepDetails: wf.steps || [],
			}));
		if (groupBy) {
			const groups: Record<string, Workflow[]> = {};
			processedWorkflows.forEach((wf: Workflow) => {
				const groupKey = String((wf as Record<string, unknown>)[groupBy] ?? 'unknown');
				if (!groups[groupKey]) groups[groupKey] = [];
				groups[groupKey].push(wf);
			});
			data.groups = groups;
		}
		return {
			type: 'visualization',
			format: 'svg',
			data,
			metadata: { totalDuration, timeRange, groupBy, filterBy },
			interactive: true,
		};
	}

	private validateVisualizationInput(input: unknown): boolean {
		return !!input && typeof input === 'object';
	}
	private validateDashboardInput(input: unknown): boolean {
		return !!input && typeof input === 'object';
	}
	private validateReportInput(input: unknown): boolean {
		return !!input && typeof input === 'object';
	}
	private validateHealthInput(input: unknown): boolean {
		return !!input && typeof input === 'object' && 'healthData' in input;
	}
	private validateTimelineInput(input: unknown): boolean {
		return !!input && typeof input === 'object';
	}

	private updateDashboardMetrics(toolId: string, executionTime: number, success: boolean): void {
		this.dashboardMetrics.totalInvocations++;
		this.dashboardMetrics.toolUsage[toolId] = (this.dashboardMetrics.toolUsage[toolId] || 0) + 1;
		const safeExecutionTime = Math.max(1, Math.floor(executionTime));
		const prevTotal =
			this.dashboardMetrics.averageResponseTime * (this.dashboardMetrics.totalInvocations - 1);
		this.dashboardMetrics.averageResponseTime =
			(prevTotal + safeExecutionTime) / this.dashboardMetrics.totalInvocations;
		const currentSuccesses = Math.floor(
			this.dashboardMetrics.successRate * (this.dashboardMetrics.totalInvocations - 1),
		);
		const newSuccesses = currentSuccesses + (success ? 1 : 0);
		this.dashboardMetrics.successRate = newSuccesses / this.dashboardMetrics.totalInvocations;
	}

	private handleDataError(toolId: string, fallbackEnabled: boolean = false): unknown {
		if (toolId === 'visualize-execution-graph') {
			return {
				type: 'visualization',
				format: 'svg',
				data: {
					nodes: fallbackEnabled
						? [{ id: 'error', label: 'Data Error - Check Input', status: 'error' }]
						: [],
				},
				metadata: { warnings: ['No execution plan provided'], fallbackUsed: fallbackEnabled },
				interactive: false,
			};
		}
		return { error: 'Invalid data provided' };
	}
}
