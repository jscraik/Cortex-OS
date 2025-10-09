#!/usr/bin/env node

/**
 * Enhanced brAInwav Cortex-OS Task Manager CLI
 *
 * Extends the original task manager with dependency tracking, progress monitoring,
 * and hierarchical task management capabilities for complex multi-phase implementations.
 *
 * Usage:
 *   pnpm cortex-task init <task-name> [--priority P0|P1|P2|P3] [--parent <parent-task-id>]
 *   pnpm cortex-task depends <task-id>
 *   pnpm cortex-task blockers <task-id>
 *   pnpm cortex-task progress <task-id>
 *   pnpm cortex-task quality-gate <task-id>
 *   pnpm cortex-task milestone <milestone-id>
 *   pnpm cortex-task burndown
 *   pnpm cortex-task validate-dependencies
 *
 * Co-authored-by: brAInwav Development Team
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');
const TASKS_DIR = join(ROOT_DIR, '.tasks');
const DEPENDENCIES_FILE = join(TASKS_DIR, '_dependencies', 'task-dependencies.json');
const PROGRESS_FILE = join(TASKS_DIR, '_progress', 'task-progress.json');

// ANSI color codes for terminal output
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	dim: '\x1b[2m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
};

const log = {
	info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
	success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
	warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
	error: (msg) => console.error(`${colors.red}✖${colors.reset} ${msg}`),
	step: (msg) => console.log(`${colors.blue}▸${colors.reset} ${msg}`),
	header: (msg) => console.log(`\n${colors.bright}${colors.magenta}${msg}${colors.reset}\n`),
};

/**
 * Load dependencies from JSON file
 */
const loadDependencies = async () => {
	try {
		const content = await readFile(DEPENDENCIES_FILE, 'utf-8');
		return JSON.parse(content);
	} catch (error) {
		log.warn(`Could not load dependencies file: ${error.message}`);
		return { tasks: {}, dependency_graph: {}, milestones: [] };
	}
};

/**
 * Load progress from JSON file
 */
const loadProgress = async () => {
	try {
		const content = await readFile(PROGRESS_FILE, 'utf-8');
		return JSON.parse(content);
	} catch (error) {
		log.warn(`Could not load progress file: ${error.message}`);
		return { overall_progress: {}, phases: {}, quality_metrics: {} };
	}
};

/**
 * Save dependencies to JSON file
 */
const _saveDependencies = async (dependencies) => {
	try {
		await writeFile(DEPENDENCIES_FILE, JSON.stringify(dependencies, null, 2));
	} catch (error) {
		log.error(`Failed to save dependencies: ${error.message}`);
	}
};

/**
 * Save progress to JSON file
 */
const _saveProgress = async (progress) => {
	try {
		await writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2));
	} catch (error) {
		log.error(`Failed to save progress: ${error.message}`);
	}
};

/**
 * Show task dependencies
 */
const showDependencies = async (taskId) => {
	log.header(`Task Dependencies: ${taskId}`);

	const dependencies = await loadDependencies();
	const task = dependencies.tasks[taskId];

	if (!task) {
		log.error(`Task not found: ${taskId}`);
		process.exit(1);
	}

	console.log(`${colors.bright}Task:${colors.reset} ${task.name}`);
	console.log(`${colors.bright}Status:${colors.reset} ${task.status}`);
	console.log(`${colors.bright}Priority:${colors.reset} ${task.priority}`);
	console.log('');

	// Show dependencies
	if (task.dependencies && task.dependencies.length > 0) {
		console.log(`${colors.bright}Dependencies:${colors.reset}`);
		for (const depId of task.dependencies) {
			const depTask = dependencies.tasks[depId];
			const statusColor =
				depTask.status === 'completed'
					? colors.green
					: depTask.status === 'in_progress'
						? colors.yellow
						: colors.red;
			console.log(
				`  ${statusColor}●${colors.reset} ${depId} (${depTask.name}) - ${depTask.status}`,
			);
		}
		console.log('');
	}

	// Show blocking tasks
	if (task.blocking && task.blocking.length > 0) {
		console.log(`${colors.bright}Blocking:${colors.reset}`);
		for (const blockId of task.blocking) {
			const blockTask = dependencies.tasks[blockId];
			const statusColor =
				blockTask.status === 'completed'
					? colors.green
					: blockTask.status === 'in_progress'
						? colors.yellow
						: colors.red;
			console.log(
				`  ${statusColor}●${colors.reset} ${blockId} (${blockTask.name}) - ${blockTask.status}`,
			);
		}
		console.log('');
	}

	// Show subtasks
	if (task.subtasks && task.subtasks.length > 0) {
		console.log(`${colors.bright}Subtasks:${colors.reset}`);
		for (const subId of task.subtasks) {
			const subTask = dependencies.tasks[subId];
			const statusColor =
				subTask.status === 'completed'
					? colors.green
					: subTask.status === 'in_progress'
						? colors.yellow
						: colors.red;
			console.log(
				`  ${statusColor}●${colors.reset} ${subId} (${subTask.name}) - ${subTask.status} (${subTask.completion_percentage}%)`,
			);
		}
	}
};

