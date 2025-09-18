import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ASBRAIIntegration } from '../../asbr-ai-integration.js';
import { ModelSelector } from '../../lib/model-selector.js';
import { PRPLangGraphWorkflow } from '../../lib/prp-langgraph-workflow.js';

// Mock dependencies
vi.mock('../../asbr-ai-integration.js');
vi.mock('../../lib/model-selector.js');
vi.mock('../../gates/base.js');

describe('PRPLangGraphWorkflow Integration', () => {
	let workflow: PRPLangGraphWorkflow;
	let mockAIIntegration: any;
	let mockModelSelector: any;

	beforeEach(() => {
		// Setup mocks
		mockAIIntegration = {
			collectEnhancedEvidence: vi.fn().mockResolvedValue({
				originalEvidence: { id: 'test-evidence', claim: 'Test claim' },
			}),
		};

		mockModelSelector = {
			selectOptimalModel: vi.fn().mockReturnValue({
				id: 'test-model',
				provider: 'mlx',
				priority: 10,
			}),
		};

		// Mock gate execution
		vi.doMock('../../gates/base.js', () => ({
			createGate: vi.fn().mockReturnValue({
				execute: vi.fn().mockResolvedValue({ success: true }),
			}),
		}));

		workflow = new PRPLangGraphWorkflow(mockAIIntegration, mockModelSelector);
	});

	describe('execute', () => {
		it('should execute complete PRP workflow', async () => {
			const prp = {
				goal: 'Test PRP goal',
				requirements: ['Requirement 1', 'Requirement 2'],
			};

			const result = await workflow.execute(prp);

			expect(result.status).toBe('completed');
			expect(result.gates).toBeDefined();
			expect(result.evidence).toHaveLength(1);
			expect(result.insights).toBeDefined();
		});

		it('should handle gate failures gracefully', async () => {
			// Mock a gate failure
			vi.doMock('../../gates/base.js', () => ({
				createGate: vi.fn().mockReturnValue({
					execute: vi.fn().mockRejectedValue(new Error('Gate failed')),
				}),
			}));

			// Re-create workflow with new mock
			workflow = new PRPLangGraphWorkflow(mockAIIntegration, mockModelSelector);

			const prp = { goal: 'Test PRP' };
			const result = await workflow.execute(prp);

			expect(result.status).toBe('failed');
			expect(result.error).toBeDefined();
		});

		it('should collect evidence when gates pass', async () => {
			const prp = { goal: 'Test PRP' };
			const result = await workflow.execute(prp);

			expect(mockAIIntegration.collectEnhancedEvidence).toHaveBeenCalled();
			expect(result.evidence).toHaveLength.greaterThan(0);
		});

		it('should select optimal model for execution', async () => {
			const prp = { goal: 'Test PRP' };
			await workflow.execute(prp);

			expect(mockModelSelector.selectOptimalModel).toHaveBeenCalledWith('prp-analysis', undefined, [
				'code-analysis',
				'documentation',
			]);
		});

		it('should track execution time', async () => {
			const prp = { goal: 'Test PRP' };
			const result = await workflow.execute(prp);

			expect(result.startTime).toBeDefined();
			expect(result.endTime).toBeDefined();
			expect(result.totalExecutionTime).toBeGreaterThan(0);
		});
	});

	describe('gate execution', () => {
		it('should execute gates in sequence', async () => {
			const prp = { goal: 'Test PRP' };
			const result = await workflow.execute(prp);

			// Check that all gates were executed
			const gateIds = Object.keys(result.gates);
			expect(gateIds).toContain('g0-ideation');
			expect(gateIds).toContain('g1-architecture');
			expect(gateIds).toContain('g7-release');
		});

		it('should mark gates with appropriate status', async () => {
			const prp = { goal: 'Test PRP' };
			const result = await workflow.execute(prp);

			// Check gate statuses
			Object.values(result.gates).forEach((gate) => {
				expect(['passed', 'failed', 'pending']).toContain(gate.status);
			});
		});
	});

	describe('error handling', () => {
		it('should handle model selection failure', async () => {
			mockModelSelector.selectOptimalModel.mockReturnValue(null);

			const prp = { goal: 'Test PRP' };
			const result = await workflow.execute(prp);

			expect(result.status).toBe('failed');
			expect(result.error).toContain('No suitable model found');
		});

		it('should handle evidence collection failure', async () => {
			mockAIIntegration.collectEnhancedEvidence.mockRejectedValue(new Error('Evidence failed'));

			const prp = { goal: 'Test PRP' };
			const result = await workflow.execute(prp);

			// Should complete without evidence
			expect(result.status).toBe('completed');
			expect(result.evidence).toHaveLength(0);
		});
	});

	describe('workflow visualization', () => {
		it('should return graph visualization', () => {
			const visualization = workflow.getGraphVisualization();

			expect(visualization).toContain('PRP Workflow Graph');
			expect(visualization).toContain('initialize');
			expect(visualization).toContain('executeGate');
			expect(visualization).toContain('complete');
		});
	});
});
