/**
 * @file packages/workflow-orchestrator/src/persistence/sqlite.ts
 * @description SQLite persistence layer for workflow state
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 *
 * brAInwav Standards:
 * - Functions ≤40 lines
 * - Named exports only
 * - Secret redaction enforced
 * - Async façades via queueMicrotask
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { QualityMetrics, WorkflowState } from '@cortex-os/workflow-common';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Create or open SQLite database with schema initialization
 */
export function createDatabase(path: string): Database.Database {
	const db = new Database(path);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');

	// Run migrations
	const migrationSQL = readFileSync(join(__dirname, 'migrations', '001_init.sql'), 'utf-8');
	db.exec(migrationSQL);

	return db;
}

/**
 * Redact secrets from workflow state before persistence
 */
export function redactSecrets(state: WorkflowState): WorkflowState {
	const clean = { ...state };

	// Remove any secret-like metadata keys
	if (clean.metadata) {
		const { secrets, apiKey, token, password, ...safeMetadata } = clean.metadata as any;
		clean.metadata = safeMetadata;
	}

	return clean;
}

/**
 * Close database connection
 */
export async function close(db: Database.Database): Promise<void> {
	return new Promise((resolve) => {
		queueMicrotask(() => {
			db.close();
			resolve();
		});
	});
}

/**
 * Save workflow state to database
 */
export async function saveWorkflow(db: Database.Database, workflow: WorkflowState): Promise<void> {
	return new Promise((resolve, reject) => {
		queueMicrotask(() => {
			try {
				const cleaned = redactSecrets(workflow);

				const stmt = db.prepare(`
					INSERT OR REPLACE INTO workflows (
						id, featureName, taskId, priority, status,
						currentStep, state, createdAt, updatedAt, branding
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`);

				stmt.run(
					cleaned.id,
					cleaned.featureName,
					cleaned.taskId,
					cleaned.priority,
					cleaned.status,
					cleaned.currentStep,
					JSON.stringify(cleaned),
					cleaned.metadata.createdAt,
					cleaned.metadata.updatedAt,
					cleaned.metadata.branding,
				);

				resolve();
			} catch (error) {
				reject(error);
			}
		});
	});
}

/**
 * Retrieve workflow state by ID
 */
export async function getWorkflow(
	db: Database.Database,
	id: string,
): Promise<WorkflowState | null> {
	return new Promise((resolve, reject) => {
		queueMicrotask(() => {
			try {
				const stmt = db.prepare('SELECT state FROM workflows WHERE id = ?');
				const row = stmt.get(id) as { state: string } | undefined;

				if (!row) {
					resolve(null);
					return;
				}

				const workflow = JSON.parse(row.state) as WorkflowState;
				resolve(workflow);
			} catch (error) {
				reject(error);
			}
		});
	});
}

/**
 * List all workflows
 */
export async function listWorkflows(db: Database.Database): Promise<WorkflowState[]> {
	return new Promise((resolve, reject) => {
		queueMicrotask(() => {
			try {
				const stmt = db.prepare('SELECT state FROM workflows ORDER BY updatedAt DESC');
				const rows = stmt.all() as { state: string }[];

				const workflows = rows.map((row) => JSON.parse(row.state) as WorkflowState);
				resolve(workflows);
			} catch (error) {
				reject(error);
			}
		});
	});
}

/**
 * Retrieve workflow state by task ID
 */
export async function getWorkflowByTaskId(
	db: Database.Database,
	taskId: string,
): Promise<WorkflowState | null> {
	return new Promise((resolve, reject) => {
		queueMicrotask(() => {
			try {
				const stmt = db.prepare('SELECT state FROM workflows WHERE taskId = ?');
				const row = stmt.get(taskId) as { state: string } | undefined;

				if (!row) {
					resolve(null);
					return;
				}

				const workflow = JSON.parse(row.state) as WorkflowState;
				resolve(workflow);
			} catch (error) {
				reject(error);
			}
		});
	});
}

/**
 * Step data for gate or phase persistence
 */
export interface StepData {
	workflowId: string;
	type: 'gate' | 'phase';
	stepId: string;
	status: 'pending' | 'in-progress' | 'completed' | 'failed';
	evidence: string[];
	startedAt?: string;
	completedAt?: string;
}

/**
 * Save step (gate or phase) to database
 */
export async function saveStep(db: Database.Database, step: StepData): Promise<void> {
	return new Promise((resolve, reject) => {
		queueMicrotask(() => {
			try {
				const table = step.type === 'gate' ? 'gates' : 'phases';
				const evidenceColumn = step.type === 'gate' ? 'evidence' : 'artifacts';
				const evidenceJSON = JSON.stringify(step.evidence);

				const stmt = db.prepare(`
					INSERT OR REPLACE INTO ${table} (
						workflowId, stepId, status, ${evidenceColumn}, startedAt, completedAt
					) VALUES (?, ?, ?, ?, ?, ?)
				`);

				stmt.run(
					step.workflowId,
					step.stepId,
					step.status,
					evidenceJSON,
					step.startedAt || null,
					step.completedAt || null,
				);

				resolve();
			} catch (error) {
				reject(error);
			}
		});
	});
}

/**
 * Upsert quality metrics for a workflow
 */
export async function upsertMetrics(
	db: Database.Database,
	workflowId: string,
	metrics: QualityMetrics,
): Promise<void> {
	return new Promise((resolve, reject) => {
		queueMicrotask(() => {
			try {
				const stmt = db.prepare(`
					INSERT OR REPLACE INTO metrics (
						workflowId, coverage, security, performance,
						accessibility, updatedAt
					) VALUES (?, ?, ?, ?, ?, datetime('now'))
				`);

				stmt.run(
					workflowId,
					metrics.coverage,
					JSON.stringify(metrics.security),
					JSON.stringify(metrics.performance),
					metrics.accessibility,
				);

				resolve();
			} catch (error) {
				reject(error);
			}
		});
	});
}

/**
 * Get quality metrics for a workflow
 */
export async function getMetrics(
	db: Database.Database,
	workflowId: string,
): Promise<QualityMetrics | null> {
	return new Promise((resolve, reject) => {
		queueMicrotask(() => {
			try {
				const stmt = db.prepare('SELECT * FROM metrics WHERE workflowId = ?');
				const row = stmt.get(workflowId) as any;

				if (!row) {
					resolve(null);
					return;
				}

				const metrics: QualityMetrics = {
					coverage: row.coverage,
					security: JSON.parse(row.security),
					performance: JSON.parse(row.performance),
					accessibility: row.accessibility,
				};

				resolve(metrics);
			} catch (error) {
				reject(error);
			}
		});
	});
}
