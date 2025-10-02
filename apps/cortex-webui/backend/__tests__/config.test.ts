import { beforeEach, describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config/config.ts';

describe('config validation', () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	it('throws when JWT_SECRET is missing', () => {
		delete process.env.JWT_SECRET;
		process.env.DATABASE_PATH = './data/test.db';
		expect(() => loadConfig()).toThrow(/JWT_SECRET/);
	});

	it('throws when DATABASE_PATH is missing', () => {
		process.env.JWT_SECRET = 'supersecret';
		delete process.env.DATABASE_PATH;
		expect(() => loadConfig()).toThrow(/DATABASE_PATH/);
	});
});
