/**
 * @file packages/workflow-orchestrator/src/cli/commands/run.ts
 * @description Run workflow execution
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 */

import ora from 'ora';
import { WorkflowEngine } from '../../orchestrator/WorkflowEngine.js';
import { createDatabase } from '../../persistence/sqlite.js';
import { displayBanner, formatError, formatInfo, formatSuccess } from '../banner.js';

/**
 * Run workflow for a task
 */
export async function runWorkflow(
	taskId: string,
	options: {
		skipApprovals?: boolean;
		resume?: boolean;
		dryRun?: boolean;
	} = {},
): Promise<void> {
	displayBanner();

	const spinner = ora('Initializing workflow engine...').start();

	try {
		// Create database
		const dbPath = options.dryRun ? ':memory:' : '.workflow/state.db';
		const db = createDatabase(dbPath);

		// Create engine with event emission
		const engine = new WorkflowEngine(db, (event) => {
			if (event.type === 'workflow-started') {
				spinner.text = `Starting workflow for ${taskId}...`;
			} else if (event.type === 'workflow-completed') {
				spinner.succeed(`Workflow completed for ${taskId}`);
			}
		});

		spinner.text = `Running workflow for ${taskId}...`;

		// Execute workflow
		const result = await engine.executeWorkflow({
			taskId,
			skipApprovals: options.skipApprovals ?? false,
			resume: options.resume ?? false,
			dryRun: options.dryRun ?? false,
		});

		// Display results
		console.log('');
		console.log(formatInfo(`Workflow ID: ${result.workflowId}`));
		console.log(formatInfo(`Status: ${result.status}`));
		console.log(formatInfo(`Current Step: ${result.currentStep}`));
		console.log('');
		console.log(formatSuccess(`Completed Gates: ${result.completedGates.join(', ')}`));
		console.log(formatSuccess(`Completed Phases: ${result.completedPhases.join(', ')}`));
		console.log('');

		if (result.status === 'paused') {
			console.log(formatInfo(`Waiting for: ${result.waitingFor}`));
			console.log('');
			console.log('To resume, run:');
			console.log(`  cortex-workflow run ${taskId} --resume`);
			console.log('');
		}

		if (options.dryRun) {
			console.log(formatInfo('Dry run completed - no state persisted'));
		}
	} catch (error) {
		spinner.fail('Workflow execution failed');
		if (error instanceof Error) {
			console.log(formatError(error.message));
		}
		throw error;
	}
}
