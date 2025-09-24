import type {
	AgentToolkitValidationInput,
	AgentToolkitValidationResult,
} from '@cortex-os/contracts';
import { unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ValidationTool } from '../domain/ToolInterfaces.js';
import { execWithRetry } from './execUtil.js';

/**
 * ESLint validation tool adapter
 */
export class ESLintAdapter implements ValidationTool {
	private readonly scriptPath: string;

	constructor(toolsPath: string = resolve(process.cwd(), 'packages/agent-toolkit/tools')) {
		this.scriptPath = resolve(toolsPath, 'eslint_verify.sh');
	}

	async validate(inputs: AgentToolkitValidationInput): Promise<AgentToolkitValidationResult> {
		try {
			const filesArgs = (inputs.files || []).map((f) => `"${f}"`).join(' ');
			const cmd = `"${this.scriptPath}" ${filesArgs}`;
			const { stdout } = await execWithRetry(cmd, { timeoutMs: 45_000, retries: 1, backoffMs: 250 });
			const result = JSON.parse(stdout) as AgentToolkitValidationResult;
			if (result.tool !== 'eslint') throw new Error('Unexpected tool result format');
			return result;
		} catch (error) {
			return summarizeValidationError('eslint', inputs, error);
		}
	}
}

/**
 * Ruff Python validation tool adapter
 */
export class RuffAdapter implements ValidationTool {
	private readonly scriptPath: string;

	constructor(toolsPath: string = resolve(process.cwd(), 'packages/agent-toolkit/tools')) {
		this.scriptPath = resolve(toolsPath, 'ruff_verify.sh');
	}

	async validate(inputs: AgentToolkitValidationInput): Promise<AgentToolkitValidationResult> {
		try {
			const filesArgs = (inputs.files || []).map((f) => `"${f}"`).join(' ');
			const cmd = `"${this.scriptPath}" ${filesArgs}`;
			const { stdout } = await execWithRetry(cmd, { timeoutMs: 45_000, retries: 1, backoffMs: 250 });
			const result = JSON.parse(stdout) as AgentToolkitValidationResult;
			if (result.tool !== 'ruff') throw new Error('Unexpected tool result format');
			return result;
		} catch (error) {
			return summarizeValidationError('ruff', inputs, error);
		}
	}
}

/**
 * Cargo Rust validation tool adapter
 */
export class CargoAdapter implements ValidationTool {
	private readonly scriptPath: string;

	constructor(toolsPath: string = resolve(process.cwd(), 'packages/agent-toolkit/tools')) {
		this.scriptPath = resolve(toolsPath, 'cargo_verify.sh');
	}

	async validate(inputs: AgentToolkitValidationInput): Promise<AgentToolkitValidationResult> {
		try {
			const { stdout } = await execWithRetry(`"${this.scriptPath}"`, { timeoutMs: 60_000, retries: 1, backoffMs: 300 });
			const result = JSON.parse(stdout) as AgentToolkitValidationResult;
			if (result.tool !== 'cargo') throw new Error('Unexpected tool result format');
			return result;
		} catch (error) {
			return summarizeValidationError('cargo', inputs, error);
		}
	}
}

/**
 * Multi-file validator that uses run_validators.sh
 */
export class MultiValidatorAdapter implements ValidationTool {
	private readonly scriptPath: string;

	constructor(toolsPath: string = resolve(process.cwd(), 'packages/agent-toolkit/tools')) {
		this.scriptPath = resolve(toolsPath, 'run_validators.sh');
	}

	async validate(inputs: AgentToolkitValidationInput): Promise<AgentToolkitValidationResult> {
		// Create temporary file list
		const tempFile = `/tmp/agent-toolkit-files-${Date.now()}.txt`;

		try {
			await writeFile(tempFile, (inputs.files || []).join('\n'));
			const { stdout } = await execWithRetry(`"${this.scriptPath}" "${tempFile}"`, { timeoutMs: 60_000, retries: 1, backoffMs: 300 });
			// Parse result for potential future use
			JSON.parse(stdout) as {
				tool: string;
				op: string;
				results: unknown[];
			};

			// Transform multi-validator result to our schema
			return {
				tool: 'validator',
				op: 'validate',
				inputs,
				results: [], // Multi-validator returns different format
				summary: { total: 0, errors: 0, warnings: 0 },
			};
		} catch (error) {
			return summarizeValidationError('validator', inputs, error);
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

function summarizeValidationError(
	tool: 'eslint' | 'ruff' | 'cargo' | 'validator',
	inputs: AgentToolkitValidationInput,
	error: unknown,
): AgentToolkitValidationResult {
	return {
		tool,
		op: 'validate',
		inputs,
		results: [],
		summary: { total: 0, errors: 0, warnings: 0 },
		error: error instanceof Error ? error.message : 'Unknown error',
	};
}
