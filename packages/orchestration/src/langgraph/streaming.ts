import { randomUUID } from 'node:crypto';
import type { PregelOptions, StreamMode } from '@langchain/langgraph';

const BRANDING = 'brAInwav' as const;
const DEFAULT_STREAM_MODES: StreamMode[] = ['updates', 'debug'];

type GenericPregelOptions = Partial<PregelOptions<Record<string, unknown>, Record<string, unknown>>>;

type StreamIterable = AsyncIterable<[string, unknown]>;

type EventIterable = AsyncIterable<Record<string, unknown>>;

export interface StreamClient {
        send(message: string): Promise<void> | void;
        close?(code?: number, reason?: string): void;
}

export interface LangGraphStreamEnvelope<T = unknown> {
        type: 'brAInwav.langgraph.event' | 'brAInwav.langgraph.complete' | 'brAInwav.langgraph.error';
        event: string;
        payload: T;
        runId: string;
        branding: typeof BRANDING;
        timestamp: string;
        sequence: number;
        metadata?: Record<string, unknown>;
        aborted?: boolean;
}

export interface LangGraphStreamOptions {
        runId?: string;
        streamMode?: StreamMode[];
        publish?: (envelope: LangGraphStreamEnvelope) => Promise<void> | void;
        abortSignal?: AbortSignal;
        metadata?: Record<string, unknown>;
        graphOptions?: GenericPregelOptions;
}

export interface LangGraphStreamResult {
        runId: string;
        emitted: number;
        aborted: boolean;
}

export interface StreamableStateGraph {
        stream(input: unknown, options?: GenericPregelOptions): Promise<StreamIterable>;
        streamEvents(
                input: unknown,
                options: GenericPregelOptions & { version: 'v1' | 'v2'; encoding?: 'text/event-stream' },
        ): EventIterable;
}

export class LangGraphStreamCoordinator {
        #clients = new Set<StreamClient>();

        addClient(client: StreamClient): () => void {
                this.#clients.add(client);
                return () => {
                        this.#clients.delete(client);
                };
        }

        async broadcast(envelope: LangGraphStreamEnvelope): Promise<void> {
                const payload = JSON.stringify(envelope);
                await this.#dispatch(async (client) => {
                        await client.send(payload);
                });
        }

        async broadcastSse(eventName: string, envelope: LangGraphStreamEnvelope): Promise<void> {
                const payload = formatSse(eventName, envelope);
                await this.#dispatch(async (client) => {
                        await client.send(payload);
                });
        }

        async closeAll(code?: number, reason?: string): Promise<void> {
                for (const client of this.#clients) {
                        try {
                                client.close?.(code, reason);
                        } catch (error) {
                                logWarning('close', error);
                        }
                }
                this.#clients.clear();
        }

        async #dispatch(send: (client: StreamClient) => Promise<void>): Promise<void> {
                const tasks: Promise<void>[] = [];
                for (const client of this.#clients) {
                        tasks.push(
                                send(client).catch((error) => {
                                        logWarning('send', error);
                                }),
                        );
                }
                await Promise.all(tasks);
        }
}

export async function streamGraphUpdates(
        graph: StreamableStateGraph,
        input: unknown,
        coordinator: LangGraphStreamCoordinator,
        options: LangGraphStreamOptions = {},
): Promise<LangGraphStreamResult> {
        const runId = options.runId ?? randomUUID();
        try {
                const stream = await graph.stream(input, resolveGraphOptions(options));
                return await consumeUpdateStream(stream, coordinator, runId, options);
        } catch (error) {
                const failure = createErrorEnvelope(runId, 0, error, options.metadata);
                await coordinator.broadcast(failure);
                await options.publish?.(failure);
                throw error;
        }
}

export async function streamGraphEvents(
        graph: StreamableStateGraph,
        input: unknown,
        coordinator: LangGraphStreamCoordinator,
        options: LangGraphStreamOptions = {},
): Promise<LangGraphStreamResult> {
        const runId = options.runId ?? randomUUID();
        try {
                const stream = graph.streamEvents(input, {
                        ...resolveGraphOptions(options),
                        version: 'v1',
                        encoding: 'text/event-stream',
                });
                return await consumeEventStream(stream, coordinator, runId, options);
        } catch (error) {
                const failure = createErrorEnvelope(runId, 0, error, options.metadata);
                await coordinator.broadcastSse('message', failure);
                await options.publish?.(failure);
                throw error;
        }
}

