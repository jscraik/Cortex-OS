import { describe, it, expect } from 'vitest';
import { MLXEmbedder } from '../src/adapters/embedder.mlx.js';
import { NodePythonRunner } from '../src/adapters/python-runner.js';

class FakeRunner extends NodePythonRunner {
  async run(): Promise<string> {
    return JSON.stringify({ embeddings: [[0.1]] });
  }
}

describe('MLXEmbedder fallback', () => {
  it('falls back to python when service unavailable', async () => {
    const embedder = new MLXEmbedder('qwen3-0.6b', new FakeRunner());
    delete process.env.MLX_SERVICE_URL;
    const res = await embedder.embed(['hi']);
    expect(res[0][0]).toBeCloseTo(0.1);
  });
});
