import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('provideOrchestration run bundle integration', () => {
	let runsRoot: string;

	beforeEach(async () => {
		runsRoot = await mkdtemp(join(tmpdir(), 'cortex-run-http-'));
		process.env.CORTEX_RUNS_DIR = runsRoot;
		vi.resetModules();
	});

	afterEach(async () => {
		delete process.env.CORTEX_RUNS_DIR;
		await rm(runsRoot, { recursive: true, force: true });
		vi.resetModules();
	});

	it('emits run bundle files after orchestrating a task', async () => {
		const { provideOrchestration } = await import('../../src/services.js');
		const orchestration = provideOrchestration();
		const task = {
			id: 'bundle-test-run',
			title: 'Bundle Integration Test',
			description: 'Ensure run bundle emission',
		} as Record<string, unknown>;

		const result = await orchestration.run(task, [], { metadata: { test: true } }, []);
		expect(result).toBeDefined();

		await orchestration.shutdown?.();

		const runDir = join(runsRoot, 'bundle-test-run');
		const files = await readdir(runDir);
		expect(files.sort()).toEqual([
			'citations.json',
			'energy.jsonl',
			'messages.jsonl',
			'policy_decisions.json',
			'prompts.json',
			'run.json',
		]);

		const runRecord = JSON.parse(await readFile(join(runDir, 'run.json'), 'utf8')) as Record<
			string,
			unknown
		>;
		expect(runRecord.status).toBe('completed');
		expect(runRecord.promptCount).toBeGreaterThanOrEqual(0);
	});
});
