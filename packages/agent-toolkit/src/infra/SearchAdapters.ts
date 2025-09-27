import type { AgentToolkitSearchInput, AgentToolkitSearchResult } from '@cortex-os/contracts';
import { resolve } from 'node:path';
import type { SearchTool } from '../domain/ToolInterfaces.js';
import { execWithRetry } from './execUtil.js';

/**
 * Ripgrep search tool adapter
 */
export class RipgrepAdapter implements SearchTool {
	private readonly scriptPath: string;

	constructor(toolsPath: string = resolve(process.cwd(), 'packages/agent-toolkit/tools')) {
		this.scriptPath = resolve(toolsPath, 'rg_search.sh');
	}

	async search(inputs: AgentToolkitSearchInput): Promise<AgentToolkitSearchResult> {
		try {
			const cmd = `"${this.scriptPath}" "${inputs.pattern}" "${inputs.path}"`;
			const { stdout } = await execWithRetry(cmd, {
				timeoutMs: 30_000,
				retries: 1,
				backoffMs: 200,
			});
			const parsed = JSON.parse(stdout) as AgentToolkitSearchResult;
			if (parsed.tool !== 'ripgrep') throw new Error('Unexpected tool result format');
			return parsed;
		} catch (error) {
			return summarizeSearchError('ripgrep', inputs, error);
		}
	}
}

/**
 * Semgrep search tool adapter
 */
export class SemgrepAdapter implements SearchTool {
	private readonly scriptPath: string;

	constructor(toolsPath: string = resolve(process.cwd(), 'packages/agent-toolkit/tools')) {
		this.scriptPath = resolve(toolsPath, 'semgrep_search.sh');
	}

	async search(inputs: AgentToolkitSearchInput): Promise<AgentToolkitSearchResult> {
		try {
			const cmd = `"${this.scriptPath}" "${inputs.pattern}" "${inputs.path}"`;
			const { stdout } = await execWithRetry(cmd, {
				timeoutMs: 40_000,
				retries: 1,
				backoffMs: 250,
			});
			const parsed = JSON.parse(stdout) as AgentToolkitSearchResult;
			if (parsed.tool !== 'semgrep') throw new Error('Unexpected tool result format');
			return parsed;
		} catch (error) {
			return summarizeSearchError('semgrep', inputs, error);
		}
	}
}

/**
 * AST-grep search tool adapter
 */
export class AstGrepAdapter implements SearchTool {
	private readonly scriptPath: string;

	constructor(toolsPath: string = resolve(process.cwd(), 'packages/agent-toolkit/tools')) {
		this.scriptPath = resolve(toolsPath, 'astgrep_search.sh');
	}

	async search(inputs: AgentToolkitSearchInput): Promise<AgentToolkitSearchResult> {
		try {
			const cmd = `"${this.scriptPath}" "${inputs.pattern}" "${inputs.path}"`;
			const { stdout } = await execWithRetry(cmd, {
				timeoutMs: 40_000,
				retries: 1,
				backoffMs: 250,
			});
			const parsed = JSON.parse(stdout) as AgentToolkitSearchResult;
			if (parsed.tool !== 'ast-grep') throw new Error('Unexpected tool result format');
			return parsed;
		} catch (error) {
			return summarizeSearchError('ast-grep', inputs, error);
		}
	}
}

function summarizeSearchError(
	tool: 'ripgrep' | 'semgrep' | 'ast-grep',
	inputs: AgentToolkitSearchInput,
	error: unknown,
): AgentToolkitSearchResult {
	return {
		tool,
		op: 'search',
		inputs,
		results: [],
		error: error instanceof Error ? error.message : 'Unknown error',
	};
}
