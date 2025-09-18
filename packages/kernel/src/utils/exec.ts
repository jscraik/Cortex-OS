/**
 * @file exec.ts
 * @description Async execution utilities for external tools
 * @author Cortex-OS Team
 * @version 1.0.0
 */

import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execPromise = promisify(exec);

export interface ExecResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

/**
 * Execute shell command asynchronously
 */
export async function execAsync(
	command: string,
	options?: { timeout?: number; cwd?: string },
): Promise<ExecResult> {
	try {
		const result = await execPromise(command, {
			timeout: options?.timeout || 30000,
			cwd: options?.cwd || process.cwd(),
		});

		return {
			stdout: result.stdout,
			stderr: result.stderr,
			exitCode: 0,
		};
	} catch (error: any) {
		return {
			stdout: error.stdout || '',
			stderr: error.stderr || error.message || '',
			exitCode: error.code || 1,
		};
	}
}

/**
 * Execute command with streaming output
 */
export function execStream(
	command: string,
	args: string[],
	options?: { cwd?: string },
): Promise<ExecResult> {
	return new Promise((resolve) => {
		const child = spawn(command, args, {
			cwd: options?.cwd || process.cwd(),
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		let stdout = '';
		let stderr = '';

		child.stdout?.on('data', (data) => {
			stdout += data.toString();
		});

		child.stderr?.on('data', (data) => {
			stderr += data.toString();
		});

		child.on('close', (code) => {
			resolve({
				stdout,
				stderr,
				exitCode: code || 0,
			});
		});
	});
}