/**
 * Show task blockers
 */
const showBlockers = async (taskId) => {
	log.header(`Task Blockers: ${taskId}`);

	const dependencies = await loadDependencies();
	const task = dependencies.tasks[taskId];

	if (!task) {
		log.error(`Task not found: ${taskId}`);
		process.exit(1);
	}

	const blockers = [];

	// Check direct dependencies
	for (const depId of task.dependencies || []) {
		const depTask = dependencies.tasks[depId];
		if (depTask.status !== 'completed') {
			blockers.push({
				id: depId,
				name: depTask.name,
				type: 'dependency',
				status: depTask.status,
				completion: depTask.completion_percentage || 0,
			});
		}
	}

	// Check subtasks
	for (const subId of task.subtasks || []) {
		const subTask = dependencies.tasks[subId];
		if (subTask.status !== 'completed') {
			blockers.push({
				id: subId,
				name: subTask.name,
				type: 'subtask',
				status: subTask.status,
				completion: subTask.completion_percentage || 0,
			});
		}
	}

	if (blockers.length === 0) {
		console.log(`${colors.green}No blockers found!${colors.reset}`);
		return;
	}

	console.log(`${colors.bright}Active Blockers:${colors.reset}`);
	for (const blocker of blockers) {
		const statusColor = blocker.status === 'in_progress' ? colors.yellow : colors.red;
		console.log(`  ${statusColor}●${colors.reset} ${blocker.id} (${blocker.name})`);
		console.log(`    Type: ${blocker.type}`);
		console.log(`    Status: ${blocker.status} (${blocker.completion}% complete)`);
		console.log('');
	}
};

/**
 * Show task progress
 */
const showProgress = async (taskId) => {
	log.header(`Task Progress: ${taskId}`);

	const progress = await loadProgress();
	const _dependencies = await loadDependencies();

	// Show overall progress
	const overall = progress.overall_progress;
	console.log(`${colors.bright}Overall Progress:${colors.reset}`);
	console.log(`  Completion: ${overall.completion_percentage}%`);
	console.log(`  Status: ${overall.status}`);
	console.log(`  Start Date: ${overall.start_date}`);
	console.log(`  Estimated End: ${overall.estimated_end_date}`);
	console.log(`  Current Phase: ${overall.current_phase}`);
	console.log('');

	// Show phase progress
	if (taskId.startsWith('phase-')) {
		const phase = progress.phases[taskId];
		if (phase) {
			console.log(`${colors.bright}Phase Details:${colors.reset}`);
			console.log(`  Status: ${phase.status}`);
			console.log(`  Completion: ${phase.completion_percentage}%`);
			console.log(
				`  Duration: ${phase.actual_duration_days || 0}/${phase.estimated_duration_days} days`,
			);

			if (phase.deliverables && phase.deliverables.length > 0) {
				console.log(`${colors.bright}Deliverables:${colors.reset}`);
				for (const deliverable of phase.deliverables) {
					const statusColor =
						deliverable.status === 'completed'
							? colors.green
							: deliverable.status === 'in_progress'
								? colors.yellow
								: colors.red;
					console.log(
						`  ${statusColor}●${colors.reset} ${deliverable.name} (${deliverable.completion_percentage}%)`,
					);
				}
			}
		}
	}

	// Show quality metrics
	const quality = progress.quality_metrics;
	console.log(`${colors.bright}Quality Metrics:${colors.reset}`);
	console.log(`  Tests Written: ${quality.total_tests_written}`);
	console.log(`  Tests Passing: ${quality.total_tests_passing}`);
	console.log(`  Coverage: ${quality.overall_coverage_percentage}%`);
	console.log(
		`  Security Issues: ${quality.security_scan_results.critical} critical, ${quality.security_scan_results.high} high`,
	);
};

