import { execa } from 'execa';
import { expect, test } from 'vitest';

// Ensure test-safe.sh launches the Node memory guard when --monitored flag is used
// This test relies on pgrep to detect the guard process.

test('test-safe.sh launches memory guard', async () => {
	const child = execa('bash', ['scripts/test-safe.sh', '--monitored', '--', '--passWithNoTests']);
	await new Promise((r) => setTimeout(r, 1000));
	const ps = await execa('pgrep', ['-fl', 'memory-guard.mjs'], {
		reject: false,
	});
	await child;
	expect(ps.stdout).toContain('memory-guard.mjs');
});
