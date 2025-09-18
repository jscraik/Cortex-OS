/**
 * LangGraphJS Streaming Support for Cortex-OS
 *
 * Implements real-time streaming of agent execution with event emission
 */

import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { StateGraph, type RunnableConfig } from '@langchain/langgraph';
import { type CortexState } from '../CortexAgentLangGraph';
import { EventEmitter } from 'events';

// Streaming event types
export interface StreamingEvent {
	type: 'start' | 'node_start' | 'node_finish' | 'token' | 'error' | 'finish';
	timestamp: string;
	threadId: string;
	data: any;
}

export interface NodeStartEvent extends StreamingEvent {
	type: 'node_start';
	data: {
		nodeName: string;
		input: any;
	};
}

export interface NodeFinishEvent extends StreamingEvent {
	type: 'node_finish';
	data: {
		nodeName: string;
		output: any;
		duration: number;
	};
}

export interface TokenEvent extends StreamingEvent {
	type: 'token';
	data: {
		token: string;
		cumulativeTokens: number;
	};
}

export interface ErrorEvent extends StreamingEvent {
	type: 'error';
	data: {
		error: string;
		node?: string;
		recoverable: boolean;
	};
}

export type AgentStreamingEvent =
	| NodeStartEvent
	| NodeFinishEvent
	| TokenEvent
	| ErrorEvent
	| StreamingEvent;

// Streaming configuration
export interface StreamingConfig {
	enabled: boolean;
	mode: 'tokens' | 'updates' | 'values';
	includeIntermediate: boolean;
	includeMetadata: boolean;
	bufferSize?: number;
	flushInterval?: number;
	transformers?: StreamingTransformer[];
}

// Define StreamMode enum since it may not be exported
export enum StreamMode {
	Tokens = 'tokens',
	Updates = 'updates',
	Values = 'values',
}

export interface StreamingTransformer {
	name: string;
	transform: (event: AgentStreamingEvent) => AgentStreamingEvent | Promise<AgentStreamingEvent>;
	filter?: (event: AgentStreamingEvent) => boolean;
}

/**
 * Streaming manager for LangGraphJS workflows
 */
export class StreamingManager extends EventEmitter {
	private config: StreamingConfig;
	private transformers: StreamingTransformer[];
	private buffer: AgentStreamingEvent[] = [];
	private flushTimer?: NodeJS.Timeout;

	constructor(config: Partial<StreamingConfig> = {}) {
		super();
		this.config = {
			enabled: true,
			mode: 'updates',
			includeIntermediate: true,
			includeMetadata: true,
			bufferSize: 100,
			flushInterval: 100,
			...config,
		};
		this.transformers = this.config.transformers || [];
	}

	/**
	 * Stream agent execution with real-time events
	 */
	async streamExecution(
		graph: StateGraph<any>,
		initialState: CortexState,
		config: RunnableConfig & { threadId: string },
	): Promise<CortexState> {
		if (!this.config.enabled) {
			return graph.invoke(initialState, config);
		}

		const threadId = config.threadId;
		let finalState = initialState;

		// Emit start event
		this.emitEvent({
			type: 'start',
			timestamp: new Date().toISOString(),
			threadId,
			data: { input: initialState },
		});

		// Create stream
		const stream = graph.stream(initialState, {
			...config,
		});

		try {
			for await (const chunk of stream) {
				const processedChunk = await this.processChunk(chunk, threadId);

				if (processedChunk) {
					finalState = { ...finalState, ...processedChunk };

					// Emit events based on stream mode
					if (this.config.mode === 'updates') {
						this.emitNodeEvents(processedChunk, threadId);
					} else if (this.config.mode === 'tokens') {
						this.emitTokenEvents(processedChunk, threadId);
					}
				}
			}

			// Emit finish event
			this.emitEvent({
				type: 'finish',
				timestamp: new Date().toISOString(),
				threadId,
				data: { output: finalState },
			});

			return finalState;
		} catch (error) {
			this.emitEvent({
				type: 'error',
				timestamp: new Date().toISOString(),
				threadId,
				data: {
					error: error instanceof Error ? error.message : String(error),
					recoverable: false,
				},
			});
			throw error;
		}
	}