async function consumeUpdateStream(
        stream: StreamIterable,
        coordinator: LangGraphStreamCoordinator,
        runId: string,
        options: LangGraphStreamOptions,
): Promise<LangGraphStreamResult> {
        let sequence = 0;
        let aborted = false;
        try {
                for await (const chunk of stream) {
                        if (options.abortSignal?.aborted) {
                                aborted = true;
                                break;
                        }
                        const { event, payload } = normaliseChunk(chunk);
                        sequence += 1;
                        const envelope = createEnvelope({
                                type: 'brAInwav.langgraph.event',
                                event,
                                payload,
                                runId,
                                sequence,
                                metadata: options.metadata,
                                aborted: false,
                        });
                        await coordinator.broadcast(envelope);
                        await options.publish?.(envelope);
                }
                const completion = createCompletionEnvelope(runId, sequence, options.metadata, aborted);
                await coordinator.broadcast(completion);
                await options.publish?.(completion);
                if (aborted) {
                        await coordinator.closeAll(4000, 'LangGraph stream aborted by controller');
                }
                return { runId, emitted: sequence, aborted };
        } catch (error) {
                const failure = createErrorEnvelope(runId, sequence, error, options.metadata);
                await coordinator.broadcast(failure);
                await options.publish?.(failure);
                throw error;
        }
}

async function consumeEventStream(
        stream: EventIterable,
        coordinator: LangGraphStreamCoordinator,
        runId: string,
        options: LangGraphStreamOptions,
): Promise<LangGraphStreamResult> {
        let sequence = 0;
        let aborted = false;
        try {
                for await (const raw of stream) {
                        if (options.abortSignal?.aborted) {
                                aborted = true;
                                break;
                        }
                        sequence += 1;
                        const eventName = String(raw.event ?? 'message');
                        const envelope = createEnvelope({
                                type: 'brAInwav.langgraph.event',
                                event: eventName,
                                payload: raw,
                                runId,
                                sequence,
                                metadata: options.metadata,
                                aborted: false,
                        });
                        await coordinator.broadcastSse('message', envelope);
                        await options.publish?.(envelope);
                }
                const completion = createCompletionEnvelope(runId, sequence, options.metadata, aborted);
                await coordinator.broadcastSse('message', completion);
                await options.publish?.(completion);
                if (aborted) {
                                await coordinator.closeAll(4000, 'LangGraph event stream aborted by controller');
                }
                return { runId, emitted: sequence, aborted };
        } catch (error) {
                const failure = createErrorEnvelope(runId, sequence, error, options.metadata);
                await coordinator.broadcastSse('message', failure);
                await options.publish?.(failure);
                throw error;
        }
}

function resolveGraphOptions(options: LangGraphStreamOptions): GenericPregelOptions {
        const base: GenericPregelOptions = {
                streamMode: options.streamMode ?? DEFAULT_STREAM_MODES,
        };
        return options.graphOptions ? { ...base, ...options.graphOptions } : base;
}

function normaliseChunk(chunk: [string, unknown] | unknown): { event: string; payload: unknown } {
        if (Array.isArray(chunk) && chunk.length >= 2 && typeof chunk[0] === 'string') {
                return { event: chunk[0], payload: chunk[1] };
        }
        return { event: 'message', payload: chunk };
}

function createEnvelope<T>(input: {
        type: LangGraphStreamEnvelope<T>['type'];
        event: string;
        payload: T;
        runId: string;
        sequence: number;
        metadata?: Record<string, unknown>;
        aborted: boolean;
}): LangGraphStreamEnvelope<T> {
        return {
                type: input.type,
                event: input.event,
                payload: input.payload,
                runId: input.runId,
                branding: BRANDING,
                timestamp: new Date().toISOString(),
                sequence: input.sequence,
                metadata: input.metadata,
                aborted: input.aborted,
        };
}

function createCompletionEnvelope(
        runId: string,
        sequence: number,
        metadata: Record<string, unknown> | undefined,
        aborted: boolean,
): LangGraphStreamEnvelope<{ emitted: number }> {
        return createEnvelope({
                type: 'brAInwav.langgraph.complete',
                event: 'complete',
                payload: { emitted: sequence },
                runId,
                sequence: sequence + 1,
                metadata,
                aborted,
        });
}

function createErrorEnvelope(
        runId: string,
        sequence: number,
        error: unknown,
        metadata: Record<string, unknown> | undefined,
): LangGraphStreamEnvelope<{ message: string; name: string }> {
        const err = error instanceof Error ? error : new Error(String(error));
        return createEnvelope({
                type: 'brAInwav.langgraph.error',
                event: 'error',
                payload: { message: err.message, name: err.name ?? 'Error' },
                runId,
                sequence: sequence + 1,
                metadata,
                aborted: false,
        });
}

function formatSse(eventName: string, envelope: LangGraphStreamEnvelope): string {
        const lines = [
                `id: ${envelope.sequence}`,
                `event: ${eventName}`,
                `data: ${JSON.stringify(envelope)}`,
        ];
        return `${lines.join('\n')}\n\n`;
}

function logWarning(action: 'send' | 'close', error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`brAInwav LangGraph stream ${action} failed: ${message}`);
}
