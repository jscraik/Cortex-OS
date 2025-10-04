import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanRepoForPlaceholders } from '../../scripts/brainwav-production-guard';

const forbiddenToken = 'Math.random';
const allowlist = [
	/\/tests\//,
	/\/__tests__\//,
	/\/__fixtures__\//,
	/\/simple-tests\//,
	/\/examples\//,
	/\.spec\./,
	/\.test\./,
	/\/docs\//,
	/README\.md$/,
];

const monitoredExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py'];

describe('brAInwav production random guard', () => {
	it('should block Math.random usage in runtime code', async () => {
		const targetDirectories = [
			'packages/agents',
			'packages/orchestration/src/master-agent-loop',
			'packages/services/orchestration/src/lib',
		];

		const findings = await Promise.all(
			targetDirectories.map((dir) =>
				scanRepoForPlaceholders([forbiddenToken], allowlist, {
					rootDir: path.join(process.cwd(), dir),
					extensions: monitoredExtensions,
				}),
			),
		);

		const occurrences = findings.flat();

		if (occurrences.length > 0) {
			const report = occurrences
				.map(({ file }) => `• ${path.relative(process.cwd(), file)}`)
				.sort((a, b) => a.localeCompare(b))
				.join('\n');

			throw new Error(
				`Math.random detected in production paths:\n${report}\n` +
					'Use secure, deterministic ID/metric sources before merging.',
			);
		}

		expect(occurrences).toEqual([]);
	});
});
