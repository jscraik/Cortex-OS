/**
 * [brAInwav] Safe Shell Execution
 * Fixes CodeQL alerts #204-209 - Shell injection vulnerabilities
 *
 * Provides safe shell command execution using execFile instead of exec
 * to prevent shell injection attacks. Never uses shell interpretation.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Options for safe command execution
 */
export interface ExecOptions {
	/** Timeout in milliseconds (default: 30000) */
	timeout?: number;
	/** Maximum buffer size for stdout/stderr (default: 10MB) */
	maxBuffer?: number;
	/** Working directory for command execution */
	cwd?: string;
	/** Environment variables */
	env?: NodeJS.ProcessEnv;
	/** Whether to throw on non-zero exit code (default: true) */
	throwOnError?: boolean;
}

/**
 * Result of command execution
 */
export interface ExecResult {
	/** Standard output from command */
	stdout: string;
	/** Standard error from command */
	stderr: string;
	/** Exit code (only present when throwOnError is false) */
	exitCode?: number;
}

/**
 * Safely execute a command with arguments
 * CodeQL Fix: Uses execFile instead of exec to prevent shell injection (#204-209)
 *
 * Security guarantees:
 * - No shell interpretation of arguments
 * - Command and arguments are separated
 * - Metacharacters treated as literals
 * - Timeouts prevent resource exhaustion
 *
 * @param command - The command to execute (e.g., 'grep', 'ls')
 * @param args - Array of arguments (never interpreted as shell code)
 * @param options - Execution options
 * @returns Promise resolving to command output
 * @throws Error if command fails or times out
 *
 * @example
 * ```typescript
 * // Safe: user input is treated as literal argument
 * const result = await safeExecFile('grep', [userPattern, filePath]);
 *
 * // Safe: special characters are not interpreted
 * const result = await safeExecFile('echo', ['$(malicious)']);
 * // Output: "$(malicious)" (literal string, not executed)
 * ```
 */
export async function safeExecFile(
	command: string,
	args: string[],
	options: ExecOptions = {},
): Promise<ExecResult> {
	const {
		timeout = 30000,
		maxBuffer = 10 * 1024 * 1024, // 10MB
		cwd,
		env,
		throwOnError = true,
	} = options;

	try {
		const { stdout, stderr } = await execFileAsync(command, args, {
			timeout,
			maxBuffer,
			cwd,
			env,
			shell: false, // CRITICAL: Never use shell interpretation
			windowsHide: true, // Hide console window on Windows
		});

		return {
			stdout,
			stderr,
			exitCode: 0,
		};
	} catch (error: any) {
		// Handle timeout
		if (error.killed && error.signal === 'SIGTERM') {
			throw new Error(`[brAInwav] Command "${command}" timed out after ${timeout}ms`);
		}

		// Handle non-zero exit code
		if (error.code !== undefined && !throwOnError) {
			return {
				stdout: error.stdout || '',
				stderr: error.stderr || '',
				exitCode: error.code,
			};
		}

		// Re-throw with brAInwav branding
		throw new Error(`[brAInwav] Command "${command}" failed: ${error.message}`, { cause: error });
	}
}

/**
 * Validate that a command is in an allowlist
 * Additional security layer for high-risk scenarios
 *
 * @param command - Command to validate
 * @param allowlist - Array of allowed commands
 * @throws Error if command not in allowlist
 */
export function validateCommandAllowlist(command: string, allowlist: string[]): void {
	if (!allowlist.includes(command)) {
		throw new Error(
			`[brAInwav] Command "${command}" not in allowlist. Allowed: ${allowlist.join(', ')}`,
		);
	}
}

/**
 * Options for safe command execution with retry logic
 */
export interface ExecWithRetryOptions extends ExecOptions {
	/** Number of retry attempts (default: 1) */
	retries?: number;
	/** Backoff delay in milliseconds between retries (default: 250) */
	backoffMs?: number;
}

/**
 * Execute command with retry logic
 * Wraps safeExecFile with automatic retry on failure
 *
 * @param command - The command to execute
 * @param args - Array of arguments
 * @param options - Execution options including retry configuration
 * @returns Promise resolving to command output
 */
export async function safeExecFileWithRetry(
	command: string,
	args: string[],
	options: ExecWithRetryOptions = {},
): Promise<ExecResult> {
	const { retries = 1, backoffMs = 250, ...execOptions } = options;
	const maxRetries = Math.max(0, retries);
	let attempt = 0;

	while (true) {
		try {
			return await safeExecFile(command, args, execOptions);
		} catch (error) {
			attempt += 1;
			if (attempt > maxRetries) {
				throw error;
			}
			// Wait with exponential backoff
			await new Promise((resolve) => setTimeout(resolve, backoffMs * attempt));
		}
	}
}
