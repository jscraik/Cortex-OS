/**
 * Test Config Helper for ASBR
 * Provides an idempotent function to ensure a minimal valid ASBR config.yaml
 * exists in isolated XDG directories for unit tests that rely on config loading.
 */

import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let __ASBR_TEST_BASE__: string | undefined;
let __ASBR_CONFIG_READY__ = false;

/**
 * Minimal valid config YAML matching ConfigSchema.
 * Keep formatting simple (tabs not required) and aligned with integration setup.
 */
const MINIMAL_CONFIG_YAML = `events:
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

export interface EnsureTestConfigResult {
	baseDir: string;
	configPath: string;
}

/**
 * ensureTestASBRConfig
 *
 * Idempotent setup for unit tests. If XDG env vars already point to a cortex/asbr
 * config directory containing config.yaml, it will leave them intact. Otherwise it
 * creates an isolated temp directory structure and writes a minimal config.
 *
 * Returns paths so callers can inspect or add supplemental test fixtures.
 */
export async function ensureTestASBRConfig(): Promise<EnsureTestConfigResult> {
	if (__ASBR_CONFIG_READY__ && __ASBR_TEST_BASE__) {
		return {
			baseDir: __ASBR_TEST_BASE__,
			configPath: join(
				process.env.XDG_CONFIG_HOME || join(__ASBR_TEST_BASE__, 'config'),
				'cortex',
				'asbr',
				'config.yaml',
			),
		};
	}

	process.env.NODE_ENV = process.env.NODE_ENV || 'test';
	process.env.ASBR_TEST_MODE = 'true';

	// If user already set XDG vars and config exists, reuse.
	if (process.env.XDG_CONFIG_HOME) {
		const existing = join(process.env.XDG_CONFIG_HOME, 'cortex', 'asbr', 'config.yaml');
		if (existsSync(existing)) {
			__ASBR_CONFIG_READY__ = true;
			return { baseDir: process.env.XDG_CONFIG_HOME, configPath: existing };
		}
	}

	// Create fresh isolated base once per test process
	if (!__ASBR_TEST_BASE__) {
		__ASBR_TEST_BASE__ = await mkdtemp(join(tmpdir(), 'asbr-unit-'));
	}

	const base = __ASBR_TEST_BASE__;
	const xdgConfigHome = join(base, 'config');
	const xdgDataHome = join(base, 'data');
	const xdgStateHome = join(base, 'state');
	const xdgCacheHome = join(base, 'cache');

	process.env.XDG_CONFIG_HOME = xdgConfigHome;
	process.env.XDG_DATA_HOME = xdgDataHome;
	process.env.XDG_STATE_HOME = xdgStateHome;
	process.env.XDG_CACHE_HOME = xdgCacheHome;

	const configDir = join(xdgConfigHome, 'cortex', 'asbr');
	await mkdir(configDir, { recursive: true });

	const configPath = join(configDir, 'config.yaml');
	if (!existsSync(configPath)) {
		await writeFile(configPath, MINIMAL_CONFIG_YAML, 'utf-8');
	}

	// Optional allowlist seed (empty array)
	const allowlistPath = join(configDir, 'mcp-allowlist.yaml');
	if (!existsSync(allowlistPath)) {
		await writeFile(allowlistPath, '[]\n', 'utf-8').catch(() => {});
	}

	__ASBR_CONFIG_READY__ = true;
	return { baseDir: base, configPath };
}

export default ensureTestASBRConfig;
