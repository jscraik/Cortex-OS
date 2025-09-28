import { describe, expect, it, vi } from 'vitest';
import { createCerebrumGraph } from '../../src/langgraph/create-cerebrum-graph.js';
import {
        LangGraphStreamCoordinator,
        type LangGraphStreamEnvelope,
        streamGraphUpdates,
        type StreamClient,
} from '../../src/langgraph/streaming.js';

class MemoryWebSocket implements StreamClient {
        messages: string[] = [];

        async send(message: string): Promise<void> {
                this.messages.push(message);
        }

        closeCalls: Array<{ code?: number; reason?: string }> = [];

        close(code?: number, reason?: string): void {
                this.closeCalls.push({ code, reason });
        }
}

describe('LangGraph stream → WebSocket coordinator', () => {
        it('broadcasts LangGraph updates with brAInwav telemetry', async () => {
                const graph = createCerebrumGraph();
                const coordinator = new LangGraphStreamCoordinator();
                const client = new MemoryWebSocket();
                coordinator.addClient(client);
                const publishSpy = vi.fn();

                const result = await streamGraphUpdates(graph, { input: 'hello brAInwav' }, coordinator, {
                        runId: 'run-test-001',
                        publish: publishSpy,
                });

                expect(result.runId).toBe('run-test-001');
                expect(result.emitted).toBeGreaterThan(0);
                expect(result.aborted).toBe(false);

                expect(client.messages.length).toBeGreaterThan(result.emitted - 1);

                const envelopes = client.messages.map((msg) => JSON.parse(msg) as LangGraphStreamEnvelope);

                const first = envelopes[0];
                expect(first.branding).toBe('brAInwav');
                expect(first.type).toBe('brAInwav.langgraph.event');
                expect(['updates', 'debug']).toContain(first.event);

                const completion = envelopes.at(-1);
                expect(completion?.type).toBe('brAInwav.langgraph.complete');
                expect(completion?.payload).toEqual({ emitted: result.emitted });
                expect(completion?.aborted).toBe(false);

                expect(publishSpy).toHaveBeenCalled();
        });

        it('stops streaming when aborted and closes clients', async () => {
                const graph = createCerebrumGraph();
                const coordinator = new LangGraphStreamCoordinator();
                const client = new MemoryWebSocket();
                coordinator.addClient(client);

                const controller = new AbortController();

                const streamPromise = streamGraphUpdates(graph, { input: 'abort-check' }, coordinator, {
                        runId: 'abort-run',
                        abortSignal: controller.signal,
                });

                controller.abort();

                const summary = await streamPromise;
                expect(summary.aborted).toBe(true);
                const completion = client.messages.at(-1);
                expect(completion).toBeDefined();
                if (completion) {
                        const envelope = JSON.parse(completion) as LangGraphStreamEnvelope;
                        expect(envelope.type).toBe('brAInwav.langgraph.complete');
                        expect(envelope.aborted).toBe(true);
                }
                expect(client.closeCalls.at(-1)).toEqual({
                        code: 4000,
                        reason: 'LangGraph stream aborted by controller',
                });
        });
});
