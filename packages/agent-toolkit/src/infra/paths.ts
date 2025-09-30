import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export async function resolveToolsDir(): Promise<string> {
	const candidates = [
		process.env.AGENT_TOOLKIT_TOOLS_DIR,
		process.env.CORTEX_HOME && join(process.env.CORTEX_HOME, 'tools/agent-toolkit'),
		join(homedir(), '.Cortex-OS/tools/agent-toolkit'),
		resolve(process.cwd(), 'packages/agent-toolkit/tools'),
	].filter(Boolean) as string[];

	for (const dir of candidates) {
		try {
			await access(dir);
			return dir;
		} catch {
			/* continue searching */
		}
	}

	throw new Error('agent-toolkit tools directory not found');
}

export type ToolsDirOverride = string | Promise<string> | undefined;

export function resolveToolsDirFromOverride(override?: ToolsDirOverride): Promise<string> {
	return override ? Promise.resolve(override) : resolveToolsDir();
}
