/**
 * Global test setup for ASBR unit tests.
 * Ensures minimal config is present before any tests run.
 */
import { beforeAll } from 'vitest';
import { ensureTestASBRConfig } from './utils/test-config.js';

beforeAll(async () => {
	await ensureTestASBRConfig();
});
