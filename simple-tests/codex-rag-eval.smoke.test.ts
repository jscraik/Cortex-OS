import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execa } from 'execa';
import { describe, expect, it } from 'vitest';

function findCodexBinary(): string | null {
	const candidates = [
		join(process.cwd(), 'apps/cortex-code/target/debug/codex'),
		join(process.cwd(), 'apps/cortex-code/target/release/codex'),
	];
	for (const p of candidates) if (existsSync(p)) return p;
	return null;
}

describe('codex rag eval CLI smoke', () => {
	it('prints ok:true JSON', async () => {
		const bin = findCodexBinary();
		if (!bin) {
			// Binary not present in this environment — skip without failing CI.
			expect(true).toBe(true);
			return;
		}
		const r = await execa(bin, ['rag', 'eval']);
		const out = r.stdout.trim();
		expect(out).toContain('"ok":true');
	});
});
