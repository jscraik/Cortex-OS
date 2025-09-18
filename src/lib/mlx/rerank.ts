import { spawn } from 'node:child_process';
import path from 'node:path';

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

	return new Promise((resolve, reject) => {
		const child = spawn(pythonPath, [scriptPath, JSON.stringify(payload)]);
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
