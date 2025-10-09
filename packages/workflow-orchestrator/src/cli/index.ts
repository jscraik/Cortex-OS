#!/usr/bin/env node
/**
 * @file packages/workflow-orchestrator/src/cli/index.ts
 * @description brAInwav Cortex-OS Unified Workflow CLI
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 */

import { Command } from 'commander';
import { initWorkflow } from './commands/init.js';
import { initProfile, setProfileValue, showProfile, validateProfile } from './commands/profile.js';
import { runWorkflow } from './commands/run.js';

const program = new Command();

program
	.name('cortex-workflow')
	.description('brAInwav Cortex-OS Unified Workflow - PRP Gates + Task Phases')
	.version('1.0.0');

// Init command
program
	.command('init')
	.description('Initialize new workflow with PRP blueprint and task constitution')
	.argument('<feature-name>', 'Feature name')
	.option('-p, --priority <priority>', 'Priority (P0-P4)', 'P2')
	.action(async (featureName: string, options: { priority: string }) => {
		try {
			await initWorkflow(featureName, options.priority);
		} catch (error) {
			console.error('Error:', error);
			process.exit(1);
		}
	});

// Run command
program
	.command('run')
	.description('Run workflow execution')
	.argument('<task-id>', 'Task ID')
	.option('--skip-approvals', 'Skip approval gates (for testing)', false)
	.option('--resume', 'Resume from last checkpoint', false)
	.option('--dry-run', 'Simulate without persistence', false)
	.action(
		async (
			taskId: string,
			options: { skipApprovals: boolean; resume: boolean; dryRun: boolean },
		) => {
			try {
				await runWorkflow(taskId, options);
			} catch (error) {
				console.error('Error:', error);
				process.exit(1);
			}
		},
	);

// Profile commands
const profileCmd = program.command('profile').description('Manage enforcement profile');

profileCmd
	.command('init')
	.description('Initialize enforcement profile with brAInwav defaults')
	.action(async () => {
		try {
			await initProfile();
		} catch (error) {
			console.error('Error:', error);
			process.exit(1);
		}
	});

profileCmd
	.command('show')
	.description('Display current enforcement profile')
	.action(async () => {
		try {
			await showProfile();
		} catch (error) {
			console.error('Error:', error);
			process.exit(1);
		}
	});

profileCmd
	.command('set')
	.description('Set profile value')
	.argument('<path>', 'Config path (e.g., coverage.lines)')
	.argument('<value>', 'New value')
	.action(async (path: string, value: string) => {
		try {
			await setProfileValue(path, value);
		} catch (error) {
			console.error('Error:', error);
			process.exit(1);
		}
	});

profileCmd
	.command('validate')
	.description('Validate enforcement profile')
	.action(async () => {
		try {
			const isValid = await validateProfile();
			process.exit(isValid ? 0 : 1);
		} catch (error) {
			console.error('Error:', error);
			process.exit(1);
		}
	});

// Status command (placeholder for now)
program
	.command('status')
	.description('Show workflow status')
	.argument('<task-id>', 'Task ID')
	.action(() => {
		console.log('Status command - to be implemented in Phase 5');
	});

// Insights command (placeholder for now)
program
	.command('insights')
	.description('Show workflow insights from local memory')
	.option('-q, --query <query>', 'Search query')
	.action(() => {
		console.log('Insights command - to be implemented in Phase 5');
	});

program.parse();
