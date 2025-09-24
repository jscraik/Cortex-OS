import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import { env as runtimeEnv } from 'node:process';

const SAFE_PATH_ENTRIES = [
	'/usr/local/sbin',
	'/usr/local/bin',
	'/usr/sbin',
	'/usr/bin',
	'/bin',
	'/sbin',
];

const KNOWN_PYTHON_BINARIES = [
	'/opt/homebrew/bin/python3',
	'/usr/local/bin/python3',
	'/usr/bin/python3',
];

function resolvePythonExecutable(pythonPath: string): string {
	if (pythonPath && path.isAbsolute(pythonPath) && existsSync(pythonPath)) {
		return pythonPath;
	}

	const discoveredBinary = KNOWN_PYTHON_BINARIES.find((candidate) => existsSync(candidate));
	if (discoveredBinary) {
		return discoveredBinary;
	}

	return pythonPath;
}

function createSanitizedEnv(): NodeJS.ProcessEnv {
	const baseEnv: NodeJS.ProcessEnv = { ...runtimeEnv };
	const safeEntries = SAFE_PATH_ENTRIES.filter((entry) => existsSync(entry));
	if (safeEntries.length > 0) {
		return {
			...baseEnv,
			PATH: safeEntries.join(path.delimiter),
		};
	}

	const fromProcess = runtimeEnv.PATH ?? '';
	const filtered = fromProcess
		.split(path.delimiter)
		.filter((entry) => entry && path.isAbsolute(entry) && !entry.includes('..'));

	return {
		...baseEnv,
		PATH: filtered.join(path.delimiter),
	};
}

export interface RerankResult {
	text: string;
	score: number;
}

/**
 * Rerank documents relative to a query using Python MLX script.
 */
export async function rerankDocuments(
	query: string,
	docs: string[],
	topK?: number,
	pythonPath = 'python3',
): Promise<RerankResult[]> {
	if (docs.length === 0) return [];

	const scriptPath = path.resolve(__dirname, 'rerank_mlx.py');
	const payload = { query, docs, top_k: topK ?? docs.length };
	const executable = resolvePythonExecutable(pythonPath);
	const env = createSanitizedEnv();

	return new Promise((resolve, reject) => {
		const child = spawn(executable, [scriptPath, JSON.stringify(payload)], { env });
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (d) => {
			stdout += d.toString();
		});
		child.stderr.on('data', (d) => {
			stderr += d.toString();
		});
		child.on('close', (code) => {
			if (code === 0) {
				try {
					const parsed = JSON.parse(stdout || '[]');
					resolve(parsed);
				} catch (err) {
					reject(err instanceof Error ? err : new Error(String(err)));
				}
			} else {
				reject(new Error(stderr || `Rerank process failed with code ${code}`));
			}
		});
	});
}
