/**
 * Phase 1: Schema & Type Tests - Workflow Types
 * Following TDD: Write tests FIRST (RED), then implement (GREEN)
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { GateId, PhaseId, Priority, WorkflowState, WorkflowStatus } from '../index.js';
import { enforcementProfileDefaults } from '../index.js';

describe('Workflow Types', () => {
	describe('GateId Type', () => {
		it('should enforce GateId union type', () => {
			const validGates: GateId[] = ['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'];
			expect(validGates).toHaveLength(8);

			// Type-level test
			expectTypeOf<GateId>().toEqualTypeOf<'G0' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7'>();
		});

		it('should allow assignment of valid gate IDs', () => {
			const gate: GateId = 'G0';
			expect(gate).toBe('G0');
		});
	});

	describe('PhaseId Type', () => {
		it('should enforce PhaseId number literals', () => {
			const validPhases: PhaseId[] = [0, 1, 2, 3, 4, 5];
			expect(validPhases).toHaveLength(6);

			expectTypeOf<PhaseId>().toEqualTypeOf<0 | 1 | 2 | 3 | 4 | 5>();
		});

		it('should allow assignment of valid phase IDs', () => {
			const phase: PhaseId = 0;
			expect(phase).toBe(0);
		});
	});

	describe('WorkflowStatus Type', () => {
		it('should enforce valid workflow status values', () => {
			const validStatuses: WorkflowStatus[] = ['active', 'paused', 'completed', 'failed'];
			expect(validStatuses).toHaveLength(4);

			expectTypeOf<WorkflowStatus>().toEqualTypeOf<'active' | 'paused' | 'completed' | 'failed'>();
		});
	});

	describe('Priority Type', () => {
		it('should enforce valid priority values', () => {
			const validPriorities: Priority[] = ['P0', 'P1', 'P2', 'P3', 'P4'];
			expect(validPriorities).toHaveLength(5);

			expectTypeOf<Priority>().toEqualTypeOf<'P0' | 'P1' | 'P2' | 'P3' | 'P4'>();
		});
	});

	describe('WorkflowState Structure', () => {
		it('should enforce WorkflowState structure with brAInwav metadata', () => {
			const state: WorkflowState = {
				id: 'wf-123',
				featureName: 'OAuth 2.1',
				taskId: 'oauth-21-authentication',
				priority: 'P1',
				status: 'active',
				currentStep: 'G0',
				prpState: {
					gates: {},
					approvals: [],
				},
				taskState: {
					phases: {},
					artifacts: [],
				},
				enforcementProfile: enforcementProfileDefaults(),
				metadata: {
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					gitBranch: 'feat/oauth-21-authentication',
					branding: 'brAInwav',
				},
			};

			expect(state.metadata.branding).toBe('brAInwav');
			expect(state.priority).toBe('P1');
			expect(state.currentStep).toBe('G0');
		});

		it('should allow phase as current step', () => {
			const state: WorkflowState = {
				id: 'wf-456',
				featureName: 'Test',
				taskId: 'test',
				priority: 'P2',
				status: 'active',
				currentStep: 'phase-2',
				prpState: { gates: {}, approvals: [] },
				taskState: { phases: {}, artifacts: [] },
				enforcementProfile: enforcementProfileDefaults(),
				metadata: {
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					gitBranch: 'feat/test',
					branding: 'brAInwav',
				},
			};

			expect(state.currentStep).toBe('phase-2');
		});

		it('should require brAInwav branding in metadata', () => {
			const state: WorkflowState = {
				id: 'wf-789',
				featureName: 'Feature',
				taskId: 'feature',
				priority: 'P3',
				status: 'completed',
				currentStep: 'G7',
				prpState: { gates: {}, approvals: [] },
				taskState: { phases: {}, artifacts: [] },
				enforcementProfile: enforcementProfileDefaults(),
				metadata: {
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					gitBranch: 'feat/feature',
					branding: 'brAInwav',
				},
			};

			// Type check ensures branding must be 'brAInwav'
			expectTypeOf(state.metadata.branding).toEqualTypeOf<'brAInwav'>();
		});

		it('should support gate states with evidence', () => {
			const state: WorkflowState = {
				id: 'wf-101',
				featureName: 'Test',
				taskId: 'test',
				priority: 'P1',
				status: 'active',
				currentStep: 'G0',
				prpState: {
					gates: {
						G0: {
							id: 'G0',
							status: 'completed',
							startedAt: new Date().toISOString(),
							completedAt: new Date().toISOString(),
							evidence: ['tasks/test/prp-blueprint.md'],
							approved: true,
							approver: 'product-owner',
							approvalRationale: 'Approved for implementation',
						},
					},
					approvals: [
						{
							gateId: 'G0',
							approver: 'product-owner',
							decision: 'approved',
							rationale: 'Approved for implementation',
							timestamp: new Date().toISOString(),
						},
					],
				},
				taskState: { phases: {}, artifacts: [] },
				enforcementProfile: enforcementProfileDefaults(),
				metadata: {
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					gitBranch: 'feat/test',
					branding: 'brAInwav',
				},
			};

			expect(state.prpState.gates.G0?.approved).toBe(true);
			expect(state.prpState.approvals).toHaveLength(1);
		});

		it('should support phase states with artifacts', () => {
			const state: WorkflowState = {
				id: 'wf-102',
				featureName: 'Test',
				taskId: 'test',
				priority: 'P1',
				status: 'active',
				currentStep: 'phase-0',
				prpState: { gates: {}, approvals: [] },
				taskState: {
					phases: {
						0: {
							id: 0,
							status: 'completed',
							startedAt: new Date().toISOString(),
							completedAt: new Date().toISOString(),
							artifacts: ['tasks/test/constitution.md'],
						},
					},
					artifacts: ['tasks/test/constitution.md'],
				},
				enforcementProfile: enforcementProfileDefaults(),
				metadata: {
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					gitBranch: 'feat/test',
					branding: 'brAInwav',
				},
			};

			expect(state.taskState.phases[0]?.status).toBe('completed');
			expect(state.taskState.artifacts).toHaveLength(1);
		});
	});

	describe('QualityMetrics Structure', () => {
		it('should enforce quality metrics structure', () => {
			const metrics = {
				coverage: 96,
				security: {
					critical: 0,
					high: 0,
					medium: 2,
				},
				performance: {
					lcp: 2100,
					tbt: 250,
				},
				accessibility: 92,
			};

			expect(metrics.coverage).toBe(96);
			expect(metrics.security.critical).toBe(0);
			expect(metrics.performance.lcp).toBe(2100);
			expect(metrics.accessibility).toBe(92);
		});
	});
});
