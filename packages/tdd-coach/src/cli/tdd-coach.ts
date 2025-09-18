#!/usr/bin/env node

import { Command } from 'commander';
import { createTDDCoach, type TDDCoach } from '../index.js';
import type { ChangeSet } from '../types/TDDTypes.js';
import { InterventionLevel } from '../types/TDDTypes.js';

const program = new Command();

program
	.name('tdd-coach')
	.description('TDD Coach CLI - Enforce Test-Driven Development principles')
	.version('0.1.0');

program
	.command('validate')
	.description('Validate changes against TDD principles')
	.option('-w, --workspace <path>', 'Workspace root path', process.cwd())
	.option('-f, --files <files...>', 'Files to validate')
	.option('--watch', 'Watch for changes and validate continuously')
	.action(async (options) => {
		try {
			const coach = createTDDCoach({
				workspaceRoot: options.workspace,
				config: {
					universalMode: options.watch || false,
					defaultInterventionLevel: InterventionLevel.COACHING,
					adaptiveLearning: true,
				},
			});

			if (options.watch) {
				console.log('Starting TDD Coach in watch mode...');
				await startWatchMode(coach);
			} else if (options.files) {
				await validateFiles(coach, options.files);
			} else {
				console.log('No files specified for validation');
				process.exit(1);
			}
		} catch (error) {
			console.error('Error running TDD Coach:', error);
			process.exit(1);
		}
	});

program
	.command('status')
	.description('Get current TDD status')
	.option('-w, --workspace <path>', 'Workspace root path', process.cwd())
	.action(async (options) => {
		try {
			const coach = createTDDCoach({
				workspaceRoot: options.workspace,
			});

			const status = await coach.getStatus();
			console.log(`TDD State: ${status.state}`);
			console.log(
				`Tests: ${status.testsStatus.passing} passing, ${status.testsStatus.failing} failing`,
			);
			console.log(`Coaching: ${status.coaching}`);
		} catch (error) {
			console.error('Error getting TDD status:', error);
			process.exit(1);
		}
	});

program
	.command('run-tests')
	.description('Run tests and update TDD state')
	.option('-w, --workspace <path>', 'Workspace root path', process.cwd())
	.option('-f, --files <files...>', 'Specific test files to run')
	.action(async (options) => {
		try {
			const coach = createTDDCoach({
				workspaceRoot: options.workspace,
			});

			const results = await coach.runTests(options.files);
			console.log(`Ran ${results.length} tests`);
			const passing = results.filter((r) => r.status === 'pass').length;
			const failing = results.filter((r) => r.status === 'fail').length;
			console.log(`${passing} passing, ${failing} failing`);
		} catch (error) {
			console.error('Error running tests:', error);
			process.exit(1);
		}
	});

async function validateFiles(coach: TDDCoach, files: string[]) {
	// Create a mock ChangeSet for validation
	const changeSet: ChangeSet = {
		files: files.map((file) => ({
			path: file,
			status: 'modified',
			diff: '', // In a real implementation, this would contain the actual diff
			linesAdded: 0,
			linesDeleted: 0,
		})),
		totalChanges: files.length,
		timestamp: new Date().toISOString(),
		author: 'cli-user',
	};

	const response = await coach.validateChange({
		proposedChanges: changeSet,
	});

	// Output the validation results
	console.log(`Validation Result: ${response.allowed ? 'ALLOWED' : 'BLOCKED'}`);
	console.log(`TDD State: ${response.state.current}`);
	console.log(`Coaching Level: ${response.coaching.level}`);
	console.log(`Message: ${response.coaching.message}`);

	if (response.coaching.suggestedActions.length > 0) {
		console.log('Suggested Actions:');
		response.coaching.suggestedActions.forEach((action: string) => console.log(`  - ${action}`));
	}

	// Exit with error code if validation failed
	if (!response.allowed) {
		process.exit(1);
	}
}

async function startWatchMode(coach: TDDCoach) {
	// Start test watching
	await coach.startTestWatching();

	console.log('TDD Coach is now watching for changes. Press Ctrl+C to exit.');

	// Keep the process alive
	process.on('SIGINT', async () => {
		console.log('\nStopping TDD Coach...');
		await coach.stopTestWatching();
		process.exit(0);
	});

	// Keep the process running
	setInterval(() => {}, 1000);
}

program.parse();
