import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// We test the module executes without throwing and prints expected keys when JSON flag is set.
// Deprecated: cortex-cli has been removed. Skip legacy test until ported to codex.
describe.skip('rag eval CLI smoke', async () => {
	it('runs and produces JSON with metrics', async () => {
		const mod = await import('../apps/cortex-cli/src/commands/rag/eval');
		const dataset = path.resolve(__dirname, './fixtures/golden.rag.dataset.json');

		// Build a tiny runner that calls the action with our params by reusing the exported command.
		const cmd = mod.ragEval;
		let buffer = '';
		const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
			buffer += String(chunk);
			return true as unknown as boolean;
		});
		await cmd.parseAsync(['eval', '--dataset', dataset, '--json']);
		spy.mockRestore();

		const parsed = JSON.parse(buffer.trim());
		expect(parsed).toHaveProperty('metrics');
		expect(parsed.metrics.ndcg).toBeGreaterThanOrEqual(0);
		expect(parsed.metrics.recall).toBeGreaterThanOrEqual(0);
		expect(parsed.metrics.precision).toBeGreaterThanOrEqual(0);
	});
});
