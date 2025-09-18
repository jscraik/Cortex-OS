import path from 'node:path';

/**
 * Generate embeddings for given texts using the Python MLX script.
 */
export async function generateEmbedding(
	texts: string | string[],
	pythonPath = 'python3',
	timeoutMs = 30000,
): Promise<number[][]> {
	const arr = Array.isArray(texts) ? texts : [texts];
	if (arr.length === 0) return [];

	const scriptPath = path.resolve(__dirname, 'embed_mlx.py');
	// Use centralized Python runner for consistent PYTHONPATH/env handling
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-expect-error - dynamic import crosses package boundaries; resolved at runtime
	const { runPython } = await import('../../../libs/python/exec.js');

	const run = runPython.bind(null, scriptPath, [JSON.stringify(arr)], {
		python: pythonPath,
	} as unknown as Record<string, unknown>);

	const timer = new Promise<string>((_, reject) =>
		setTimeout(
			() =>
				reject(new Error(`Embedding process timed out after ${timeoutMs}ms`)),
			timeoutMs,
		),
	);

	const out = await Promise.race([run(), timer]);
	try {
		const parsed = JSON.parse(String(out || '[]')) as number[][];
		return parsed;
	} catch (err) {
		throw new Error(`Failed to parse embedding output: ${err}`);
	}
}
