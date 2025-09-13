import type {
	AgentToolkitSearchInput,
	AgentToolkitSearchResult,
} from '@cortex-os/contracts';
import { exec } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import type { SearchTool } from '../domain/ToolInterfaces.js';

const execAsync = promisify(exec);

/**
 * Ripgrep search tool adapter
 */
export class RipgrepAdapter implements SearchTool {
	private readonly scriptPath: string;

	constructor(
		toolsPath: string = resolve(process.cwd(), 'packages/agent-toolkit/tools'),
	) {
		this.scriptPath = resolve(toolsPath, 'rg_search.sh');
	}

	async search(
		inputs: AgentToolkitSearchInput,
	): Promise<AgentToolkitSearchResult> {
		try {
			const { stdout } = await execAsync(
				`"${this.scriptPath}" "${inputs.pattern}" "${inputs.path}"`,
			);
			const result = JSON.parse(stdout) as AgentToolkitSearchResult;

			// Validate the result matches our schema
			if (result.tool !== 'ripgrep') {
				throw new Error('Unexpected tool result format');
			}

			return result;
		} catch (error) {
			return {
				tool: 'ripgrep',
				op: 'search',
				inputs,
				results: [],
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}
}

/**
 * Semgrep search tool adapter
 */
export class SemgrepAdapter implements SearchTool {
	private readonly scriptPath: string;

	constructor(
		toolsPath: string = resolve(process.cwd(), 'packages/agent-toolkit/tools'),
	) {
		this.scriptPath = resolve(toolsPath, 'semgrep_search.sh');
	}

	async search(
		inputs: AgentToolkitSearchInput,
	): Promise<AgentToolkitSearchResult> {
		try {
			const { stdout } = await execAsync(
				`"${this.scriptPath}" "${inputs.pattern}" "${inputs.path}"`,
			);
			const result = JSON.parse(stdout) as AgentToolkitSearchResult;

			// Validate the result matches our schema
			if (result.tool !== 'semgrep') {
				throw new Error('Unexpected tool result format');
			}

			return result;
		} catch (error) {
			return {
				tool: 'semgrep',
				op: 'search',
				inputs,
				results: [],
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}
}

/**
 * AST-grep search tool adapter
 */
export class AstGrepAdapter implements SearchTool {
	private readonly scriptPath: string;

	constructor(
		toolsPath: string = resolve(process.cwd(), 'packages/agent-toolkit/tools'),
	) {
		this.scriptPath = resolve(toolsPath, 'astgrep_search.sh');
	}

	async search(
		inputs: AgentToolkitSearchInput,
	): Promise<AgentToolkitSearchResult> {
		try {
			const { stdout } = await execAsync(
				`"${this.scriptPath}" "${inputs.pattern}" "${inputs.path}"`,
			);
			const result = JSON.parse(stdout) as AgentToolkitSearchResult;

			// Validate the result matches our schema
			if (result.tool !== 'ast-grep') {
				throw new Error('Unexpected tool result format');
			}

			return result;
		} catch (error) {
			return {
				tool: 'ast-grep',
				op: 'search',
				inputs,
				results: [],
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}
}
