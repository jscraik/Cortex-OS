import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { getStatePath } from '../../src/platform/xdg';
import { startRuntime } from '../../src/runtime';

interface RuntimeHandle {
	httpUrl: string;
	mcpUrl: string;
	stop: () => Promise<void>;
	events: {
		emitEvent: (event: { type: string; data: Record<string, unknown> }) => Promise<void>;
	};
}

let runtime: RuntimeHandle;
let tempDir: string;

beforeAll(async () => {
	const root = process.env.CORTEX_OS_TMP ?? tmpdir();
	tempDir = await mkdtemp(join(root, 'events-'));
	process.env.XDG_CONFIG_HOME = join(tempDir, 'config');
	process.env.XDG_STATE_HOME = join(tempDir, 'state');
	runtime = (await startRuntime()) as RuntimeHandle;
});

afterAll(async () => {
	await runtime.stop();
	delete process.env.XDG_CONFIG_HOME;
	delete process.env.XDG_STATE_HOME;
	await rm(tempDir, { recursive: true, force: true });
});

describe('runtime event stream', () => {
	test('broadcasts emitted events over SSE', async () => {
		const response = await fetch(`${runtime.httpUrl}/v1/events?stream=sse`, {
			headers: { Accept: 'text/event-stream' },
		});
		expect(response.status).toBe(200);
		const reader = response.body?.getReader();
		if (!reader) throw new Error('missing reader');
		const decoder = new TextDecoder();

		// Consume initial heartbeat
		await reader.read();

		await runtime.events.emitEvent({
			type: 'runtime.test',
			data: { foo: 'bar' },
		});

		const { value } = await reader.read();
		if (!value) throw new Error('no event payload');
		const text = decoder.decode(value);
		expect(text).toContain('event: runtime.test');
		expect(text).toContain('"foo":"bar"');
		await reader.cancel();
	});

	test('persists events to ledger', async () => {
		await runtime.events.emitEvent({
			type: 'runtime.persist.test',
			data: { persisted: true },
		});

		const ledgerPath = getStatePath('events', 'ledger.ndjson');
		const contents = await readFile(ledgerPath, 'utf-8');
		expect(contents).toContain('runtime.persist.test');
	});
});
