import { unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type {
	AgentToolkitValidationInput,
	AgentToolkitValidationResult,
} from '@cortex-os/contracts';
import { safeExecFileWithRetry } from '@cortex-os/security';
import type { ValidationTool } from '../domain/ToolInterfaces.js';
import { resolveToolsDirFromOverride, type ToolsDirOverride } from './paths.js';

function createScriptPathPromise(
	scriptName: string,
	toolsPath?: ToolsDirOverride,
): Promise<string> {
	return resolveToolsDirFromOverride(toolsPath).then((dir) => resolve(dir, scriptName));
}

/**
 * ESLint validation tool adapter
 */
export class ESLintAdapter implements ValidationTool {
	private readonly scriptPathPromise: Promise<string>;

	constructor(toolsPath?: ToolsDirOverride) {
		this.scriptPathPromise = createScriptPathPromise('eslint_verify.sh', toolsPath);
	}

	async validate(inputs: AgentToolkitValidationInput): Promise<AgentToolkitValidationResult> {
		try {
			const scriptPath = await this.scriptPathPromise;
			// CodeQL Fix #208: Use safeExecFileWithRetry instead of execWithRetry to prevent shell injection
			const { stdout } = await safeExecFileWithRetry(scriptPath, inputs.files || [], {
				timeout: 45_000,
				retries: 1,
				backoffMs: 250,
			});
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
	private readonly scriptPathPromise: Promise<string>;

	constructor(toolsPath?: ToolsDirOverride) {
		this.scriptPathPromise = createScriptPathPromise('ruff_verify.sh', toolsPath);
	}

	async validate(inputs: AgentToolkitValidationInput): Promise<AgentToolkitValidationResult> {
		try {
			const scriptPath = await this.scriptPathPromise;
			// CodeQL Fix #209: Use safeExecFileWithRetry instead of execWithRetry to prevent shell injection
			const { stdout } = await safeExecFileWithRetry(scriptPath, inputs.files || [], {
				timeout: 45_000,
				retries: 1,
				backoffMs: 250,
			});
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
	private readonly scriptPathPromise: Promise<string>;

	constructor(toolsPath?: ToolsDirOverride) {
		this.scriptPathPromise = createScriptPathPromise('cargo_verify.sh', toolsPath);
	}

	async validate(inputs: AgentToolkitValidationInput): Promise<AgentToolkitValidationResult> {
		try {
			const scriptPath = await this.scriptPathPromise;
			const { stdout } = await execWithRetry(`"${scriptPath}"`, {
				timeoutMs: 60_000,
				retries: 1,
				backoffMs: 300,
			});
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
	private readonly scriptPathPromise: Promise<string>;

	constructor(toolsPath?: ToolsDirOverride) {
		this.scriptPathPromise = createScriptPathPromise('run_validators.sh', toolsPath);
	}

	async validate(inputs: AgentToolkitValidationInput): Promise<AgentToolkitValidationResult> {
		// Create temporary file list
		const tempFile = `/tmp/agent-toolkit-files-${Date.now()}.txt`;

		try {
			await writeFile(tempFile, (inputs.files || []).join('\n'));
			const scriptPath = await this.scriptPathPromise;
			const { stdout } = await execWithRetry(`"${scriptPath}" "${tempFile}"`, {
				timeoutMs: 60_000,
				retries: 1,
				backoffMs: 300,
			});
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