/**
 * Validate task dependencies
 */
const validateDependencies = async () => {
	log.header('Dependency Validation');

	const dependencies = await loadDependencies();
	const errors = [];
	const warnings = [];

	// Check for circular dependencies
	const visited = new Set();
	const recursionStack = new Set();

	const checkCircular = (taskId) => {
		if (recursionStack.has(taskId)) {
			errors.push(`Circular dependency detected: ${taskId}`);
			return;
		}
		if (visited.has(taskId)) return;

		visited.add(taskId);
		recursionStack.add(taskId);

		const task = dependencies.tasks[taskId];
		if (task) {
			for (const depId of task.dependencies || []) {
				checkCircular(depId);
			}
		}

		recursionStack.delete(taskId);
	};

	// Check all tasks
	for (const taskId of Object.keys(dependencies.tasks)) {
		checkCircular(taskId);
	}

	// Check for missing dependencies
	for (const [taskId, task] of Object.entries(dependencies.tasks)) {
		for (const depId of task.dependencies || []) {
			if (!dependencies.tasks[depId]) {
				errors.push(`Task ${taskId} depends on missing task ${depId}`);
			}
		}
	}

	// Check for blocking inconsistencies
	for (const [taskId, task] of Object.entries(dependencies.tasks)) {
		for (const blockId of task.blocking || []) {
			const blockedTask = dependencies.tasks[blockId];
			if (blockedTask && !blockedTask.dependencies.includes(taskId)) {
				warnings.push(
					`Task ${taskId} blocks ${blockId} but ${blockId} doesn't list ${taskId} as dependency`,
				);
			}
		}
	}

	// Report results
	if (errors.length > 0) {
		console.log(`${colors.red}Errors:${colors.reset}`);
		for (const error of errors) {
			console.log(`  ✖ ${error}`);
		}
	}

	if (warnings.length > 0) {
		console.log(`${colors.yellow}Warnings:${colors.reset}`);
		for (const warning of warnings) {
			console.log(`  ⚠ ${warning}`);
		}
	}

	if (errors.length === 0 && warnings.length === 0) {
		console.log(`${colors.green}✓ No dependency issues found${colors.reset}`);
	} else {
		process.exit(1);
	}
};

/**
 * Show burndown chart
 */
const showBurndown = async () => {
	log.header('Project Burndown');

	const progress = await loadProgress();
	const burndown = progress.burndown_metrics;

	console.log(`${colors.bright}Burndown Metrics:${colors.reset}`);
	console.log(`  Total Estimated Days: ${burndown.total_estimated_days}`);
	console.log(`  Days Completed: ${burndown.days_completed}`);
	console.log(`  Days Remaining: ${burndown.days_remaining}`);
	console.log(`  Velocity: ${burndown.velocity} days/day`);
	console.log(`  Estimated Completion: ${burndown.estimated_completion_date}`);
	console.log('');

	// Simple ASCII burndown chart
	const width = 50;
	const completed = Math.floor((burndown.days_completed / burndown.total_estimated_days) * width);
	const remaining = width - completed;

	console.log(`${colors.bright}Progress:${colors.reset}`);
	console.log(
		`  [${colors.green}${'█'.repeat(completed)}${colors.red}${'█'.repeat(remaining)}${colors.reset}]`,
	);
	console.log(`  ${burndown.days_completed} / ${burndown.total_estimated_days} days`);
};

/**
 * Show quality gate status
 */
