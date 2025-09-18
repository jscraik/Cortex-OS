/**
 * Integration test setup
 * Ensures proper test environment for integration and performance tests
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, vi } from 'vitest';

let __ASBR_TEST_TMP__: string | undefined;

// Set up test environment
beforeAll(async () => {
	// Basic env for tests
	process.env.NODE_ENV = 'test';
	process.env.ASBR_TEST_MODE = 'true';

	// Create isolated XDG directories in tmp so tests don't touch real user dirs
	const base = await mkdtemp(join(tmpdir(), 'asbr-test-'));
	__ASBR_TEST_TMP__ = base;

	// Point XDG homes to our temp base
	const xdgConfigHome = join(base, 'config');
	const xdgDataHome = join(base, 'data');
	const xdgStateHome = join(base, 'state');
	const xdgCacheHome = join(base, 'cache');

	process.env.XDG_CONFIG_HOME = xdgConfigHome;
	process.env.XDG_DATA_HOME = xdgDataHome;
	process.env.XDG_STATE_HOME = xdgStateHome;
	process.env.XDG_CACHE_HOME = xdgCacheHome;

	// Create ASBR-specific subdirs used by getXDGPaths()
	const configDir = join(xdgConfigHome, 'cortex', 'asbr');
	await mkdir(configDir, { recursive: true });

	// Minimal, valid config.yaml matching ConfigSchema
	const configYaml = `
events:
	transport: "socket"
	heartbeat_ms: 10000
	idle_timeout_ms: 60000
	max_task_events: 1000
	max_global_events: 10000
determinism:
	max_normalize_bytes: 5000000
	max_concurrency: 2
	normalize:
		newline: "LF"
		trim_trailing_ws: true
		strip_dates: true
`;

	// Seed config files expected by loaders
	await writeFile(join(configDir, 'config.yaml'), configYaml, 'utf-8');
	await writeFile(
		join(configDir, 'tokens.json'),
		JSON.stringify({ tokens: [], version: '1.0.0' }, null, 2),
		'utf-8',
	);
	// Optional: empty allowlist and policies
	await writeFile(join(configDir, 'mcp-allowlist.yaml'), '[]\n', 'utf-8').catch(() => {});

	// Keep test output tidy: rely on existing logger levels; avoid overriding console to satisfy lint rules
});

afterAll(async () => {
	// Cleanup any test artifacts and restore mocks
	vi.restoreAllMocks();
	if (__ASBR_TEST_TMP__) {
		// Recursively remove the temp dir
		await rm(__ASBR_TEST_TMP__, { recursive: true, force: true }).catch(() => {});
	}
});
