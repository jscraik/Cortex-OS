import { execa } from 'execa';
import { expect, test } from 'vitest';

// Ensure test-safe.sh launches the Node memory guard when --monitored flag is used
// This test relies on pgrep to detect the guard process.

test('test-safe.sh launches memory guard', { timeout: 15000 }, async () => {
	const child = execa(
		'bash',
		[
			'scripts/test-safe.sh',
			'--monitored',
			'--config',
			'tests/vitest.config.ts',
			'--',
			'--passWithNoTests',
		],
		{
			env: {
				...process.env,
				CORTEX_TEST_SAFE_SKIP_RUN: '1',
				CORTEX_TEST_SAFE_GUARD_SLEEP: '2',
			},
		},
	);
	await new Promise((r) => setTimeout(r, 1000));
	const result = await child;
	expect(result.stderr).toContain('memory guard started');
});
