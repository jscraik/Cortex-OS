import { spawn } from 'node:child_process';
import { z } from 'zod';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

const BashToolInputSchema = z.object({
	command: z.string().min(1, 'command is required'),
	workingDirectory: z.string().optional(),
	timeout: z.number().int().positive().max(300000).optional(), // max 5min
	env: z.record(z.string()).optional(),
	input: z.string().optional(), // stdin input
});

export type BashToolInput = z.infer<typeof BashToolInputSchema>;

export interface BashToolResult {
	stdout: string;
	stderr: string;
	exitCode: number;
	command: string;
	workingDirectory?: string;
	executionTime: number;
	timestamp: string;
}

export class BashTool implements McpTool<BashToolInput, BashToolResult> {
	readonly name = 'bash';
	readonly description =
		'Executes shell commands in your environment with proper error handling and security controls.';
	readonly inputSchema = BashToolInputSchema;

	async execute(input: BashToolInput, context?: ToolExecutionContext): Promise<BashToolResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('Bash tool execution aborted.', {
				code: 'E_TOOL_ABORTED',
			});
		}

		const startTime = Date.now();

		// Security check - prevent dangerous commands
		const dangerousPatterns = [
			/rm\s+-rf\s+\/$/, // rm -rf /
			/rm\s+-rf\s+\*$/, // rm -rf *
			/:\(\)\{ :|:& \};:/, // fork bomb
			/sudo\s+rm/, // sudo rm
			/mkfs\./, // format filesystem
		];

		for (const pattern of dangerousPatterns) {
			if (pattern.test(input.command)) {
				throw new ToolExecutionError(`Command blocked for security: ${input.command}`, {
					code: 'E_SECURITY_VIOLATION',
				});
			}
		}

		return new Promise((resolve, reject) => {
			const child = spawn('bash', ['-c', input.command], {
				cwd: input.workingDirectory || process.cwd(),
				env: { ...process.env, ...input.env },
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

			// Handle stdin input if provided
			if (input.input) {
				child.stdin?.write(input.input);
				child.stdin?.end();
			} else {
				child.stdin?.end();
			}

			// Set timeout
			const timeout = setTimeout(() => {
				child.kill('SIGTERM');
				setTimeout(() => child.kill('SIGKILL'), 5000); // Force kill after 5s
				reject(
					new ToolExecutionError(`Command timed out after ${input.timeout}ms`, {
						code: 'E_TIMEOUT',
					}),
				);
			}, input.timeout);

			child.on('close', (exitCode) => {
				clearTimeout(timeout);
				const executionTime = Date.now() - startTime;

				resolve({
					stdout: stdout.trim(),
					stderr: stderr.trim(),
					exitCode: exitCode || 0,
					command: input.command,
					workingDirectory: input.workingDirectory,
					executionTime,
					timestamp: new Date().toISOString(),
				});
			});

			child.on('error', (error) => {
				clearTimeout(timeout);
				reject(
					new ToolExecutionError(`Failed to execute command: ${error.message}`, {
						code: 'E_EXECUTION_FAILED',
						cause: error,
					}),
				);
			});

			// Handle aborted signal
			context?.signal?.addEventListener('abort', () => {
				clearTimeout(timeout);
				child.kill('SIGTERM');
				setTimeout(() => child.kill('SIGKILL'), 5000);
				reject(
					new ToolExecutionError('Bash tool execution aborted.', {
						code: 'E_TOOL_ABORTED',
					}),
				);
			});
		});
	}
}

export const bashTool = new BashTool();
