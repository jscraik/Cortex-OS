import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanRepoForPlaceholders } from '../../scripts/brainwav-production-guard.ts';

const forbiddenMotifs = [
	'"tool_dispatch"',
	"'tool_dispatch'",
	'`tool_dispatch`',
	'tool_dispatch(',
	'tool_dispatch.',
];

const allowlist: RegExp[] = [
	/^tests\/regression\/__fixtures__\/.*$/, // baseline fixtures
	/^packages\/commands\/(?:tests|__fixtures__)\/.*$/,
	/^packages\/agents\/tests\/.*$/,
	/^packages\/agents\/[^/]*\.md$/,
	/^packages\/hooks\/src\/__tests__\/.*$/,
	/^packages\/orchestration\/tests\/.*$/,
	/^apps\/[^/]+\/tests\/.*$/, // Phase 9: apps directory tests included in regression allowlist
	/^apps\/[^/]+\/[^/]*\.test\./, // Phase 9: apps directory test files
	/^apps\/[^/]+\/[^/]*\.spec\./, // Phase 9: apps directory spec files
	/^apps\/[^/]+\/__tests__\/.*$/, // Phase 9: apps directory test folders
	/^[^/]*\.spec\./,
	/^[^/]*\.test\./,
	/^[^/]*__tests__\/.*$/,
	/^simple-tests\/.*$/,
];

const monitoredRoots = [
	'packages/commands',
	'packages/agents',
	'packages/orchestration',
	'packages/hooks',
	'packages/services',
	'packages/memories',
	'apps',
];

const monitoredExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md'];

describe('tool dispatch allow-list guard', () => {
	it('flags tool_dispatch references outside approved contexts', async () => {
		const findings = await Promise.all(
			monitoredRoots.map((rootDir) =>
				scanRepoForPlaceholders(forbiddenMotifs, allowlist, {
					rootDir: path.join(process.cwd(), rootDir),
					extensions: monitoredExtensions,
				}),
			),
		);
		const hits = findings.flat();
		if (hits.length > 0) {
			const report = hits
				.map(({ file, token }) => `• ${path.relative(process.cwd(), file)} :: ${token}`)
				.sort((a, b) => a.localeCompare(b))
				.join('\n');
			throw new Error(
				'tool_dispatch references leaked outside sanctioned contexts. Ensure slash command metadata and dispatch wrappers enforce allow-lists.\n' +
					report,
			);
		}
		expect(hits).toEqual([]);
	});
});
