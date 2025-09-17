import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MemoryPolicies } from '../../../src/integrations/memory-policies-config.js';
import {
	loadMemoryPoliciesFromEnv,
	loadMemoryPoliciesFromFile,
} from '../../../src/integrations/memory-policies-config.js';

describe('memory-policies-config (clean)', () => {
	let cwd: string;
	beforeEach(async () => {
		cwd = await mkdtemp(join(tmpdir(), 'mem-policies-'));
	});
	afterEach(async () => {
		delete process.env.AGENTS_MEMORY_POLICIES_FILE;
		delete process.env.AGENTS_MEMORY_POLICIES;
		await rm(cwd, { recursive: true, force: true });
	});

	it('loads policies from file', async () => {
		const file = join(cwd, 'policies.json');
		const policies: MemoryPolicies = {
			security: { namespace: 'agents:security', maxItemBytes: 1000 },
			documentation: { namespace: 'agents:docs', redactPII: true },
		};
		await writeFile(file, JSON.stringify(policies), 'utf8');
		const loaded = await loadMemoryPoliciesFromFile(file);
		expect(loaded).toEqual(policies);
	});

	it('prefers file over inline env', async () => {
		const file = join(cwd, 'file.json');
		await writeFile(
			file,
			JSON.stringify({ security: { namespace: 'file' } }),
			'utf8',
		);
		process.env.AGENTS_MEMORY_POLICIES_FILE = file;
		process.env.AGENTS_MEMORY_POLICIES = JSON.stringify({
			security: { namespace: 'inline' },
		});
		const loaded = await loadMemoryPoliciesFromEnv();
		expect(loaded?.security?.namespace).toBe('file');
	});

	it('falls back to inline JSON when file missing', async () => {
		process.env.AGENTS_MEMORY_POLICIES_FILE = join(cwd, 'missing.json');
		process.env.AGENTS_MEMORY_POLICIES = JSON.stringify({
			security: { namespace: 'inline' },
		});
		const loaded = await loadMemoryPoliciesFromEnv();
		expect(loaded?.security?.namespace).toBe('inline');
	});

	it('returns undefined when neither env present', async () => {
		const loaded = await loadMemoryPoliciesFromEnv();
		expect(loaded).toBeUndefined();
	});

	it('handles invalid inline JSON gracefully', async () => {
		process.env.AGENTS_MEMORY_POLICIES = '{invalid json';
		const loaded = await loadMemoryPoliciesFromEnv();
		expect(loaded).toBeUndefined();
	});
});

// EOF
