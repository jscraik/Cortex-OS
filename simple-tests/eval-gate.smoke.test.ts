import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// Deprecated: cortex-cli has been removed. Skip legacy test until ported to codex.
describe.skip('eval gate CLI smoke', async () => {
	it('runs and emits JSON with outcomes', async () => {
		const mod = await import('../apps/cortex-cli/src/commands/eval/gate');
		const cmd = mod.evalGate;
		const cfg = path.resolve(__dirname, '../.cortex/eval.config.json');

		let buffer = '';
		const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
			buffer += String(chunk);
			return true as unknown as boolean;
		});
		await cmd.parseAsync(['gate', '--config', cfg, '--json']);
		spy.mockRestore();

		const parsed = JSON.parse(buffer.trim());
		expect(parsed).toHaveProperty('outcomes');
		expect(parsed.outcomes.length).toBeGreaterThan(0);
		expect(typeof parsed.pass).toBe('boolean');
	});
});
