import { runProcess } from './run-process.js';

const PYTHON_ENTRYPOINT = 'cortex_py.rag.bridge';
const DEFAULT_PROJECT = 'apps/cortex-py';

export interface LlamaIndexBridgeOptions {
	timeoutMs?: number;
	env?: NodeJS.ProcessEnv;
}

export interface LlamaIndexBridgeResult {
	status: string;
	settings?: Record<string, unknown>;
	runtime?: string;
	[key: string]: unknown;
}

export async function runLlamaIndexBridge(
	payload: Record<string, unknown>,
	options: LlamaIndexBridgeOptions = {},
): Promise<LlamaIndexBridgeResult> {
	const args = ['run', '--project', DEFAULT_PROJECT, 'python', '-m', PYTHON_ENTRYPOINT];
	return runProcess<LlamaIndexBridgeResult>('uv', args, {
		input: JSON.stringify(payload),
		parseJson: true,
		timeoutMs: options.timeoutMs ?? 60_000,
		env: options.env,
	});
}
