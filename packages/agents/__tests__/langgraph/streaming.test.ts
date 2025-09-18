/**
 * Tests for LangGraphJS streaming functionality
 */

import { HumanMessage } from '@langchain/core/messages';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	StreamingManager,
	StreamingTransformers,
	streamingUtils,
} from '../../src/langgraph/streaming';

describe('Streaming Manager', () => {
	let streamingManager: StreamingManager;
	let mockGraph: any;

	beforeEach(() => {
		streamingManager = new StreamingManager({
			enabled: true,
			mode: 'updates',
			bufferSize: 5,
		});

		mockGraph = {
			stream: vi.fn().mockImplementation(function* () {
				yield { currentStep: 'start', messages: [] };
				yield { currentStep: 'processing', messages: [] };
				yield { currentStep: 'complete', messages: [new HumanMessage('Done')] };
			}),
		};
	});

	describe('Event Emission', () => {
		it('should emit start event', async () => {
			const events: any[] = [];
			streamingManager.on('stream', (event) => events.push(event));

			await streamingManager.streamExecution(
				mockGraph,
				{ messages: [new HumanMessage('test')] },
				{ threadId: 'test-thread' },
			);

			expect(events.some((e) => e.type === 'start')).toBe(true);
			expect(events[0].threadId).toBe('test-thread');
		});

		it('should emit node transition events', async () => {
			const events: any[] = [];
			streamingManager.on('stream', (event) => events.push(event));

			await streamingManager.streamExecution(
				mockGraph,
				{ messages: [new HumanMessage('test')] },
				{ threadId: 'test-thread' },
			);

			const nodeEvents = events.filter((e) => e.type === 'node_start');
			expect(nodeEvents.length).toBeGreaterThan(0);
		});

		it('should emit finish event', async () => {
			const events: any[] = [];
			streamingManager.on('stream', (event) => events.push(event));

			await streamingManager.streamExecution(
				mockGraph,
				{ messages: [new HumanMessage('test')] },
				{ threadId: 'test-thread' },
			);

			expect(events.some((e) => e.type === 'finish')).toBe(true);
		});

		it('should emit error event on failure', async () => {
			const events: any[] = [];
			streamingManager.on('stream', (event) => events.push(event));

			const failingGraph = {
				stream: vi.fn().mockImplementation(function* () {
					throw new Error('Test error');
				}),
			};

			await expect(
				streamingManager.streamExecution(
					failingGraph,
					{ messages: [new HumanMessage('test')] },
					{ threadId: 'test-thread' },
				),
			).rejects.toThrow();

			expect(events.some((e) => e.type === 'error')).toBe(true);
		});
	});

	describe('Buffering', () => {
		it('should buffer events when bufferSize > 1', async () => {
			const batches: any[][] = [];
			const bufferedManager = new StreamingManager({
				bufferSize: 3,
				flushInterval: 1000,
			});

			bufferedManager.on('batch', (batch) => batches.push(batch));

			// Emit 2 events (should not flush yet)
			bufferedManager.emit('stream', {
				type: 'node_start',
				timestamp: new Date().toISOString(),
				threadId: 'test',
				data: { nodeName: 'node1' },
			});

			bufferedManager.emit('stream', {
				type: 'node_start',
				timestamp: new Date().toISOString(),
				threadId: 'test',
				data: { nodeName: 'node2' },
			});

			expect(batches).toHaveLength(0);

			// Emit third event (should flush)
			bufferedManager.emit('stream', {
				type: 'node_start',
				timestamp: new Date().toISOString(),
				threadId: 'test',
				data: { nodeName: 'node3' },
			});

			expect(batches).toHaveLength(1);
			expect(batches[0]).toHaveLength(3);
		});

		it('should flush on interval', async () => {
			const batches: any[][] = [];
			const bufferedManager = new StreamingManager({
				bufferSize: 10,
				flushInterval: 50,
			});

			bufferedManager.on('batch', (batch) => batches.push(batch));

			// Emit event
			bufferedManager.emit('stream', {
				type: 'node_start',
				timestamp: new Date().toISOString(),
				threadId: 'test',
				data: { nodeName: 'node1' },
			});

			expect(batches).toHaveLength(0);

			// Wait for flush
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(batches).toHaveLength(1);
			expect(batches[0]).toHaveLength(1);
		});
	});

	describe('Transformers', () => {
		it('should apply timing transformer', () => {
			const event = {
				type: 'node_start' as const,
				timestamp: '2023-01-01T00:00:00Z',
				threadId: 'test',
				data: { nodeName: 'test-node' },
			};

			const transformed = StreamingTransformers.timing.transform(event);
			expect(transformed.data.timing).toBeDefined();
			expect(typeof transformed.data.timing.receivedAt).toBe('number');
		});

		it('should filter sensitive information', () => {
			const event = {
				type: 'token' as const,
				timestamp: '2023-01-01T00:00:00Z',
				threadId: 'test',
				data: { token: 'My password is secret123', cumulativeTokens: 5 },
			};

			const shouldEmit = StreamingTransformers.privacy.filter?.(event);
			expect(shouldEmit).toBe(false);

			const cleanEvent = {
				type: 'token' as const,
				timestamp: '2023-01-01T00:00:00Z',
				threadId: 'test',
				data: { token: 'Hello world', cumulativeTokens: 2 },
			};

			const shouldEmitClean = StreamingTransformers.privacy.filter?.(cleanEvent);
			expect(shouldEmitClean).toBe(true);
		});

		it('should redact sensitive tokens', () => {
			const event = {
				type: 'token' as const,
				timestamp: '2023-01-01T00:00:00Z',
				threadId: 'test',
				data: { token: 'Here is my api-key-1234567890abcdef', cumulativeTokens: 5 },
			};

			const transformed = StreamingTransformers.privacy.transform(event);
			expect(transformed.data.token).toContain('[REDACTED]');
		});

		it('should add debugging information', () => {
			const event = {
				type: 'node_start' as const,
				timestamp: '2023-01-01T00:00:00Z',
				threadId: 'test',
				data: { nodeName: 'test-node' },
			};

			const transformed = StreamingTransformers.debug.transform(event);
			expect(transformed.data.debug.eventId).toMatch(/^[a-z0-9]+$/);
			expect(transformed.data.debug.timestamp).toBeDefined();
		});
	});

	describe('Custom Transformers', () => {
		it('should add custom transformer', () => {
			const customTransformer = {
				name: 'custom',
				transform: (event: any) => ({
					...event,
					data: { ...event.data, custom: true },
				}),
			};

			streamingManager.addTransformer(customTransformer);

			const event = {
				type: 'node_start' as const,
				timestamp: '2023-01-01T00:00:00Z',
				threadId: 'test',
				data: { nodeName: 'test-node' },
			};

			streamingManager.emit('stream', event);

			const stats = streamingManager.getStats();
			expect(stats.transformers).toContain('custom');
		});

		it('should remove transformer', () => {
			streamingManager.addTransformer(StreamingTransformers.timing);
			expect(streamingManager.getStats().transformers).toContain('timing');

			streamingManager.removeTransformer('timing');
			expect(streamingManager.getStats().transformers).not.toContain('timing');
		});
	});

	describe('Streaming Modes', () => {
		it('should handle updates mode', async () => {
			const updateManager = new StreamingManager({ mode: 'updates' });
			const events: any[] = [];

			updateManager.on('stream', (event) => events.push(event));

			const chunk = { currentStep: 'test-step' };
			await updateManager.processChunk(chunk, 'test-thread');

			expect(events.some((e) => e.type === 'node_start')).toBe(true);
		});

		it('should handle values mode', async () => {
			const valueManager = new StreamingManager({ mode: 'values' });
			const events: any[] = [];

			valueManager.on('stream', (event) => events.push(event));

			const chunk = { currentStep: 'test-step' };
			await valueManager.processChunk(chunk, 'test-thread');

			// Values mode doesn't emit specific events in this simplified test
			expect(events).toHaveLength(0);
		});

		it('should handle tokens mode', async () => {
			const tokenManager = new StreamingManager({ mode: 'tokens' });
			const events: any[] = [];

			tokenManager.on('stream', (event) => events.push(event));

			const chunk = {
				messages: [new HumanMessage('Hello world')],
			};

			await tokenManager.processChunk(chunk, 'test-thread');

			// Should emit token events
			expect(events.filter((e) => e.type === 'token').length).toBeGreaterThan(0);
		});
	});

	describe('Statistics', () => {
		it('should provide streaming statistics', () => {
			const listener1 = vi.fn();
			const listener2 = vi.fn();

			streamingManager.on('stream', listener1);
			streamingManager.on('batch', listener2);

			const stats = streamingManager.getStats();
			expect(stats.eventsEmitted).toBe(2);
			expect(stats.bufferSize).toBe(0);
		});

		it('should track transformer count', () => {
			streamingManager.addTransformer(StreamingTransformers.timing);
			streamingManager.addTransformer(StreamingTransformers.debug);

			const stats = streamingManager.getStats();
			expect(stats.transformers).toHaveLength(2);
		});
	});
});

