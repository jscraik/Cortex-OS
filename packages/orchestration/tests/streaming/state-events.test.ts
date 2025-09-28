import { describe, expect, it } from 'vitest';
import { createCerebrumGraph } from '../../src/langgraph/create-cerebrum-graph.js';
import {
	LangGraphStreamCoordinator,
	type LangGraphStreamEnvelope,
	type StreamClient,
	streamGraphEvents,
} from '../../src/langgraph/streaming.js';

class MemoryEventStream implements StreamClient {
	chunks: string[] = [];

	async send(message: string): Promise<void> {
		this.chunks.push(message);
	}

	closeCalls: Array<{ code?: number; reason?: string }> = [];

	close(code?: number, reason?: string): void {
		this.closeCalls.push({ code, reason });
	}
}

describe('LangGraph event stream formatting', () => {
	it('formats SSE payloads with brAInwav branding and forwards publishers', async () => {
		const graph = createCerebrumGraph();
		const coordinator = new LangGraphStreamCoordinator();
		const client = new MemoryEventStream();
		coordinator.addClient(client);

		const published: LangGraphStreamEnvelope[] = [];
		const summary = await streamGraphEvents(graph, { input: 'stream me' }, coordinator, {
			runId: 'sse-run',
			publish: async (envelope) => {
				published.push(envelope);
			},
			metadata: { surface: 'test' },
		});

		expect(summary.runId).toBe('sse-run');
		expect(summary.emitted).toBeGreaterThan(0);
		expect(summary.aborted).toBe(false);

		expect(client.chunks.length).toBeGreaterThan(0);

		const first = parseSseChunk(client.chunks[0]);
		expect(first.event).toBeDefined();
		expect(first.branding).toBe('brAInwav');
		expect(first.metadata).toEqual({ surface: 'test' });

		const completion = parseSseChunk(client.chunks.at(-1)!);
		expect(completion.type).toBe('brAInwav.langgraph.complete');
		expect(completion.payload).toEqual({ emitted: summary.emitted });

		expect(published.length).toBeGreaterThanOrEqual(client.chunks.length);
	});

	it('propagates errors to SSE clients', async () => {
		const graph = createCerebrumGraph();
		const coordinator = new LangGraphStreamCoordinator();
		const client = new MemoryEventStream();
		coordinator.addClient(client);

		const failingGraph = {
			...graph,
			streamEvents: () => {
				throw new Error('stream failure');
			},
		} as typeof graph;

		await expect(streamGraphEvents(failingGraph, { input: 'x' }, coordinator)).rejects.toThrow(
			'stream failure',
		);

		const errorChunk = parseSseChunk(client.chunks.at(-1)!);
		expect(errorChunk.type).toBe('brAInwav.langgraph.error');
		expect(errorChunk.payload).toEqual({ message: 'stream failure', name: 'Error' });
	});
});

function parseSseChunk(raw: string): LangGraphStreamEnvelope {
	const dataLine = raw.split('\n').find((line) => line.startsWith('data: '));
	if (!dataLine) {
		throw new Error('No data line found in SSE payload');
	}
	const json = dataLine.slice('data: '.length);
	return JSON.parse(json) as LangGraphStreamEnvelope;
}
