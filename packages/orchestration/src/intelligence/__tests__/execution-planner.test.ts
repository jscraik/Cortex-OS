/**
 * Phase 1.4: Enhanced ExecutionPlanner TDD Test Suite
 *
 * Test-driven development for nO Intelligence & Scheduler Core
 * Following the TDD plan: Red-Green-Refactor cycle
 *
 * Co-authored-by: brAInwav Development Team
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { ExecutionPlan } from '../../contracts/no-architecture-contracts.js';
import { ExecutionPlanner } from '../execution-planner.js';

describe('Phase 1.4: Enhanced ExecutionPlanner (nO Architecture)', () => {
	let planner: ExecutionPlanner;

	beforeEach(() => {
		planner = new ExecutionPlanner();
	});

	describe('DAG Creation and Dependency Resolution', () => {
		it('should create execution plan from workflow with proper dependency resolution', async () => {
			const workflow = {
				id: 'test-workflow-001',
				name: 'Basic Dependency Test',
				steps: {
					analyze: {
						name: 'Analyze Input',
						type: 'analysis',
						agentRequirements: ['analyst'],
						estimatedDuration: 2000,
						parameters: { depth: 'shallow' },
						next: 'process',
					},
					process: {
						name: 'Process Data',
						type: 'execution',
						agentRequirements: ['executor'],
						estimatedDuration: 3000,
						parameters: { method: 'standard' },
						next: 'validate',
					},
					validate: {
						name: 'Validate Results',
						type: 'validation',
						agentRequirements: ['validator'],
						estimatedDuration: 1000,
						parameters: { strict: true },
					},
				},
			};

			// This will fail until enhanced workflow processing is implemented
			const plan = await planner.createPlanFromWorkflow(workflow);

			expect(plan).toBeDefined();
			expect(plan.id).toBeDefined();
			expect(plan.requestId).toBeDefined();
			expect(plan.strategy).toBeDefined();
			expect(plan.steps.length).toBe(3);
			expect(plan.estimatedDuration).toBeGreaterThan(0);
			expect(plan.resourceAllocation).toBeDefined();
			expect(plan.contingencyPlans).toBeDefined();

			// Verify dependency chain
			const analyzeStep = plan.steps.find((s) => s.id === 'analyze');
			const processStep = plan.steps.find((s) => s.id === 'process');
			const validateStep = plan.steps.find((s) => s.id === 'validate');

			expect(analyzeStep?.dependencies).toEqual([]);
			expect(processStep?.dependencies).toEqual(['analyze']);
			expect(validateStep?.dependencies).toEqual(['process']);
		});

		it('should handle parallel branches with proper DAG structure', async () => {
			const workflow = {
				id: 'parallel-workflow-001',
				name: 'Parallel Processing Test',
				steps: {
					start: {
						name: 'Initialize',
						type: 'initialization',
						agentRequirements: ['coordinator'],
						estimatedDuration: 1000,
						parameters: {},
						branches: [
							{ to: 'branch-a', condition: 'always' },
							{ to: 'branch-b', condition: 'always' },
						],
					},
					'branch-a': {
						name: 'Process Branch A',
						type: 'execution',
						agentRequirements: ['executor'],
						estimatedDuration: 4000,
						parameters: { branch: 'a' },
						next: 'merge',
					},
					'branch-b': {
						name: 'Process Branch B',
						type: 'execution',
						agentRequirements: ['executor'],
						estimatedDuration: 3000,
						parameters: { branch: 'b' },
						next: 'merge',
					},
					merge: {
						name: 'Merge Results',
						type: 'coordination',
						agentRequirements: ['coordinator'],
						estimatedDuration: 2000,
						parameters: { mergeType: 'combine' },
					},
				},
			};

			// This will fail until parallel branch handling is implemented
			const plan = await planner.createPlanFromWorkflow(workflow);

			expect(plan.steps.length).toBe(4);
			expect(plan.strategy).toBe('hierarchical'); // Should detect parallel + merge pattern

			const startStep = plan.steps.find((s) => s.id === 'start');
			const branchAStep = plan.steps.find((s) => s.id === 'branch-a');
			const branchBStep = plan.steps.find((s) => s.id === 'branch-b');
			const mergeStep = plan.steps.find((s) => s.id === 'merge');

			expect(startStep?.dependencies).toEqual([]);
			expect(branchAStep?.dependencies).toEqual(['start']);
			expect(branchBStep?.dependencies).toEqual(['start']);
			expect(mergeStep?.dependencies).toEqual(['branch-a', 'branch-b']);
		});

		it('should detect and reject cyclic dependencies', async () => {
			const cyclicWorkflow = {
				id: 'cyclic-workflow-001',
				name: 'Cyclic Dependency Test',
				steps: {
					'step-a': {
						name: 'Step A',
						type: 'execution',
						agentRequirements: ['executor'],
						estimatedDuration: 1000,
						parameters: {},
						next: 'step-b',
					},
					'step-b': {
						name: 'Step B',
						type: 'execution',
						agentRequirements: ['executor'],
						estimatedDuration: 1000,
						parameters: {},
						next: 'step-c',
					},
					'step-c': {
						name: 'Step C',
						type: 'execution',
						agentRequirements: ['executor'],
						estimatedDuration: 1000,
						parameters: {},
						next: 'step-a', // Creates cycle
					},
				},
			};

			// This will fail until cycle detection is implemented
			await expect(planner.createPlanFromWorkflow(cyclicWorkflow)).rejects.toThrow(/cycle/i);
		});
	});

	describe('Advanced Workflow Optimization', () => {
		it('should optimize workflow for parallel execution', async () => {
			const workflow = {
				id: 'optimization-workflow-001',
				name: 'Optimization Test',
				steps: {
					prep: {
						name: 'Preparation',
						type: 'preparation',
						agentRequirements: ['coordinator'],
						estimatedDuration: 1000,
						parameters: {},
						next: 'task-1',
					},
					'task-1': {
						name: 'Independent Task 1',
						type: 'execution',
						agentRequirements: ['executor'],
						estimatedDuration: 3000,
						parameters: { independent: true },
					},
					'task-2': {
						name: 'Independent Task 2',
						type: 'execution',
						agentRequirements: ['executor'],
						estimatedDuration: 2500,
						parameters: { independent: true },
					},
					'task-3': {
						name: 'Independent Task 3',
						type: 'execution',
						agentRequirements: ['executor'],
						estimatedDuration: 3500,
						parameters: { independent: true },
					},
				},
			};

			// This will fail until optimization is implemented
			const optimizedPlan = await planner.optimizeWorkflow(workflow);

			expect(optimizedPlan.strategy).toBe('parallel');
			expect(optimizedPlan.estimatedDuration).toBeLessThan(8000); // Should be less than sequential sum

			// Should identify independent tasks that can run in parallel
			const independentSteps = optimizedPlan.steps.filter((s) => s.dependencies.length <= 1);
			expect(independentSteps.length).toBeGreaterThanOrEqual(3);
		});

		it('should suggest workflow improvements and bottleneck identification', async () => {
			const bottleneckWorkflow = {
				id: 'bottleneck-workflow-001',
				name: 'Bottleneck Analysis Test',
				steps: {
					'fast-1': {
						name: 'Fast Task 1',
						type: 'execution',
						agentRequirements: ['executor'],
						estimatedDuration: 500,
						parameters: {},
						next: 'bottleneck',
					},
					'fast-2': {
						name: 'Fast Task 2',
						type: 'execution',
						agentRequirements: ['executor'],
						estimatedDuration: 600,
						parameters: {},
						next: 'bottleneck',
					},
					bottleneck: {
						name: 'Slow Bottleneck Task',
						type: 'execution',
						agentRequirements: ['specialized'],
						estimatedDuration: 10000, // Very slow
						parameters: {},
						next: 'final',
					},
					final: {
						name: 'Final Task',
						type: 'finalization',
						agentRequirements: ['coordinator'],
						estimatedDuration: 1000,
						parameters: {},
					},
				},
			};

			// This will fail until bottleneck analysis is implemented
			const analysis = await planner.analyzeWorkflow(bottleneckWorkflow);

			expect(analysis.bottlenecks).toBeDefined();
			expect(analysis.bottlenecks.length).toBeGreaterThan(0);
			expect(analysis.bottlenecks[0].stepId).toBe('bottleneck');
			expect(analysis.criticalPath).toBeDefined();
			expect(analysis.optimizationSuggestions).toBeDefined();
			expect(analysis.optimizationSuggestions.length).toBeGreaterThan(0);
		});
	});

	describe('Resource-Aware Planning', () => {
		it('should create plans that respect resource constraints', async () => {
			const resourceConstrainedWorkflow = {
				id: 'resource-workflow-001',
				name: 'Resource Constraint Test',
				steps: {
					'memory-heavy': {
						name: 'Memory Intensive Task',
						type: 'execution',
						agentRequirements: ['memory-optimized'],
						estimatedDuration: 5000,
						resourceRequirements: {
							memoryMB: 2048,
							cpuPercent: 30,
						},
						parameters: {},
					},
					'cpu-heavy': {
						name: 'CPU Intensive Task',
						type: 'execution',
						agentRequirements: ['cpu-optimized'],
						estimatedDuration: 4000,
						resourceRequirements: {
							memoryMB: 256,
							cpuPercent: 90,
						},
						parameters: {},
					},
				},
			};

			const resourceConstraints = {
				maxMemoryMB: 2048,
				maxCpuPercent: 100,
				maxConcurrentAgents: 2,
			};

			// This will fail until resource-aware planning is implemented
			const plan = await planner.createResourceAwarePlan(
				resourceConstrainedWorkflow,
				resourceConstraints,
			);

			expect(plan.resourceAllocation.memoryMB).toBeLessThanOrEqual(resourceConstraints.maxMemoryMB);
			expect(plan.resourceAllocation.cpuPercent).toBeLessThanOrEqual(
				resourceConstraints.maxCpuPercent,
			);
			expect(plan.steps.length).toBe(2);

			// Should suggest sequential execution due to resource constraints
			expect(plan.strategy).toBe('sequential');
		});

		it('should balance resource utilization across workflow steps', async () => {
			const unbalancedWorkflow = {
				id: 'unbalanced-workflow-001',
				name: 'Resource Balancing Test',
				steps: {
					'light-task': {
						name: 'Light Task',
						type: 'execution',
						agentRequirements: ['general'],
						estimatedDuration: 1000,
						resourceRequirements: {
							memoryMB: 64,
							cpuPercent: 10,
						},
						parameters: {},
					},
					'heavy-task': {
						name: 'Heavy Task',
						type: 'execution',
						agentRequirements: ['general'],
						estimatedDuration: 8000,
						resourceRequirements: {
							memoryMB: 1024,
							cpuPercent: 80,
						},
						parameters: {},
					},
				},
			};

			// This will fail until resource balancing is implemented
			const balancedPlan = await planner.balanceResources(unbalancedWorkflow);

			expect(balancedPlan.resourceAllocation).toBeDefined();
			expect(balancedPlan.steps.every((step) => step.estimatedDuration > 0)).toBe(true);
			expect(balancedPlan.optimizationSuggestions).toBeDefined();
			expect(balancedPlan.optimizationSuggestions.length).toBeGreaterThan(0);
		});
	});

	describe('Dynamic Plan Adaptation', () => {
		it('should adapt plans based on runtime feedback', async () => {
			const originalPlan: ExecutionPlan = {
				id: 'plan-adaptation-001',
				requestId: 'req-adaptation-001',
				strategy: 'parallel',
				estimatedDuration: 5000,
				steps: [
					{
						id: 'step-1',
						type: 'execution',
						agentRequirements: ['executor'],
						dependencies: [],
						estimatedDuration: 2500,
						parameters: {},
					},
					{
						id: 'step-2',
						type: 'execution',
						agentRequirements: ['executor'],
						dependencies: [],
						estimatedDuration: 2500,
						parameters: {},
					},
				],
				resourceAllocation: {
					memoryMB: 512,
					cpuPercent: 60,
					timeoutMs: 6000,
				},
				contingencyPlans: [],
				metadata: {},
			};

			const runtimeFeedback = {
				planId: 'plan-adaptation-001',
				currentStep: 'step-1',
				actualDuration: 4000, // Taking longer than expected
				resourceUsage: {
					memoryMB: 400,
					cpuPercent: 70,
				},
				issues: ['performance_degradation', 'resource_contention'],
			};

			// This will fail until dynamic adaptation is implemented
			const adaptedPlan = await planner.adaptPlan(originalPlan, runtimeFeedback);

			expect(adaptedPlan.id).not.toBe(originalPlan.id); // Should be new plan
			expect(adaptedPlan.estimatedDuration).toBeGreaterThan(originalPlan.estimatedDuration);
			expect(adaptedPlan.strategy).toBe('sequential'); // Should adapt to sequential for reliability
			expect(adaptedPlan.metadata.adaptationReason).toBeDefined();
		});

		it('should handle step failures with contingency plans', async () => {
			const planWithContingencies: ExecutionPlan = {
				id: 'plan-contingency-001',
				requestId: 'req-contingency-001',
				strategy: 'hierarchical',
				estimatedDuration: 8000,
				steps: [
					{
						id: 'risky-step',
						type: 'execution',
						agentRequirements: ['specialized'],
						dependencies: [],
						estimatedDuration: 5000,
						parameters: { riskLevel: 'high' },
					},
					{
						id: 'safe-step',
						type: 'execution',
						agentRequirements: ['general'],
						dependencies: ['risky-step'],
						estimatedDuration: 3000,
						parameters: {},
					},
				],
				resourceAllocation: {
					memoryMB: 1024,
					cpuPercent: 75,
					timeoutMs: 10000,
				},
				contingencyPlans: [
					{
						triggerCondition: 'step_failure',
						affectedSteps: ['risky-step'],
						fallbackSteps: [
							{
								id: 'fallback-step',
								type: 'execution',
								agentRequirements: ['general'],
								dependencies: [],
								estimatedDuration: 6000,
								parameters: { fallback: true },
							},
						],
						estimatedDelay: 1000,
					},
				],
				metadata: {},
			};

			const stepFailure = {
				stepId: 'risky-step',
				error: 'agent_timeout',
				timestamp: new Date().toISOString(),
			};

			// This will fail until contingency handling is implemented
			const recoveredPlan = await planner.executeContingency(planWithContingencies, stepFailure);

			expect(recoveredPlan.steps.some((s) => s.id === 'fallback-step')).toBe(true);
			expect(recoveredPlan.steps.some((s) => s.id === 'risky-step')).toBe(false);
			expect(recoveredPlan.estimatedDuration).toBeGreaterThan(
				planWithContingencies.estimatedDuration,
			);
		});
	});

	describe('Advanced DAG Operations', () => {
		it('should perform topological sorting for complex workflows', async () => {
			const complexWorkflow = {
				id: 'complex-dag-001',
				name: 'Complex DAG Test',
				steps: {
					a: {
						name: 'Step A',
						type: 'execution',
						agentRequirements: ['general'],
						estimatedDuration: 1000,
						parameters: {},
						next: 'c',
					},
					b: {
						name: 'Step B',
						type: 'execution',
						agentRequirements: ['general'],
						estimatedDuration: 1000,
						parameters: {},
						next: 'c',
					},
					c: {
						name: 'Step C',
						type: 'execution',
						agentRequirements: ['general'],
						estimatedDuration: 1000,
						parameters: {},
						branches: [
							{ to: 'd', condition: 'always' },
							{ to: 'e', condition: 'always' },
						],
					},
					d: {
						name: 'Step D',
						type: 'execution',
						agentRequirements: ['general'],
						estimatedDuration: 1000,
						parameters: {},
						next: 'f',
					},
					e: {
						name: 'Step E',
						type: 'execution',
						agentRequirements: ['general'],
						estimatedDuration: 1000,
						parameters: {},
						next: 'f',
					},
					f: {
						name: 'Step F',
						type: 'execution',
						agentRequirements: ['general'],
						estimatedDuration: 1000,
						parameters: {},
					},
				},
			};

			// This will fail until advanced DAG operations are implemented
			const plan = await planner.createPlanFromWorkflow(complexWorkflow);
			const topologicalOrder = await planner.getTopologicalOrder(plan);

			expect(topologicalOrder).toBeDefined();
			expect(topologicalOrder.length).toBe(6);

			// Verify topological constraints
			const aIndex = topologicalOrder.indexOf('a');
			const cIndex = topologicalOrder.indexOf('c');
			const fIndex = topologicalOrder.indexOf('f');

			expect(aIndex).toBeLessThan(cIndex);
			expect(cIndex).toBeLessThan(fIndex);
		});

		it('should calculate critical path and execution time estimates', async () => {
			const timedWorkflow = {
				id: 'timed-workflow-001',
				name: 'Critical Path Test',
				steps: {
					start: {
						name: 'Start',
						type: 'initialization',
						agentRequirements: ['coordinator'],
						estimatedDuration: 500,
						parameters: {},
						branches: [
							{ to: 'path-a', condition: 'always' },
							{ to: 'path-b', condition: 'always' },
						],
					},
					'path-a': {
						name: 'Path A',
						type: 'execution',
						agentRequirements: ['executor'],
						estimatedDuration: 3000,
						parameters: {},
						next: 'end',
					},
					'path-b': {
						name: 'Path B',
						type: 'execution',
						agentRequirements: ['executor'],
						estimatedDuration: 5000,
						parameters: {},
						next: 'end',
					},
					end: {
						name: 'End',
						type: 'finalization',
						agentRequirements: ['coordinator'],
						estimatedDuration: 1000,
						parameters: {},
					},
				},
			};

			// This will fail until critical path analysis is implemented
			const analysis = await planner.analyzeCriticalPath(timedWorkflow);

			expect(analysis.criticalPath).toBeDefined();
			expect(analysis.criticalPath).toEqual(['start', 'path-b', 'end']); // Longest path
			expect(analysis.totalDuration).toBe(6500); // 500 + 5000 + 1000
			expect(analysis.parallelizableSteps).toBeDefined();
			expect(analysis.parallelizableSteps.includes('path-a')).toBe(true);
			expect(analysis.parallelizableSteps.includes('path-b')).toBe(true);
		});
	});

	describe('Integration with nO Architecture', () => {
		it('should integrate with StrategySelector for optimal planning', async () => {
			const workflow = {
				id: 'integration-workflow-001',
				name: 'nO Integration Test',
				steps: {
					'complex-analysis': {
						name: 'Complex Analysis',
						type: 'analysis',
						agentRequirements: ['analyst'],
						estimatedDuration: 8000,
						resourceRequirements: {
							memoryMB: 1024,
							cpuPercent: 60,
						},
						parameters: { complexity: 0.8 },
					},
				},
			};

			// This will fail until nO integration is implemented
			const integratedPlan = await planner.createIntegratedPlan(workflow, {
				useStrategySelector: true,
				optimizeResources: true,
				enableTelemetry: true,
			});

			expect(integratedPlan.strategy).toBeDefined();
			expect(integratedPlan.resourceAllocation).toBeDefined();
			expect(integratedPlan.metadata.strategyReasoning).toBeDefined();
			expect(integratedPlan.metadata.resourceOptimization).toBeDefined();
		});

		it('should emit telemetry events during planning process', async () => {
			const workflow = {
				id: 'telemetry-workflow-001',
				name: 'Telemetry Test',
				steps: {
					'monitored-step': {
						name: 'Monitored Step',
						type: 'execution',
						agentRequirements: ['executor'],
						estimatedDuration: 3000,
						parameters: {},
					},
				},
			};

			// This will fail until telemetry integration is implemented
			const telemetryEvents: any[] = [];
			const planWithTelemetry = await planner.createPlanWithTelemetry(workflow, {
				onEvent: (event: any) => telemetryEvents.push(event),
			});

			expect(planWithTelemetry).toBeDefined();
			expect(telemetryEvents.length).toBeGreaterThan(0);
			expect(telemetryEvents.some((e) => e.eventType === 'workflow_planning_started')).toBe(true);
			expect(telemetryEvents.some((e) => e.eventType === 'workflow_planning_completed')).toBe(true);
		});
	});
});