describe('Streaming Utilities', () => {
	describe('Configuration Creation', () => {
		it('should create config from environment', () => {
			process.env.STREAMING_ENABLED = 'true';
			process.env.STREAMING_MODE = 'tokens';
			process.env.STREAMING_BUFFER_SIZE = '10';

			const config = streamingUtils.createConfig();

			expect(config.enabled).toBe(true);
			expect(config.mode).toBe('tokens');
			expect(config.bufferSize).toBe(10);

			// Cleanup
			delete process.env.STREAMING_ENABLED;
			delete process.env.STREAMING_MODE;
			delete process.env.STREAMING_BUFFER_SIZE;
		});
	});

	describe('A2A Event Conversion', () => {
		it('should convert streaming event to A2A format', () => {
			const streamingEvent = {
				type: 'node_start' as const,
				timestamp: '2023-01-01T00:00:00Z',
				threadId: 'test-thread',
				data: { nodeName: 'test-node' },
			};

			const a2aEvent = streamingUtils.toA2AEvent(streamingEvent);

			expect(a2aEvent.type).toBe('agent_stream');
			expect(a2aEvent.source).toBe('CortexAgent');
			expect(a2aEvent.payload.eventType).toBe('node_start');
		});
	});

	describe('Event Aggregation', () => {
		it('should aggregate events by type and thread', () => {
			const events = [
				{ type: 'node_start', timestamp: '2023-01-01T00:00:00Z', threadId: 'thread1' },
				{ type: 'node_finish', timestamp: '2023-01-01T00:00:01Z', threadId: 'thread1' },
				{ type: 'node_start', timestamp: '2023-01-01T00:00:02Z', threadId: 'thread2' },
				{ type: 'node_start', timestamp: '2023-01-01T00:00:03Z', threadId: 'thread1' },
			];

			const aggregated = streamingUtils.aggregateEvents(events);

			expect(aggregated.byType['node_start']).toBe(3);
			expect(aggregated.byType['node_finish']).toBe(1);
			expect(aggregated.byThread['thread1']).toBe(3);
			expect(aggregated.byThread['thread2']).toBe(1);
			expect(aggregated.duration).toBe(3000); // 3 seconds
		});
	});
});
