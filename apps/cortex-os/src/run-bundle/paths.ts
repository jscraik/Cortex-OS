import os from 'node:os';
import { join } from 'node:path';

export function getRunsRoot(): string {
	return process.env.CORTEX_RUNS_DIR ?? join(os.homedir(), '.Cortex-OS', 'runs');
}

export function resolveRunPath(runId: string): string {
	return join(getRunsRoot(), runId);
}
