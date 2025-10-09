/**
 * Phase 2: Persistence Layer Tests
 * Following TDD: Tests verify implementation
 */

import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMockWorkflow } from '../../__tests__/setup.test.js';
import {
	close,
	createDatabase,
	getWorkflow,
	type StepData,
	saveStep,
	saveWorkflow,
	upsertMetrics,
} from '../sqlite.js';

describe('SQLite Persistence', () => {
	let db: Database.Database;

	beforeEach(async () => {
		db = createDatabase(':memory:'); // In-memory for tests
	});

	afterEach(async () => {
		await close(db);
	});

	describe('Database Creation', () => {
		it('should create workflows table with correct schema', () => {
			const tables = db
				.prepare("SELECT name FROM sqlite_master WHERE type='table'")
				.all() as Array<{ name: string }>;
			const tableNames = tables.map((t) => t.name);

			expect(tableNames).toContain('workflows');
			expect(tableNames).toContain('gates');
			expect(tableNames).toContain('phases');
			expect(tableNames).toContain('evidence');
			expect(tableNames).toContain('metrics');
		});

		it('should include branding column in workflows table', () => {
			const columns = db.prepare("PRAGMA table_info('workflows')").all() as Array<{ name: string }>;
			const columnNames = columns.map((c) => c.name);

			expect(columnNames).toContain('branding');
		});

		it('should set brAInwav branding in schema metadata', () => {
			const metadata = db
				.prepare("SELECT value FROM schema_metadata WHERE key = 'branding'")
				.get() as { value: string };

			expect(metadata.value).toBe('brAInwav');
		});
	});

	describe('Workflow CRUD', () => {
		it('should save and retrieve workflow by ID', async () => {
			const workflow = createMockWorkflow();
			await saveWorkflow(db, workflow);

			const loaded = await getWorkflow(db, workflow.id);

			expect(loaded).not.toBeNull();
			expect(loaded?.id).toBe(workflow.id);
			expect(loaded?.metadata.branding).toBe('brAInwav');
		});

		it('should update existing workflow', async () => {
			const workflow = createMockWorkflow();
			await saveWorkflow(db, workflow);

			workflow.status = 'completed';
			await saveWorkflow(db, workflow);

			const loaded = await getWorkflow(db, workflow.id);
			expect(loaded?.status).toBe('completed');
		});

		it('should return null for non-existent workflow', async () => {
			const loaded = await getWorkflow(db, 'non-existent');
			expect(loaded).toBeNull();
		});

		it('should NOT store secrets in state', async () => {
			const workflow = createMockWorkflow();
			// Attempt to store secrets (should be redacted)
			(workflow.metadata as any).secrets = { apiKey: 'secret-123' };
			(workflow.metadata as any).password = 'super-secret';

			await saveWorkflow(db, workflow);
			const loaded = await getWorkflow(db, workflow.id);

			expect((loaded?.metadata as any).secrets).toBeUndefined();
			expect((loaded?.metadata as any).password).toBeUndefined();
		});

		it('should preserve brAInwav branding in metadata', async () => {
			const workflow = createMockWorkflow({
				metadata: {
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					gitBranch: 'feat/test',
					branding: 'brAInwav',
					customField: 'value',
				},
			});

			await saveWorkflow(db, workflow);
			const loaded = await getWorkflow(db, workflow.id);

			expect(loaded?.metadata.branding).toBe('brAInwav');
			expect((loaded?.metadata as any).customField).toBe('value');
		});
	});

	describe('Step Persistence', () => {
		it('should save gate step with evidence', async () => {
			const workflow = createMockWorkflow();
			await saveWorkflow(db, workflow);

			const step: StepData = {
				workflowId: workflow.id,
				type: 'gate',
				stepId: 'G0',
				status: 'completed',
				evidence: ['tasks/test/prp-blueprint.md'],
				startedAt: new Date().toISOString(),
				completedAt: new Date().toISOString(),
			};

			await saveStep(db, step);

			const steps = db.prepare('SELECT * FROM gates WHERE workflowId = ?').all(workflow.id);

			expect(steps).toHaveLength(1);
			expect((steps[0] as any).stepId).toBe('G0');
		});

		it('should save phase step with artifacts', async () => {
			const workflow = createMockWorkflow();
			await saveWorkflow(db, workflow);

			const step: StepData = {
				workflowId: workflow.id,
				type: 'phase',
				stepId: '0',
				status: 'completed',
				evidence: ['tasks/test/constitution.md'],
				startedAt: new Date().toISOString(),
				completedAt: new Date().toISOString(),
			};

			await saveStep(db, step);

			const steps = db.prepare('SELECT * FROM phases WHERE workflowId = ?').all(workflow.id);

			expect(steps).toHaveLength(1);
			expect((steps[0] as any).stepId).toBe(0); // Stored as INTEGER
		});

		it('should allow multiple gates for same workflow', async () => {
			const workflow = createMockWorkflow();
			await saveWorkflow(db, workflow);

			await saveStep(db, {
				workflowId: workflow.id,
				type: 'gate',
				stepId: 'G0',
				status: 'completed',
				evidence: ['file1.md'],
			});

			await saveStep(db, {
				workflowId: workflow.id,
				type: 'gate',
				stepId: 'G1',
				status: 'in-progress',
				evidence: [],
			});

			const steps = db.prepare('SELECT * FROM gates WHERE workflowId = ?').all(workflow.id);

			expect(steps).toHaveLength(2);
		});
	});

	describe('Metrics Storage', () => {
		it('should upsert quality metrics', async () => {
			const workflow = createMockWorkflow();
			await saveWorkflow(db, workflow);

			await upsertMetrics(db, workflow.id, {
				coverage: 96,
				security: { critical: 0, high: 0, medium: 2 },
				performance: { lcp: 2100, tbt: 250 },
				accessibility: 92,
			});

			const metrics = db
				.prepare('SELECT * FROM metrics WHERE workflowId = ?')
				.get(workflow.id) as any;

			expect(metrics.coverage).toBe(96);
			expect(metrics.accessibility).toBe(92);

			const security = JSON.parse(metrics.security);
			expect(security.critical).toBe(0);
		});

		it('should update existing metrics', async () => {
			const workflow = createMockWorkflow();
			await saveWorkflow(db, workflow);

			await upsertMetrics(db, workflow.id, {
				coverage: 95,
				security: { critical: 0, high: 0, medium: 0 },
				performance: { lcp: 2500, tbt: 300 },
				accessibility: 90,
			});

			// Update metrics
			await upsertMetrics(db, workflow.id, {
				coverage: 98,
				security: { critical: 0, high: 0, medium: 0 },
				performance: { lcp: 2000, tbt: 200 },
				accessibility: 95,
			});

			const metrics = db
				.prepare('SELECT * FROM metrics WHERE workflowId = ?')
				.get(workflow.id) as any;

			expect(metrics.coverage).toBe(98);
			expect(metrics.accessibility).toBe(95);
		});
	});
});
