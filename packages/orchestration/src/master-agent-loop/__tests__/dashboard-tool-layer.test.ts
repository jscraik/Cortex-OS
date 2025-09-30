/**
 * @fileoverview Test suite for Dashboard Tool Layer
 * @module DashboardToolLayer.test
 * @description TDD tests for nO architecture dashboard tool layer - Phase 3.2
 * @author brAInwav Development Team
 * @version 3.2.0
 * @since 2024-12-09
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DashboardToolLayer } from '../dashboard-tool-layer.js';

describe('DashboardToolLayer', () => {
	let dashboardLayer: DashboardToolLayer;

	beforeEach(() => {
		dashboardLayer = new DashboardToolLayer();
	});

	afterEach(async () => {
		await dashboardLayer.shutdown();
	});

	describe('Dashboard Tool Layer Initialization', () => {
		it('should provide high-level visualization and monitoring tools', async () => {
			const result = (await dashboardLayer.invoke('visualize-execution-graph', {
				planId: 'test',
			})) as any;
			expect(result.type).toBe('visualization');
			expect(result.data).toBeDefined();
			expect(result.planId).toBe('test');
		});

		it('should initialize with dashboard-specific tools', () => {
			const availableTools = dashboardLayer.getAvailableTools();
			expect(availableTools).toContain('visualize-execution-graph');
			expect(availableTools).toContain('create-performance-dashboard');
			expect(availableTools).toContain('generate-agent-status-report');
			expect(availableTools).toContain('create-system-health-overview');
			expect(availableTools).toContain('visualize-workflow-timeline');
		});

		it('should have correct layer type and capabilities', () => {
			expect(dashboardLayer.getLayerType()).toBe('dashboard');
			expect(dashboardLayer.getCapabilities()).toContain('visualization');
			expect(dashboardLayer.getCapabilities()).toContain('monitoring');
			expect(dashboardLayer.getCapabilities()).toContain('reporting');
		});
	});

	describe('Execution Graph Visualization', () => {
		it('should create execution graph visualizations', async () => {
			const executionPlan = {
				id: 'plan-123',
				steps: [
					{ id: 'step-1', name: 'Initialize', dependencies: [] },
					{ id: 'step-2', name: 'Process', dependencies: ['step-1'] },
					{ id: 'step-3', name: 'Finalize', dependencies: ['step-2'] },
				],
				agents: ['agent-1', 'agent-2'],
				estimatedDuration: 5000,
			};

			const result = (await dashboardLayer.invoke('visualize-execution-graph', {
				planId: executionPlan.id,
				executionPlan,
				layout: 'hierarchical',
			})) as any;

			expect(result.type).toBe('visualization');
			expect(result.format).toBe('svg');
			expect(result.data.nodes).toHaveLength(3);
			expect(result.data.edges).toHaveLength(2);
			expect(result.metadata.planId).toBe('plan-123');
			expect(result.metadata.layout).toBe('hierarchical');
		});

		it('should support different graph layouts', async () => {
			const layouts = ['hierarchical', 'circular', 'force-directed', 'tree'];

			for (const layout of layouts) {
				const result = (await dashboardLayer.invoke('visualize-execution-graph', {
					planId: 'test-layout',
					layout,
					executionPlan: {
						id: 'test-layout',
						steps: [{ id: 'step-1', name: 'Test', dependencies: [] }],
					},
				})) as any;

				expect(result.metadata.layout).toBe(layout);
				expect(result.type).toBe('visualization');
			}
		});

		it('should handle real-time execution updates', async () => {
			const executionState = {
				planId: 'live-plan',
				activeSteps: ['step-2'],
				completedSteps: ['step-1'],
				failedSteps: [],
				agentAssignments: {
					'step-1': 'agent-1',
					'step-2': 'agent-2',
				},
			};

			const result = (await dashboardLayer.invoke('visualize-execution-graph', {
				planId: 'live-plan',
				executionState,
				realTime: true,
			})) as any;

			expect(result.data.nodes).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: 'step-1', status: 'completed' }),
					expect.objectContaining({ id: 'step-2', status: 'active' }),
				]),
			);
			expect(result.metadata.realTime).toBe(true);
		});

		it('should generate interactive graph elements', async () => {
			const result = (await dashboardLayer.invoke('visualize-execution-graph', {
				planId: 'interactive-test',
				interactive: true,
				executionPlan: {
					id: 'interactive-test',
					steps: [
						{ id: 'step-1', name: 'Start', dependencies: [] },
						{ id: 'step-2', name: 'Process', dependencies: ['step-1'] },
					],
				},
			})) as any;

			expect(result.interactive).toBe(true);
			expect(result.data.nodes).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: 'step-1',
						clickable: true,
						tooltip: expect.any(String),
					}),
				]),
			);
		});
	});

	describe('Performance Dashboard Tools', () => {
		it('should create comprehensive performance dashboards', async () => {
			const performanceData = {
				timeRange: { start: new Date('2024-01-01'), end: new Date('2024-01-02') },
				metrics: {
					totalExecutions: 150,
					successRate: 0.95,
					averageExecutionTime: 2500,
					agentUtilization: 0.78,
				},
				agentPerformance: [
					{ agentId: 'agent-1', completedTasks: 75, averageTime: 2200 },
					{ agentId: 'agent-2', completedTasks: 70, averageTime: 2800 },
				],
			};

			const result = (await dashboardLayer.invoke('create-performance-dashboard', {
				data: performanceData,
				dashboardType: 'comprehensive',
				includeCharts: ['line', 'bar', 'pie'],
			})) as any;

			expect(result.type).toBe('dashboard');
			expect(result.format).toBe('html');
			expect(result.components).toContain('metrics-overview');
			expect(result.components).toContain('agent-performance-chart');
			expect(result.components).toContain('execution-timeline');
			expect(result.metadata.chartTypes).toEqual(['line', 'bar', 'pie']);
		});

		it('should support different dashboard themes', async () => {
			const themes = ['light', 'dark', 'high-contrast', 'minimal'];

			for (const theme of themes) {
				const result = (await dashboardLayer.invoke('create-performance-dashboard', {
					data: { metrics: { totalExecutions: 10 } },
					theme,
				})) as any;

				expect(result.metadata.theme).toBe(theme);
				expect(result.styling.theme).toBe(theme);
			}
		});

		it('should generate exportable dashboard formats', async () => {
			const formats = ['html', 'pdf', 'png', 'json'];

			for (const format of formats) {
				const result = (await dashboardLayer.invoke('create-performance-dashboard', {
					data: { metrics: { totalExecutions: 10 } },
					exportFormat: format,
				})) as any;

				expect(result.format).toBe(format);
				expect(result.exportable).toBe(true);
			}
		});
	});

	describe('Agent Status Monitoring', () => {
		it('should generate comprehensive agent status reports', async () => {
			const agentData = [
				{
					id: 'agent-1',
					status: 'active',
					currentTask: 'data-processing',
					health: 0.95,
					performance: { completedTasks: 25, averageTime: 1500 },
				},
				{
					id: 'agent-2',
					status: 'idle',
					health: 0.88,
					performance: { completedTasks: 18, averageTime: 2100 },
				},
				{
					id: 'agent-3',
					status: 'failed',
					health: 0.12,
					lastError: 'Connection timeout',
				},
			];

			const result = (await dashboardLayer.invoke('generate-agent-status-report', {
				agents: agentData,
				includeHealthMetrics: true,
				includePerformanceAnalysis: true,
			})) as any;

			expect(result.type).toBe('report');
			expect(result.format).toBe('html');
			expect(result.sections).toContain('agent-overview');
			expect(result.sections).toContain('health-analysis');
			expect(result.sections).toContain('performance-summary');
			expect(result.data.totalAgents).toBe(3);
			expect(result.data.activeAgents).toBe(1);
			expect(result.data.failedAgents).toBe(1);
		});

		it('should provide agent health trending', async () => {
			const healthHistory = {
				'agent-1': [
					{ timestamp: new Date('2024-01-01T10:00:00Z'), health: 0.95 },
					{ timestamp: new Date('2024-01-01T11:00:00Z'), health: 0.92 },
					{ timestamp: new Date('2024-01-01T12:00:00Z'), health: 0.88 },
				],
			};

			const result = (await dashboardLayer.invoke('generate-agent-status-report', {
				healthHistory,
				includeHealthTrending: true,
			})) as any;

			expect(result.components).toContain('health-trending-chart');
			expect(result.data.healthTrends).toBeDefined();
			expect(result.data.healthTrends['agent-1']).toEqual(
				expect.objectContaining({
					trend: 'declining',
					changeRate: expect.any(Number),
				}),
			);
		});

		it('should detect and highlight agent anomalies', async () => {
			const agentData = [
				{
					id: 'agent-1',
					performance: { averageTime: 1500, errorRate: 0.02 },
				},
				{
					id: 'agent-2',
					performance: { averageTime: 8500, errorRate: 0.25 }, // Anomaly
				},
			];

			const result = (await dashboardLayer.invoke('generate-agent-status-report', {
				agents: agentData,
				detectAnomalies: true,
				anomalyThresholds: { responseTime: 5000, errorRate: 0.1 },
			})) as any;

			expect(result.sections).toContain('anomaly-detection');
			expect(result.data.anomalies).toHaveLength(1);
			expect(result.data.anomalies[0].agentId).toBe('agent-2');
			expect(result.data.anomalies[0].issues).toContain('high-response-time');
			expect(result.data.anomalies[0].issues).toContain('high-error-rate');
		});
	});

	describe('System Health Overview', () => {
		it('should create comprehensive system health dashboards', async () => {
			const systemHealth = {
				overall: 'healthy',
				components: {
					agentPool: { status: 'healthy', metrics: { utilization: 0.75 } },
					statePersistence: { status: 'degraded', metrics: { responseTime: 250 } },
					failureRecovery: { status: 'healthy', metrics: { successRate: 0.98 } },
					learningSystem: { status: 'healthy', metrics: { modelsActive: 5 } },
				},
				resourceUsage: {
					cpu: 0.65,
					memory: 0.78,
					network: 0.45,
				},
			};

			const result = (await dashboardLayer.invoke('create-system-health-overview', {
				healthData: systemHealth,
				includeResourceMonitoring: true,
				alertThresholds: { cpu: 0.8, memory: 0.85 },
			})) as any;

			expect(result.type).toBe('dashboard');
			expect(result.components).toContain('system-status-overview');
			expect(result.components).toContain('component-health-grid');
			expect(result.components).toContain('resource-usage-charts');
			expect(result.data.overallStatus).toBe('healthy');
			expect(result.data.componentsTotal).toBe(4);
			expect(result.data.degradedComponents).toBe(1);
		});

		it('should highlight critical system issues', async () => {
			const criticalHealth = {
				overall: 'critical',
				components: {
					agentPool: { status: 'critical', lastError: 'Pool exhausted' },
					statePersistence: { status: 'offline', lastError: 'Database connection failed' },
				},
			};

			const result = (await dashboardLayer.invoke('create-system-health-overview', {
				healthData: criticalHealth,
				highlightCritical: true,
			})) as any;

			expect(result.data.criticalIssues).toHaveLength(2);
			expect(result.data.criticalIssues).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						component: 'agentPool',
						severity: 'critical',
						message: 'Pool exhausted',
					}),
				]),
			);
		});
	});

	describe('Workflow Timeline Visualization', () => {
		it('should create interactive workflow timelines', async () => {
			const workflowHistory = [
				{
					id: 'workflow-1',
					startTime: new Date('2024-01-01T10:00:00Z'),
					endTime: new Date('2024-01-01T10:05:00Z'),
					status: 'completed',
					steps: [
						{ id: 'step-1', startTime: new Date('2024-01-01T10:00:00Z'), duration: 120000 },
						{ id: 'step-2', startTime: new Date('2024-01-01T10:02:00Z'), duration: 180000 },
					],
				},
			];

			const result = (await dashboardLayer.invoke('visualize-workflow-timeline', {
				workflows: workflowHistory,
				timeRange: {
					start: new Date('2024-01-01T09:00:00Z'),
					end: new Date('2024-01-01T11:00:00Z'),
				},
				includeStepDetails: true,
			})) as any;

			expect(result.type).toBe('visualization');
			expect(result.format).toBe('svg');
			expect(result.data.workflows).toHaveLength(1);
			expect(result.data.workflows[0].steps).toHaveLength(2);
			expect(result.interactive).toBe(true);
			expect(result.metadata.totalDuration).toBe(300000);
		});

		it('should support timeline filtering and grouping', async () => {
			const workflows = [
				{ id: 'wf-1', category: 'data-processing', priority: 'high' },
				{ id: 'wf-2', category: 'reporting', priority: 'low' },
				{ id: 'wf-3', category: 'data-processing', priority: 'medium' },
			];

			const result = (await dashboardLayer.invoke('visualize-workflow-timeline', {
				workflows,
				groupBy: 'category',
				filterBy: { priority: ['high', 'medium'] },
			})) as any;

			expect(result.data.groups).toBeDefined();
			expect(result.data.groups['data-processing']).toHaveLength(2);
			expect(result.data.filteredCount).toBe(2);
		});
	});

	describe('Dashboard Tool Performance and Metrics', () => {
		it('should track dashboard tool performance metrics', async () => {
			// Execute multiple dashboard operations
			await dashboardLayer.invoke('visualize-execution-graph', { planId: 'test-1' });
			await dashboardLayer.invoke('create-performance-dashboard', { data: {} });
			await dashboardLayer.invoke('generate-agent-status-report', { agents: [] });

			const metrics = dashboardLayer.getToolMetrics();
			expect(metrics.totalInvocations).toBe(3);
			expect(metrics.averageResponseTime).toBeGreaterThan(0);
			expect(metrics.successRate).toBe(1.0);
			expect(metrics.toolUsage).toEqual(
				expect.objectContaining({
					'visualize-execution-graph': 1,
					'create-performance-dashboard': 1,
					'generate-agent-status-report': 1,
				}),
			);
		});

		it('should cache visualization results for performance', async () => {
			const planId = 'cached-plan';
			const executionPlan = {
				id: planId,
				steps: [{ id: 'step-1', name: 'Test', dependencies: [] }],
			};

			// First invocation - should create and cache
			const result1 = (await dashboardLayer.invoke('visualize-execution-graph', {
				planId,
				executionPlan,
				enableCaching: true,
			})) as any;

			// Second invocation - should use cache
			const startTime = Date.now();
			const result2 = (await dashboardLayer.invoke('visualize-execution-graph', {
				planId,
				executionPlan,
				enableCaching: true,
			})) as any;
			const responseTime = Date.now() - startTime;

			expect(result2.metadata.cached).toBe(true);
			expect(responseTime).toBeLessThan(50); // Should be very fast from cache
			expect(result1.data).toEqual(result2.data);
		});
	});

	describe('Dashboard Customization and Configuration', () => {
		it('should support custom dashboard configurations', async () => {
			const customConfig = {
				layout: 'grid',
				columns: 3,
				widgets: [
					{ type: 'metric-card', position: { row: 1, col: 1 }, size: 'small' },
					{ type: 'line-chart', position: { row: 1, col: 2 }, size: 'medium' },
					{ type: 'status-grid', position: { row: 2, col: 1 }, size: 'large' },
				],
				theme: 'dark',
				refreshInterval: 30000,
			};

			const result = (await dashboardLayer.invoke('create-performance-dashboard', {
				data: { metrics: {} },
				customConfig,
			})) as any;

			expect(result.layout).toEqual(customConfig.layout);
			expect(result.configuration.columns).toBe(3);
			expect(result.widgets).toHaveLength(3);
			expect(result.metadata.refreshInterval).toBe(30000);
		});

		it('should validate dashboard configuration schemas', async () => {
			const invalidConfig = {
				layout: 'invalid-layout',
				columns: -1, // Invalid
				widgets: [
					{ type: 'unknown-widget' }, // Invalid widget type
				],
			};

			await expect(
				dashboardLayer.invoke('create-performance-dashboard', {
					data: { metrics: {} },
					customConfig: invalidConfig,
				}),
			).rejects.toThrow('Invalid dashboard configuration');
		});
	});

	describe('Error Handling and Resilience', () => {
		it('should handle missing or invalid data gracefully', async () => {
			const result = (await dashboardLayer.invoke('visualize-execution-graph', {
				planId: 'missing-plan',
				// Missing executionPlan
			})) as any;

			expect(result.type).toBe('visualization');
			expect(result.data.nodes).toHaveLength(0);
			expect(result.metadata.warnings).toContain('No execution plan provided');
		});

		it('should provide fallback visualizations for corrupted data', async () => {
			const corruptedPlan = {
				id: 'corrupted',
				steps: null, // Corrupted data
				invalidField: 'should be ignored',
			};

			const result = (await dashboardLayer.invoke('visualize-execution-graph', {
				planId: 'corrupted',
				executionPlan: corruptedPlan,
				fallbackEnabled: true,
			})) as any;

			expect(result.type).toBe('visualization');
			expect(result.metadata.fallbackUsed).toBe(true);
			expect(result.data.nodes).toHaveLength(1); // Fallback node
			expect(result.data.nodes[0].label).toContain('Data Error');
		});
	});

	describe('Integration with Tool Layer', () => {
		it('should properly integrate with base tool layer', () => {
			expect(dashboardLayer.getLayerType()).toBe('dashboard');
			expect(dashboardLayer.getCapabilities()).toEqual(
				expect.arrayContaining(['visualization', 'monitoring', 'reporting']),
			);
		});

		it('should emit proper tool execution events', async () => {
			const events: any[] = [];
			dashboardLayer.on('tool-executed', (event) => events.push(event));

			await dashboardLayer.invoke('visualize-execution-graph', { planId: 'event-test' });

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual(
				expect.objectContaining({
					toolId: 'visualize-execution-graph',
					layerType: 'dashboard',
					success: true,
					executionTime: expect.any(Number),
				}),
			);
		});
	});
});
