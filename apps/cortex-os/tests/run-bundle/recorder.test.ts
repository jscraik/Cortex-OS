import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PromptCapture } from '@cortex-os/prompts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RunBundleRecorder } from '../../src/run-bundle/recorder.js';
import { initRunBundle } from '../../src/run-bundle/writer.js';

const PROMPT_CAPTURE: PromptCapture = {
	id: 'prompt.test.example',
	version: 'v1',
	sha256: 'abc123',
	variables: ['topic'],
};

function createNowStub() {
	const base = Date.UTC(2025, 0, 1, 0, 0, 0);
	let counter = 0;
	return () => new Date(base + counter++ * 1_000);
}

describe('RunBundleRecorder', () => {
	let runsRoot: string;

	beforeEach(async () => {
		runsRoot = await mkdtemp(join(tmpdir(), 'cortex-run-bundle-'));
	});

	afterEach(async () => {
		await rm(runsRoot, { recursive: true, force: true });
	});

	it('writes run metadata and artifacts on successful completion', async () => {
		const writer = await initRunBundle({ id: 'run-success', rootDir: runsRoot });
		const recorder = new RunBundleRecorder({
			runId: 'run-success',
			writer,
			task: { id: 'run-success', title: 'Recorder Success', description: 'unit-test' },
			agents: [{ id: 'agent-1', role: 'planner', status: 'available' }],
			context: { source: 'unit-test', metadata: { env: 'test' } },
			now: createNowStub(),
		});

		await recorder.start();
		await recorder.recordPrompts([PROMPT_CAPTURE]);

		const result = {
			output: 'bundle-created',
			ctx: {
				citations: [{ source: 'doc.md', page: 3 }],
				routing: { decision: { selectedAgent: 'agent-1', confidence: 0.9 } },
				telemetry: [
					{
						eventId: 'evt-1',
						timestamp: '2025-01-01T00:00:01.000Z',
						source: 'master-agent-loop',
						eventType: 'resource_allocated',
						payload: { metrics: { cpuUtilizationPercent: 64 } },
					},
				],
			},
			messages: [{ role: 'assistant', type: 'ai', content: 'All good' }],
		};

		await recorder.complete(result);

		const runDir = join(runsRoot, 'run-success');
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
		expect(runRecord.startedAt).toBe('2025-01-01T00:00:00.000Z');
		expect(runRecord.finishedAt).toBe('2025-01-01T00:00:01.000Z');
		expect(runRecord.durationMs).toBe(1000);
		expect(runRecord.promptCount).toBe(1);
		expect(runRecord.messageCount).toBe(1);
		expect(runRecord.energySampleCount).toBe(1);
		expect(runRecord.output).toBe('bundle-created');

		const prompts = JSON.parse(
			await readFile(join(runDir, 'prompts.json'), 'utf8'),
		) as PromptCapture[];
		expect(prompts).toEqual([PROMPT_CAPTURE]);

		const messageLines = (await readFile(join(runDir, 'messages.jsonl'), 'utf8'))
			.trim()
			.split('\n');
		expect(messageLines).toHaveLength(1);
		const message = JSON.parse(messageLines[0]) as Record<string, unknown>;
		expect(message.role).toBe('assistant');
		expect(message.content).toBe('All good');

		const citations = JSON.parse(
			await readFile(join(runDir, 'citations.json'), 'utf8'),
		) as unknown[];
		expect(citations).toHaveLength(1);

		const policyDecisions = JSON.parse(
			await readFile(join(runDir, 'policy_decisions.json'), 'utf8'),
		) as unknown[];
		expect(policyDecisions).toEqual([{ selectedAgent: 'agent-1', confidence: 0.9 }]);

		const energyLines = (await readFile(join(runDir, 'energy.jsonl'), 'utf8')).trim().split('\n');
		expect(energyLines).toHaveLength(1);
		const energyEntry = JSON.parse(energyLines[0]) as Record<string, unknown>;
		expect(energyEntry.eventId).toBe('evt-1');
		expect(energyEntry.payload).toMatchObject({ metrics: { cpuUtilizationPercent: 64 } });
	});

	it('captures failure state when orchestration fails', async () => {
		const writer = await initRunBundle({ id: 'run-failure', rootDir: runsRoot });
		const recorder = new RunBundleRecorder({
			runId: 'run-failure',
			writer,
			task: { id: 'run-failure', title: 'Recorder Failure', description: 'unit-test' },
			agents: [],
			context: { source: 'unit-test' },
			now: createNowStub(),
		});

		await recorder.start();

		const error = new Error('test failure');
		await recorder.fail(error);

		const runDir = join(runsRoot, 'run-failure');
		const runRecord = JSON.parse(await readFile(join(runDir, 'run.json'), 'utf8')) as Record<
			string,
			unknown
		>;
		expect(runRecord.status).toBe('failed');
		expect(runRecord.error).toMatchObject({ name: 'Error', message: 'test failure' });
		expect(runRecord.promptCount).toBe(0);
		expect(runRecord.messageCount).toBe(0);
		expect(runRecord.energySampleCount).toBe(0);

		for (const filename of [
			'messages.jsonl',
			'citations.json',
			'policy_decisions.json',
			'energy.jsonl',
			'prompts.json',
		]) {
			const contents = await readFile(join(runDir, filename), 'utf8');
			expect(contents).toBeTruthy();
		}
	});
});
