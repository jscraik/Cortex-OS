import { spawn } from 'child_process';
import path from 'path';

/**
 * Generate embeddings for given texts using the Python MLX script.
 */
export async function generateEmbedding(
  texts: string | string[],
  pythonPath = 'python3',
): Promise<number[][]> {
  const arr = Array.isArray(texts) ? texts : [texts];
  if (arr.length === 0) return [];

  const scriptPath = path.resolve(__dirname, 'embed_mlx.py');

  return new Promise((resolve, reject) => {
    const child = spawn(pythonPath, [scriptPath, JSON.stringify(arr)]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('close', (code) => {
      if (code === 0) {
        try {
          const parsed = JSON.parse(stdout || '[]');
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error(stderr || `Embedding process failed with code ${code}`));
      }
    });
  });
}
