import { resolve } from 'node:path';
import type { AgentToolkitSearchInput, AgentToolkitSearchResult } from '@cortex-os/contracts';
import { safeExecFileWithRetry } from './securityBridge.js';
import type { SearchTool } from '../domain/ToolInterfaces.js';
import { resolveToolsDirFromOverride, type ToolsDirOverride } from './paths.js';

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

abstract class BaseSearchAdapter implements SearchTool {
	private readonly scriptPathPromise: Promise<string>;

	protected constructor(
		toolsPath: ToolsDirOverride,
		readonly scriptName: string,
	) {
		this.scriptPathPromise = resolveToolsDirFromOverride(toolsPath).then((dir) =>
			resolve(dir, scriptName),
		);
	}

	protected async getScriptPath(): Promise<string> {
		return this.scriptPathPromise;
	}

	public abstract search(inputs: AgentToolkitSearchInput): Promise<AgentToolkitSearchResult>;
}

/**
 * Ripgrep search tool adapter
 */
export class RipgrepAdapter extends BaseSearchAdapter {
	constructor(toolsPath?: ToolsDirOverride) {
		super(toolsPath, 'rg_search.sh');
	}

        async search(inputs: AgentToolkitSearchInput): Promise<AgentToolkitSearchResult> {
                try {
                        const { pattern, path } = inputs;
                        if (!pattern || !path) {
                                throw new Error('Invalid search input');
                        }
                        const scriptPath = await this.getScriptPath();
                        // CodeQL Fix #205: Use safeExecFileWithRetry instead of execWithRetry to prevent shell injection
                        const { stdout } = await safeExecFileWithRetry(scriptPath, [pattern, path], {
                                timeout: 30_000,
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
export class SemgrepAdapter extends BaseSearchAdapter {
	constructor(toolsPath?: ToolsDirOverride) {
		super(toolsPath, 'semgrep_search.sh');
	}

        async search(inputs: AgentToolkitSearchInput): Promise<AgentToolkitSearchResult> {
                try {
                        const { pattern, path } = inputs;
                        if (!pattern || !path) {
                                throw new Error('Invalid search input');
                        }
                        const scriptPath = await this.getScriptPath();
                        // CodeQL Fix #206: Use safeExecFileWithRetry instead of execWithRetry to prevent shell injection
                        const { stdout } = await safeExecFileWithRetry(scriptPath, [pattern, path], {
                                timeout: 40_000,
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
export class AstGrepAdapter extends BaseSearchAdapter {
	constructor(toolsPath?: ToolsDirOverride) {
		super(toolsPath, 'astgrep_search.sh');
	}

        async search(inputs: AgentToolkitSearchInput): Promise<AgentToolkitSearchResult> {
                try {
                        const { pattern, path } = inputs;
                        if (!pattern || !path) {
                                throw new Error('Invalid search input');
                        }
                        const scriptPath = await this.getScriptPath();
                        // CodeQL Fix #207: Use safeExecFileWithRetry instead of execWithRetry to prevent shell injection
                        const { stdout } = await safeExecFileWithRetry(scriptPath, [pattern, path], {
                                timeout: 40_000,
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