	/**
	 * Process and transform stream chunk
	 */
	private async processChunk(chunk: any, threadId: string): Promise<any> {
		// Apply transformers
		let processed = chunk;

		for (const transformer of this.transformers) {
			if (
				!transformer.filter ||
				transformer.filter({
					type: 'node_start', // Generic type for chunk processing
					timestamp: new Date().toISOString(),
					threadId,
					data: processed,
				})
			) {
				processed = await transformer.transform({
					type: 'node_start',
					timestamp: new Date().toISOString(),
					threadId,
					data: processed,
				});
			}
		}

		return processed.data;
	}

	/**
	 * Emit node start/finish events
	 */
	private emitNodeEvents(chunk: any, threadId: string): void {
		// Extract node transitions from the chunk
		if (chunk.currentStep && chunk !== this.config) {
			// Node start
			this.emitEvent({
				type: 'node_start',
				timestamp: new Date().toISOString(),
				threadId,
				data: {
					nodeName: chunk.currentStep,
					input: chunk,
				},
			});

			// Simulate node finish (in real implementation, track actual timing)
			setTimeout(() => {
				this.emitEvent({
					type: 'node_finish',
					timestamp: new Date().toISOString(),
					threadId,
					data: {
						nodeName: chunk.currentStep,
						output: chunk,
						duration: 0, // Calculate actual duration in production
					},
				});
			}, 10);
		}
	}

	/**
	 * Emit token streaming events
	 */
	private emitTokenEvents(chunk: any, threadId: string): void {
		if (chunk.messages) {
			const lastMessage = chunk.messages[chunk.messages.length - 1];
			if (lastMessage && lastMessage.content) {
				const content =
					typeof lastMessage.content === 'string'
						? lastMessage.content
						: JSON.stringify(lastMessage.content);

				// Emit tokens (simplified - in production, use actual token streaming)
				const tokens = content.split(' ');
				tokens.forEach((token, index) => {
					setTimeout(() => {
						this.emitEvent({
							type: 'token',
							timestamp: new Date().toISOString(),
							threadId,
							data: {
								token: token + ' ',
								cumulativeTokens: index + 1,
							},
						});
					}, index * 50); // Simulate token delay
				});
			}
		}
	}

	/**
	 * Emit streaming event with buffering
	 */
	private emitEvent(event: AgentStreamingEvent): void {
		// Apply transformations
		let transformedEvent = event;
		for (const transformer of this.transformers) {
			if (!transformer.filter || transformer.filter(event)) {
				transformedEvent = transformer.transform(event);
			}
		}

		// Buffer event if buffering is enabled
		if (this.config.bufferSize && this.config.bufferSize > 1) {
			this.buffer.push(transformedEvent);

			if (this.buffer.length >= this.config.bufferSize) {
				this.flushBuffer();
			} else if (!this.flushTimer) {
				this.flushTimer = setTimeout(() => {
					this.flushBuffer();
				}, this.config.flushInterval!);
			}
		} else {
			// Emit immediately
			super.emit('stream', transformedEvent);
		}
	}

	/**
	 * Flush buffered events
	 */
	private flushBuffer(): void {
		if (this.buffer.length > 0) {
			super.emit('batch', [...this.buffer]);
			this.buffer = [];
		}

		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = undefined;
		}
	}

	/**
	 * Add streaming transformer
	 */
	addTransformer(transformer: StreamingTransformer): void {
		this.transformers.push(transformer);
	}

	/**
	 * Remove streaming transformer
	 */
	removeTransformer(name: string): void {
		this.transformers = this.transformers.filter((t) => t.name !== name);
	}

	/**
	 * Get streaming statistics
	 */
	getStats(): {
		eventsEmitted: number;
		bufferSize: number;
		transformers: string[];
	} {
		return {
			eventsEmitted: this.listenerCount('stream') + this.listenerCount('batch'),
			bufferSize: this.buffer.length,
			transformers: this.transformers.map((t) => t.name),
		};
	}
}

