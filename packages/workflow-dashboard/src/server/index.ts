/**
 * Dashboard Server - REST API for Workflow Visualization
 * Part of brAInwav Cortex-OS Unified Workflow
 *
 * Provides workflow status, metrics, and approval endpoints
 * with WebSocket support for real-time updates.
 */

import type { QualityMetrics, WorkflowState } from '@cortex-os/workflow-common';
import Database from 'better-sqlite3';
import express, { type Express, type Request, type Response } from 'express';
import { z } from 'zod';

// Import persistence functions - will use from built orchestrator package
// For now, implement minimal versions here to avoid cross-package source imports
interface StepData {
	workflowId: string;
	type: 'gate' | 'phase';
	stepId: string;
	status: 'pending' | 'in-progress' | 'completed' | 'failed';
	evidence: string[];
	startedAt?: string;
	completedAt?: string;
}

export interface ServerConfig {
	port: number;
	dbPath?: string;
}

const approvalSchema = z.object({
	gateId: z.string().regex(/^G[0-7]$/),
	actor: z.string().min(1),
	decision: z.enum(['approved', 'rejected']),
	rationale: z.string().min(1),
});

export async function createServer(config: ServerConfig): Promise<Express> {
	const app = express();
	const dbPath = config.dbPath || '.workflow/state.db';

	app.use(express.json());

	// Health check
	app.get('/api/health', (_req: Request, res: Response) => {
		res.json({
			status: 'ok',
			branding: 'brAInwav',
			service: 'workflow-dashboard',
			timestamp: new Date().toISOString(),
		});
	});

	// List workflows
	app.get('/api/workflows', async (_req: Request, res: Response) => {
		try {
			const db = new Database(dbPath);
			const workflows = await listWorkflows(db);
			db.close();

			res.json({
				branding: 'brAInwav',
				workflows: workflows.map((w) => ({
					...w,
					progress: calculateProgress(w),
				})),
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			res.status(500).json({
				error: '[brAInwav] Failed to list workflows',
				details: error instanceof Error ? error.message : 'Unknown error',
				branding: 'brAInwav',
			});
		}
	});

	// Get workflow detail
	app.get('/api/workflows/:id', async (req: Request, res: Response) => {
		const { id } = req.params;

		try {
			const db = new Database(dbPath);
			const workflow = await getWorkflow(db, id);

			if (!workflow) {
				db.close();
				return res.status(404).json({
					error: 'brAInwav: Workflow not found',
					workflowId: id,
					branding: 'brAInwav',
				});
			}

			const qualityMetrics = await getMetrics(db, id);
			db.close();

			res.json({
				workflow,
				qualityMetrics: qualityMetrics || {
					coverage: 0,
					security: { critical: 0, high: 0, medium: 0 },
					performance: { lcp: 0, tbt: 0 },
					accessibility: 0,
				},
				branding: 'brAInwav',
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			res.status(500).json({
				error: '[brAInwav] Failed to retrieve workflow',
				details: error instanceof Error ? error.message : 'Unknown error',
				branding: 'brAInwav',
			});
		}
	});

	// Approve workflow gate
	app.post('/api/workflows/:id/approve', async (req: Request, res: Response) => {
		const { id } = req.params;

		// Validate request body
		const validation = approvalSchema.safeParse(req.body);
		if (!validation.success) {
			return res.status(400).json({
				error: 'brAInwav: Approval validation failed',
				details: validation.error.errors,
				branding: 'brAInwav',
			});
		}

		const approval = validation.data;

		try {
			const db = new Database(dbPath);

			// Store approval as completed gate step
			const stepData: StepData = {
				workflowId: id,
				type: 'gate',
				stepId: approval.gateId,
				status: approval.decision === 'approved' ? 'completed' : 'failed',
				evidence: [approval.rationale],
				completedAt: new Date().toISOString(),
			};

			await saveStep(db, stepData);
			db.close();

			res.json({
				message: `brAInwav: Gate ${approval.gateId} ${approval.decision}`,
				workflowId: id,
				approval,
				branding: 'brAInwav',
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			res.status(500).json({
				error: '[brAInwav] Failed to store approval',
				details: error instanceof Error ? error.message : 'Unknown error',
				branding: 'brAInwav',
			});
		}
	});

	return app;
}

// Database helper functions
async function listWorkflows(db: Database.Database): Promise<WorkflowState[]> {
	const stmt = db.prepare('SELECT state FROM workflows ORDER BY updatedAt DESC');
	const rows = stmt.all() as { state: string }[];
	return rows.map((row) => JSON.parse(row.state) as WorkflowState);
}

async function getWorkflow(db: Database.Database, id: string): Promise<WorkflowState | null> {
	const stmt = db.prepare('SELECT state FROM workflows WHERE id = ?');
	const row = stmt.get(id) as { state: string } | undefined;
	return row ? (JSON.parse(row.state) as WorkflowState) : null;
}

async function getMetrics(
	db: Database.Database,
	workflowId: string,
): Promise<QualityMetrics | null> {
	const stmt = db.prepare('SELECT * FROM metrics WHERE workflowId = ?');
	const row = stmt.get(workflowId) as any;

	if (!row) return null;

	return {
		coverage: row.coverage,
		security: JSON.parse(row.security),
		performance: JSON.parse(row.performance),
		accessibility: row.accessibility,
	};
}

async function saveStep(db: Database.Database, step: StepData): Promise<void> {
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
}

function calculateProgress(workflow: WorkflowState): number {
	const totalSteps = 14; // 8 gates + 6 phases

	// Count completed gates and phases from prpState and taskState
	let completed = 0;

	if (workflow.prpState?.gates) {
		const completedGates = Object.values(workflow.prpState.gates).filter(
			(gate: any) => gate.status === 'completed',
		);
		completed += completedGates.length;
	}

	if (workflow.taskState?.phases) {
		const completedPhases = Object.values(workflow.taskState.phases).filter(
			(phase: any) => phase.status === 'completed',
		);
		completed += completedPhases.length;
	}

	return Math.round((completed / totalSteps) * 100);
}
