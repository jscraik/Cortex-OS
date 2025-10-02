import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildChunkedContext } from '../semantics/ContextBuilder.js';

const saveEnv = () => ({ ...process.env });

describe('Tree-sitter feature flag and budget trimming', () => {
	let ENV: NodeJS.ProcessEnv;
	beforeEach(() => {
		ENV = saveEnv();
	});
	afterEach(() => {
		process.env = ENV;
	});

	it('does not attempt Tree-sitter when disabled', async () => {
		delete process.env.CORTEX_TS_BOUNDARIES;
		const dir = await mkdtemp(join(tmpdir(), 'atk-'));
		const f = join(dir, 'demo');
		await writeFile(f, 'export function a() { return 1 }');
		const ctx = await buildChunkedContext({
			files: [f],
			useTreeSitter: false,
			tokenBudget: { maxTokens: 100 },
		});
		expect(ctx.totalTokens).toBeGreaterThan(0);
		await rm(dir, { recursive: true, force: true });
	});

	it('reads grammar paths from env when enabled (graceful fallback)', async () => {
		process.env.CORTEX_TS_BOUNDARIES = '1';
		process.env.CORTEX_TS_GRAMMAR_TS = '/nonexistent/typescript.wasm'; // will fallback
		const dir = await mkdtemp(join(tmpdir(), 'atk-'));
		const f = join(dir, 'demo');
		await writeFile(f, 'export function b() { return 2 }');
		const ctx = await buildChunkedContext({
			files: [f],
			useTreeSitter: true,
			tokenBudget: { maxTokens: 200 },
		});
		expect(ctx.totalTokens).toBeGreaterThan(0);
		await rm(dir, { recursive: true, force: true });
	});

	it('prunes aggressively under tiny budgets', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'atk-'));
		const f = join(dir, 'big.py');
		await writeFile(f, 'def x():\n    pass\n'.repeat(200));
		const ctx = await buildChunkedContext({
			files: [f],
			tokenBudget: { maxTokens: 20, trimToTokens: 10 },
		});
		expect(ctx.totalTokens).toBeLessThanOrEqual(20);
		await rm(dir, { recursive: true, force: true });
	});

	it('handles empty/missing files gracefully', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'atk-'));
		const missing = join(dir, 'missing.go');
		const ctx = await buildChunkedContext({ files: [missing], tokenBudget: { maxTokens: 50 } });
		expect(ctx.chunks.length).toBe(0);
		await rm(dir, { recursive: true, force: true });
	});
});
