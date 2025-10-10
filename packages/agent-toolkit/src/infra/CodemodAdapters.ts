import { resolve } from 'node:path';
import { promisify } from 'node:util';
import type { AgentToolkitCodemodInput, AgentToolkitCodemodResult } from '@cortex-os/contracts';
import { safeExecFile } from '@cortex-os/security';
import type { CodemodTool } from '../domain/ToolInterfaces.js';
import { resolveToolsDirFromOverride, type ToolsDirOverride } from './paths.js';

/**
 * Comby code modification tool adapter
 */
export class CombyAdapter implements CodemodTool {
	private readonly scriptPathPromise: Promise<string>;

	constructor(toolsPath?: ToolsDirOverride) {
		this.scriptPathPromise = resolveToolsDirFromOverride(toolsPath).then((dir) =>
			resolve(dir, 'comby_rewrite.sh'),
		);
	}

	async rewrite(inputs: AgentToolkitCodemodInput): Promise<AgentToolkitCodemodResult> {
		try {
			const scriptPath = await this.scriptPathPromise;
			// CodeQL Fix #204: Use safeExecFile instead of exec to prevent shell injection
			const { stdout } = await safeExecFile(scriptPath, [inputs.find, inputs.replace, inputs.path]);
			const result = JSON.parse(stdout) as AgentToolkitCodemodResult;

			// Validate the result matches our schema
			if (result.tool !== 'comby') {
				throw new Error('Unexpected tool result format');
			}

			return result;
		} catch (error) {
			return {
				tool: 'comby',
				op: 'rewrite',
				inputs,
				results: [],
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}
}
