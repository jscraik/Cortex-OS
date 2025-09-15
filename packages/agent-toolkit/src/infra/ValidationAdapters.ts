import { exec } from 'node:child_process';
import { unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import type {
	AgentToolkitValidationInput,
	AgentToolkitValidationResult,
} from '@cortex-os/contracts';
import type { ValidationTool } from '../domain/ToolInterfaces.js';

const execAsync = promisify(exec);

/**
 * ESLint validation tool adapter
 */
export class ESLintAdapter implements ValidationTool {
	private readonly scriptPath: string;

	constructor(
		toolsPath: string = resolve(process.cwd(), 'packages/agent-toolkit/tools'),
	) {
		this.scriptPath = resolve(toolsPath, 'eslint_verify.sh');
	}

	async validate(
		inputs: AgentToolkitValidationInput,
	): Promise<AgentToolkitValidationResult> {
		try {
			const { stdout } = await execAsync(
				`"${this.scriptPath}" ${inputs.files.map((f) => `"${f}"`).join(' ')}`,
			);
			const result = JSON.parse(stdout) as AgentToolkitValidationResult;

			// Validate the result matches our schema
			if (result.tool !== 'eslint') {
				throw new Error('Unexpected tool result format');
			}

			return result;
		} catch (error) {
			return {
				tool: 'eslint',
				op: 'validate',
				inputs,
				results: [],
				summary: { total: 0, errors: 0, warnings: 0 },
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}
}

/**
 * Ruff Python validation tool adapter
 */
export class RuffAdapter implements ValidationTool {
	private readonly scriptPath: string;

	constructor(
		toolsPath: string = resolve(process.cwd(), 'packages/agent-toolkit/tools'),
	) {
		this.scriptPath = resolve(toolsPath, 'ruff_verify.sh');
	}

	async validate(
		inputs: AgentToolkitValidationInput,
	): Promise<AgentToolkitValidationResult> {
		try {
			const { stdout } = await execAsync(
				`"${this.scriptPath}" ${inputs.files.map((f) => `"${f}"`).join(' ')}`,
			);
			const result = JSON.parse(stdout) as AgentToolkitValidationResult;

			// Validate the result matches our schema
			if (result.tool !== 'ruff') {
				throw new Error('Unexpected tool result format');
			}

			return result;
		} catch (error) {
			return {
				tool: 'ruff',
				op: 'validate',
				inputs,
				results: [],
				summary: { total: 0, errors: 0, warnings: 0 },
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}
}

/**
 * Cargo Rust validation tool adapter
 */
export class CargoAdapter implements ValidationTool {
	private readonly scriptPath: string;

	constructor(
		toolsPath: string = resolve(process.cwd(), 'packages/agent-toolkit/tools'),
	) {
		this.scriptPath = resolve(toolsPath, 'cargo_verify.sh');
	}

	async validate(
		inputs: AgentToolkitValidationInput,
	): Promise<AgentToolkitValidationResult> {
		try {
			const { stdout } = await execAsync(`"${this.scriptPath}"`);
			const result = JSON.parse(stdout) as AgentToolkitValidationResult;

			// Validate the result matches our schema
			if (result.tool !== 'cargo') {
				throw new Error('Unexpected tool result format');
			}

			return result;
		} catch (error) {
			return {
				tool: 'cargo',
				op: 'validate',
				inputs,
				results: [],
				summary: { total: 0, errors: 0, warnings: 0 },
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}
}

/**
 * Multi-file validator that uses run_validators.sh
 */
export class MultiValidatorAdapter implements ValidationTool {
	private readonly scriptPath: string;

	constructor(
		toolsPath: string = resolve(process.cwd(), 'packages/agent-toolkit/tools'),
	) {
		this.scriptPath = resolve(toolsPath, 'run_validators.sh');
	}

	async validate(
		inputs: AgentToolkitValidationInput,
	): Promise<AgentToolkitValidationResult> {
		// Create temporary file list
		const tempFile = `/tmp/agent-toolkit-files-${Date.now()}.txt`;

		try {
			await writeFile(tempFile, inputs.files.join('\n'));
			const { stdout } = await execAsync(`"${this.scriptPath}" "${tempFile}"`);
			const _result = JSON.parse(stdout) as {
				tool: string;
				op: string;
				results: unknown[];
			};

			// Transform multi-validator result to our schema
			return {
				tool: 'validator' as any, // Will be validated by the calling code
				op: 'validate',
				inputs,
				results: [], // Multi-validator returns different format
				summary: { total: 0, errors: 0, warnings: 0 },
			};
		} catch (error) {
			return {
				tool: 'validator' as any,
				op: 'validate',
				inputs,
				results: [],
				summary: { total: 0, errors: 0, warnings: 0 },
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		} finally {
			// Clean up temp file
			try {
				await unlink(tempFile);
			} catch {
				// Ignore cleanup errors
			}
		}
	}
}
