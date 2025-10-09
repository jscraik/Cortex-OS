/**
 * @file packages/workflow-orchestrator/src/cli/banner.ts
 * @description brAInwav CLI banner and branding utilities
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 */

import chalk from 'chalk';

/**
 * Display brAInwav banner
 */
export function displayBanner(): void {
	console.log('');
	console.log(chalk.cyan.bold('╔══════════════════════════════════════════════════════╗'));
	console.log(
		`${chalk.cyan.bold('║')}  ${chalk.white.bold('brAInwav Cortex-OS Unified Workflow')}          ${chalk.cyan.bold('║')}`,
	);
	console.log(
		`${chalk.cyan.bold('║')}  ${chalk.gray('PRP Gates G0-G7 + Task Phases 0-5')}              ${chalk.cyan.bold('║')}`,
	);
	console.log(chalk.cyan.bold('╚══════════════════════════════════════════════════════╝'));
	console.log('');
}

/**
 * Format success message with brAInwav branding
 */
export function formatSuccess(message: string): string {
	return chalk.green('✓ ') + chalk.white('brAInwav: ') + chalk.green(message);
}

/**
 * Format error message with brAInwav branding
 */
export function formatError(message: string): string {
	return chalk.red('✗ ') + chalk.white('brAInwav: ') + chalk.red(message);
}

/**
 * Format info message with brAInwav branding
 */
export function formatInfo(message: string): string {
	return chalk.blue('ℹ ') + chalk.white('brAInwav: ') + chalk.cyan(message);
}

/**
 * Format warning message with brAInwav branding
 */
export function formatWarning(message: string): string {
	return chalk.yellow('⚠ ') + chalk.white('brAInwav: ') + chalk.yellow(message);
}