/**
 * Pre-built streaming transformers
 */
export const StreamingTransformers = {
	/**
	 * Adds timing information to events
	 */
	timing: {
		name: 'timing',
		transform: (event: AgentStreamingEvent) => {
			return {
				...event,
				data: {
					...event.data,
					timing: {
						receivedAt: Date.now(),
						processedAt: Date.now(),
					},
				},
			};
		},
	} as StreamingTransformer,

	/**
	 * Filters out sensitive information
	 */
	privacy: {
		name: 'privacy',
		filter: (event: AgentStreamingEvent) => {
			if (event.type === 'token') {
				const content = event.data.token.toLowerCase();
				const sensitivePatterns = [/password/i, /secret/i, /key/i, /token/i, /api[_-]?key/i];

				return !sensitivePatterns.some((pattern) => pattern.test(content));
			}
			return true;
		},
		transform: (event: AgentStreamingEvent) => {
			if (event.type === 'token') {
				// Redact potential sensitive information
				const redacted = event.data.token.replace(/\b\w{10,}\b/g, '[REDACTED]');
				return {
					...event,
					data: {
						...event.data,
						token: redacted,
					},
				};
			}
			return event;
		},
	} as StreamingTransformer,

	/**
	 * Adds compression for large events
	 */
	compression: {
		name: 'compression',
		transform: async (event: AgentStreamingEvent) => {
			if (JSON.stringify(event).length > 1024) {
				// Simplified compression - in production, use proper compression
				return {
					...event,
					data: {
						...event.data,
						compressed: true,
						originalSize: JSON.stringify(event).length,
					},
				};
			}
			return event;
		},
	} as StreamingTransformer,

	/**
	 * Adds debugging information
	 */
	debug: {
		name: 'debug',
		transform: (event: AgentStreamingEvent) => {
			return {
				...event,
				data: {
					...event.data,
					debug: {
						eventId: Math.random().toString(36).substr(2, 9),
						timestamp: process.hrtime.bigint(),
					},
				},
			};
		},
	} as StreamingTransformer,
};

/**
 * Streaming utilities
 */
export const streamingUtils = {
	/**
	 * Create streaming configuration from environment
	 */
	createConfig(): StreamingConfig {
		return {
			enabled: process.env.STREAMING_ENABLED !== 'false',
			mode: (process.env.STREAMING_MODE as any) || 'updates',
			includeIntermediate: process.env.STREAMING_INTERMEDIATE !== 'false',
			includeMetadata: process.env.STREAMING_METADATA !== 'false',
			bufferSize: process.env.STREAMING_BUFFER_SIZE
				? parseInt(process.env.STREAMING_BUFFER_SIZE)
				: undefined,
			flushInterval: process.env.STREAMING_FLUSH_INTERVAL
				? parseInt(process.env.STREAMING_FLUSH_INTERVAL)
				: undefined,
		};
	},

	/**
	 * Create A2A-compatible streaming event
	 */
	toA2AEvent(event: AgentStreamingEvent): any {
		return {
			type: 'agent_stream',
			source: 'CortexAgent',
			timestamp: event.timestamp,
			threadId: event.threadId,
			payload: {
				eventType: event.type,
				data: event.data,
			},
		};
	},

	/**
	 * Aggregate streaming events for batch processing
	 */
	aggregateEvents(events: AgentStreamingEvent[]): {
		byType: Record<string, number>;
		byThread: Record<string, number>;
		duration: number;
	} {
		const byType: Record<string, number> = {};
		const byThread: Record<string, number> = {};

		let minTime = Infinity;
		let maxTime = 0;

		events.forEach((event) => {
			byType[event.type] = (byType[event.type] || 0) + 1;
			byThread[event.threadId] = (byThread[event.threadId] || 0) + 1;

			const time = new Date(event.timestamp).getTime();
			minTime = Math.min(minTime, time);
			maxTime = Math.max(maxTime, time);
		});

		return {
			byType,
			byThread,
			duration: maxTime - minTime,
		};
	},
};