const showQualityGate = async (taskId) => {
	log.header(`Quality Gate Status: ${taskId}`);

	const progress = await loadProgress();
	const dependencies = await loadDependencies();

	const task = dependencies.tasks[taskId];
	if (!task) {
		log.error(`Task not found: ${taskId}`);
		process.exit(1);
	}

	if (taskId.startsWith('phase-')) {
		const phase = progress.phases[taskId];
		if (phase?.quality_gates) {
			console.log(`${colors.bright}Phase Quality Gates:${colors.reset}`);
			for (const [gate, status] of Object.entries(phase.quality_gates)) {
				const statusColor = status ? colors.green : colors.red;
				const statusSymbol = status ? '✓' : '✗';
				console.log(`  ${statusColor}${statusSymbol}${colors.reset} ${gate.replace(/_/g, ' ')}`);
			}
		}
	}

	// Show overall quality metrics
	const quality = progress.quality_metrics;
	console.log(`${colors.bright}Overall Quality:${colors.reset}`);
	console.log(`  Test Coverage: ${quality.overall_coverage_percentage}% (target: 90%)`);
	console.log(
		`  Security: ${quality.security_scan_results.critical} critical, ${quality.security_scan_results.high} high`,
	);
	console.log(
		`  Performance: ${quality.performance_metrics.context_slicing_latency_ms || 'N/A'}ms latency`,
	);
};

/**
 * Main CLI entrypoint
 */
const main = async () => {
	const args = process.argv.slice(2);
	const command = args[0];

	if (!command) {
		console.log(`
${colors.bright}${colors.magenta}Enhanced brAInwav Cortex-OS Task Manager${colors.reset}

${colors.bright}Usage:${colors.reset}
  pnpm cortex-task init <task-name> [--priority P0|P1|P2|P3] [--parent <parent-task-id>]
  pnpm cortex-task depends <task-id>
  pnpm cortex-task blockers <task-id>
  pnpm cortex-task progress <task-id>
  pnpm cortex-task quality-gate <task-id>
  pnpm cortex-task burndown
  pnpm cortex-task validate-dependencies

${colors.bright}Enhanced Commands:${colors.reset}
  ${colors.cyan}depends${colors.reset}     Show task dependencies and hierarchy
  ${colors.cyan}blockers${colors.reset}    Show active blockers for a task
  ${colors.cyan}progress${colors.reset}    Show detailed progress information
  ${colors.cyan}quality-gate${colors.reset} Show quality gate status
  ${colors.cyan}burndown${colors.reset}    Show project burndown chart
  ${colors.cyan}validate-dependencies${colors.reset} Check for dependency issues

${colors.bright}Examples:${colors.reset}
  pnpm cortex-task depends phase-2-context-graph-infrastructure
  pnpm cortex-task blockers phase-3-hybrid-model-router
  pnpm cortex-task progress langgraph-hybrid-router-integration
  pnpm cortex-task quality-gate phase-1-test-first-development
  pnpm cortex-task burndown
  pnpm cortex-task validate-dependencies

${colors.dim}Co-authored-by: brAInwav Development Team${colors.reset}
		`);
		process.exit(0);
	}

	try {
		switch (command) {
			case 'depends': {
				const taskId = args[1];
				if (!taskId) {
					log.error('Task ID required');
					process.exit(1);
				}
				await showDependencies(taskId);
				break;
			}

			case 'blockers': {
				const taskId = args[1];
				if (!taskId) {
					log.error('Task ID required');
					process.exit(1);
				}
				await showBlockers(taskId);
				break;
			}

			case 'progress': {
				const taskId = args[1];
				if (!taskId) {
					log.error('Task ID required');
					process.exit(1);
				}
				await showProgress(taskId);
				break;
			}

			case 'quality-gate': {
				const taskId = args[1];
				if (!taskId) {
					log.error('Task ID required');
					process.exit(1);
				}
				await showQualityGate(taskId);
				break;
			}

			case 'burndown': {
				await showBurndown();
				break;
			}

			case 'validate-dependencies': {
				await validateDependencies();
				break;
			}

			default:
				log.error(`Unknown command: ${command}`);
				log.info('Run "pnpm cortex-task" for usage information');
				process.exit(1);
		}
	} catch (error) {
		log.error(`Error: ${error.message}`);
		console.error(error);
		process.exit(1);
	}
};

// Run CLI
main();
