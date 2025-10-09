/**
 * Phase 3: Property-Based Tests for State Machine Invariants
 * Using fast-check to verify workflow engine maintains correctness properties
 */

import type Database from 'better-sqlite3';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { close, createDatabase } from '../../persistence/sqlite.js';
import { WorkflowEngine } from '../WorkflowEngine.js';

describe('WorkflowEngine - Property-Based Tests', () => {
	let db: Database.Database;

	beforeEach(() => {
		db = createDatabase(':memory:');
	});

	afterEach(async () => {
		await close(db);
	});

	it('should maintain invariant: steps strictly advance (never backwards)', async () => {
		// This test will verify the engine never goes backwards in the workflow
		// For now, we'll create a simpler version that tests the principle

		const _result = await fc.assert(
			fc.asyncProperty(fc.constantFrom('test-1', 'test-2', 'test-3'), async (taskId) => {
				const engine = new WorkflowEngine(db);

				// Execute workflow should always progress forward
				const result = await engine.executeWorkflow({
					taskId,
					skipApprovals: true,
				});

				// Verify gates are in order
				const gateIds = result.completedGates;
				for (let i = 1; i < gateIds.length; i++) {
					const prevIndex = parseInt(gateIds[i - 1].replace('G', ''), 10);
					const currIndex = parseInt(gateIds[i].replace('G', ''), 10);
					expect(currIndex).toBeGreaterThan(prevIndex);
				}

				// Verify phases are in order
				const phaseIds = result.completedPhases;
				for (let i = 1; i < phaseIds.length; i++) {
					expect(phaseIds[i]).toBeGreaterThan(phaseIds[i - 1]);
				}
			}),
			{ numRuns: 10 }, // Reduced runs for faster testing
		);
	});

	it('should maintain invariant: workflow ID is unique per task', async () => {
		await fc.assert(
			fc.asyncProperty(fc.string({ minLength: 1, maxLength: 20 }), async (taskId) => {
				const engine = new WorkflowEngine(db);

				const result1 = await engine.executeWorkflow({
					taskId: `unique-${taskId}`,
					skipApprovals: true,
				});

				// Same task should resume, not create new workflow
				const result2 = await engine.executeWorkflow({
					taskId: `unique-${taskId}`,
					resume: true,
					skipApprovals: true,
				});

				// Should be same workflow ID
				expect(result1.workflowId).toBe(result2.workflowId);
			}),
			{ numRuns: 10 },
		);
	});

	it('should maintain invariant: brAInwav branding always present', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.record({
					taskId: fc.string({ minLength: 1, maxLength: 20 }),
					priority: fc.constantFrom('P0', 'P1', 'P2', 'P3', 'P4'),
				}),
				async ({ taskId, priority }) => {
					const engine = new WorkflowEngine(db);

					const result = await engine.executeWorkflow({
						taskId: `brand-${taskId}`,
						priority,
						skipApprovals: true,
					});

					// Check database for branding
					const workflow = db
						.prepare('SELECT branding FROM workflows WHERE id = ?')
						.get(result.workflowId) as { branding: string } | undefined;

					expect(workflow?.branding).toBe('brAInwav');
				},
			),
			{ numRuns: 10 },
		);
	});

	it('should maintain invariant: dry run leaves no persistent state', async () => {
		await fc.assert(
			fc.asyncProperty(fc.string({ minLength: 1, maxLength: 20 }), async (taskId) => {
				const engine = new WorkflowEngine(db);

				await engine.executeWorkflow({
					taskId: `dry-${taskId}`,
					dryRun: true,
					skipApprovals: true,
				});

				// Verify no workflow in database
				const workflow = db
					.prepare('SELECT * FROM workflows WHERE taskId = ?')
					.get(`dry-${taskId}`);

				expect(workflow).toBeUndefined();
			}),
			{ numRuns: 10 },
		);
	});
});
