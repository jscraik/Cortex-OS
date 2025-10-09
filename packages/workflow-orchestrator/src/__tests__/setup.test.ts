import type { WorkflowState } from '@cortex-os/workflow-common';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

/**
 * Phase 0: Test Infrastructure Setup
 * Tests that verify the testing environment is properly configured
 */
describe('Test Infrastructure', () => {
	it('should load Vitest configuration', () => {
		// Meta-test to verify test runner works
		expect(true).toBe(true);
	});

	it('should connect to in-memory SQLite', async () => {
		const db = new Database(':memory:');
		expect(db).toBeDefined();

		// Verify we can create a table
		db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');

		// Verify we can insert and query
		db.exec("INSERT INTO test (name) VALUES ('brAInwav')");
		const result = db.prepare('SELECT name FROM test').get() as { name: string };

		expect(result.name).toBe('brAInwav');
		db.close();
	});

	it('should provide test fixtures', () => {
		const mockWorkflow = createMockWorkflow();
		expect(mockWorkflow.id).toBeDefined();
		expect(mockWorkflow.metadata.branding).toBe('brAInwav');
	});
});

/**
 * Test fixture helper: Create a mock workflow state for testing
 */
export function createMockWorkflow(overrides?: Partial<WorkflowState>): WorkflowState {
	return {
		id: `wf-${Date.now()}`,
		featureName: 'Test Feature',
		taskId: 'test-feature',
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
		enforcementProfile: {
			branding: 'brAInwav',
			version: '1.0.0',
			budgets: {
				coverage: {
					lines: 95,
					branches: 95,
					functions: 95,
					statements: 95,
				},
				performance: {
					lcp: 2500,
					tbt: 300,
				},
				accessibility: {
					score: 90,
					wcagLevel: 'AA',
					wcagVersion: '2.2',
				},
				security: {
					maxCritical: 0,
					maxHigh: 0,
					maxMedium: 5,
				},
			},
			policies: {
				architecture: {
					maxFunctionLines: 40,
					exportStyle: 'named-only',
				},
				governance: {
					requiredChecks: ['lint', 'type-check', 'test', 'security-scan'],
				},
			},
			approvers: {
				G0: 'product-owner',
				G1: 'architect',
				G2: 'qa-lead',
			},
		},
		metadata: {
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			gitBranch: 'feat/test-feature',
			branding: 'brAInwav',
		},
		...overrides,
	};
}

/**
 * Test helper: Create a test database with schema
 */
export function createTestDatabase(): Database.Database {
	const db = new Database(':memory:');

	// Initialize schema (simplified version for testing)
	db.exec(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      featureName TEXT NOT NULL,
      taskId TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      currentStep TEXT NOT NULL,
      state TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      branding TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS gates (
      workflowId TEXT NOT NULL,
      stepId TEXT NOT NULL,
      status TEXT NOT NULL,
      evidence TEXT,
      startedAt TEXT,
      completedAt TEXT,
      PRIMARY KEY (workflowId, stepId),
      FOREIGN KEY (workflowId) REFERENCES workflows(id)
    );
    
    CREATE TABLE IF NOT EXISTS phases (
      workflowId TEXT NOT NULL,
      stepId TEXT NOT NULL,
      status TEXT NOT NULL,
      evidence TEXT,
      startedAt TEXT,
      completedAt TEXT,
      PRIMARY KEY (workflowId, stepId),
      FOREIGN KEY (workflowId) REFERENCES workflows(id)
    );
    
    CREATE TABLE IF NOT EXISTS metrics (
      workflowId TEXT PRIMARY KEY,
      coverage REAL,
      security TEXT,
      performance TEXT,
      accessibility REAL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (workflowId) REFERENCES workflows(id)
    );
  `);

	return db;
}
