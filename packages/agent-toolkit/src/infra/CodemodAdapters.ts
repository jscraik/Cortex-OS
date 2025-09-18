import { exec } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import type { AgentToolkitCodemodInput, AgentToolkitCodemodResult } from '@cortex-os/contracts';
import type { CodemodTool } from '../domain/ToolInterfaces.js';

const execAsync = promisify(exec);

/**
 * Comby code modification tool adapter
 */
export class CombyAdapter implements CodemodTool {
	private readonly scriptPath: string;

	constructor(toolsPath: string = resolve(process.cwd(), 'packages/agent-toolkit/tools')) {
		this.scriptPath = resolve(toolsPath, 'comby_rewrite.sh');
	}

	async rewrite(inputs: AgentToolkitCodemodInput): Promise<AgentToolkitCodemodResult> {
		try {
			const { stdout } = await execAsync(
				`"${this.scriptPath}" "${inputs.find}" "${inputs.replace}" "${inputs.path}"`,
			);
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
