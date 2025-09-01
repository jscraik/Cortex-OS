/**
 * Enhanced Qwen3 Embedding Integration for Cortex RAG
 * Supports all Qwen3-Embedding models (0.6B, 4B, 8B)
 */
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import path, { join } from 'path';
import { buildQwen3EmbedScript } from './qwen3-script.js';
function assertSafeModelPath(p) {
    if (!/^[A-Za-z0-9_\/\.:-]+$/.test(p)) {
        throw new Error('Invalid model path');
    }
}
export class Qwen3Embedder {
    constructor(options = {}) {
        this.modelSize = options.modelSize || '4B';
        this.modelPath = path.resolve(options.modelPath || path.join(process.cwd(), `models/Qwen3-Embedding-${this.modelSize}`));
        assertSafeModelPath(this.modelPath);
        this.cacheDir = options.cacheDir || join(process.env.HF_HOME || tmpdir(), 'qwen3-embedding-cache');
        this.maxTokens = options.maxTokens || 512;
        this.batchSize = options.batchSize || 32;
        this.useGPU = options.useGPU ?? false;
    }
    async embed(texts) {
        if (texts.length === 0)
            return [];
        const results = [];
        for (let i = 0; i < texts.length; i += this.batchSize) {
            const batch = texts.slice(i, i + this.batchSize);
            const batchResults = await this.embedBatch(batch);
            results.push(...batchResults);
        }
        return results;
    }
    embedBatch(texts) {
        return this.embedWithModel(texts);
    }
    async embedWithModel(texts) {
        return new Promise((resolve, reject) => {
            const script = buildQwen3EmbedScript(this.modelPath, texts, this.maxTokens, this.useGPU);
            const python = spawn('python3', ['-c', script], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env, TRANSFORMERS_CACHE: this.cacheDir, HF_HOME: this.cacheDir },
            });
            let stdout = '';
            let stderr = '';
            python.stdout?.on('data', (data) => (stdout += data.toString()));
            python.stderr?.on('data', (data) => (stderr += data.toString()));
            const timer = setTimeout(() => {
                python.kill();
                reject(new Error('Qwen3 embedder timed out'));
            }, 30000);
            python.on('close', (code) => {
                clearTimeout(timer);
                if (code === 0) {
                    try {
                        const result = JSON.parse(stdout);
                        resolve(result.embeddings);
                    }
                    catch (error) {
                        reject(new Error(`Failed to parse embedding result: ${error}`));
                    }
                }
                else {
                    reject(new Error(`Python embedding process failed: ${stderr}`));
                }
            });
            python.on('error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
        });
    }
    async close() {
        // No persistent process to cleanup - using spawn for each batch
    }
}
export function createQwen3Embedder(options) {
    return new Qwen3Embedder(options);
}
export const Qwen3Presets = {
    development: () => createQwen3Embedder({ modelSize: '0.6B', batchSize: 64 }),
    production: () => createQwen3Embedder({ modelSize: '4B', batchSize: 32 }),
    research: () => createQwen3Embedder({ modelSize: '8B', batchSize: 16 }),
};
