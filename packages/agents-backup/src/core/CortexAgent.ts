/**
 * Core CortexAgent implementation
 * Based on VoltAgent architecture pattern with multi-modal capabilities
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type {
	AgentConfig,
	AgentInput,
	AgentResponse,
	ConversationContext,
	MemoryItem,
	MemorySystem,
	ModelProvider,
	StreamEvent,
	ToolCall,
	ToolDefinition,
	ToolResult,
} from '../types';

export class CortexAgent extends EventEmitter {
	private config: AgentConfig;
	private memorySystem: MemorySystem;
	private tools: Map<string, ToolDefinition> = new Map();
	private isRunning = false;
	private activeStreams = new Set<AsyncIterator<StreamEvent>>();

	constructor(config: AgentConfig) {
		super();
		this.config = config;
		this.initializeAgent();
	}

	private initializeAgent(): void {
		// Register tools
		for (const tool of this.config.tools) {
			this.tools.set(tool.name, tool);
		}

		// Set up event handlers
		this.on('error', this.handleError.bind(this));
		this.on('tool_call', this.handleToolCall.bind(this));
		this.on('memory_update', this.handleMemoryUpdate.bind(this));

		this.isRunning = true;
		this.emit('ready', {
			agentId: this.config.id,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Process input and return a response
	 */
	async process(input: AgentInput): Promise<AgentResponse> {
		if (!this.isRunning) {
			throw new AgentError('Agent is not running', 'AGENT_NOT_RUNNING');
		}

		const requestId = randomUUID();
		const startTime = Date.now();

		try {
			// Emit start event
			this.emit('request_start', { requestId, input, timestamp: startTime });

			// 1. Prepare context with memory
			const context = await this.prepareContext(input);

			// 2. Select appropriate model provider
			const modelProvider = await this.selectModelProvider(input);

			// 3. Process multi-modal inputs
			const processedInput = await this.processMultiModalInput(input);

			// 4. Generate response
			const response = await this.generateResponse(
				modelProvider,
				processedInput,
				context,
			);

			// 5. Update memory
			await this.updateMemory(input, response);

			// 6. Emit completion event
			const duration = Date.now() - startTime;
			this.emit('request_complete', {
				requestId,
				response,
				duration,
				timestamp: Date.now(),
			});

			return response;
		} catch (error) {
			const duration = Date.now() - startTime;
			this.emit('request_error', {
				requestId,
				error,
				duration,
				timestamp: Date.now(),
			});
			throw error;
		}
	}

	/**
	 * Process input with streaming response
	 */
	async *processStream(input: AgentInput): AsyncIterable<StreamEvent> {
		if (!this.isRunning) {
			throw new AgentError('Agent is not running', 'AGENT_NOT_RUNNING');
		}

		const requestId = randomUUID();
		const startTime = Date.now();

		try {
			this.emit('stream_start', { requestId, input, timestamp: startTime });

			// Create async iterator for streaming
			const stream = this.createStreamProcessor(input, requestId);

			// Track active streams for cleanup
			const iterator = stream[Symbol.asyncIterator]();
			this.activeStreams.add(iterator);

			try {
				for await (const event of iterator) {
					yield event;
				}
			} finally {
				this.activeStreams.delete(iterator);
			}

			const duration = Date.now() - startTime;
			this.emit('stream_complete', {
				requestId,
				duration,
				timestamp: Date.now(),
			});
		} catch (error) {
			const duration = Date.now() - startTime;
			this.emit('stream_error', {
				requestId,
				error,
				duration,
				timestamp: Date.now(),
			});
			throw error;
		}
	}

	/**
	 * Execute a tool call
	 */
	async executeTool(toolCall: ToolCall): Promise<ToolResult> {
		const tool = this.tools.get(toolCall.name);
		if (!tool) {
			throw new ToolExecutionError(
				`Tool '${toolCall.name}' not found`,
				toolCall.name,
			);
		}

		const startTime = Date.now();

		try {
			this.emit('tool_start', { toolCall, timestamp: startTime });

			// Validate parameters
			const validatedParams = tool.parameters.parse(toolCall.parameters);

			// Execute with timeout
			const timeout = tool.timeout || 30000;
			const result = await this.executeWithTimeout(
				tool.handler(validatedParams),
				timeout,
			);

			const duration = Date.now() - startTime;
			const toolResult: ToolResult = {
				toolCallId: toolCall.id,
				result,
				success: true,
				duration,
			};

			this.emit('tool_complete', { toolCall, result: toolResult, duration });
			return toolResult;
		} catch (error) {
			const duration = Date.now() - startTime;
			const toolResult: ToolResult = {
				toolCallId: toolCall.id,
				result: null,
				success: false,
				error: error instanceof Error ? error.message : String(error),
				duration,
			};

			this.emit('tool_error', { toolCall, error, duration });
			return toolResult;
		}
	}

	/**
	 * Query memory
	 */
	async queryMemory(
		query: string,
		type: 'working' | 'contextual' | 'episodic' = 'contextual',
	): Promise<MemoryItem[]> {
		switch (type) {
			case 'working':
				return Array.from(this.memorySystem.working.values()).filter((item) =>
					item.content.toLowerCase().includes(query.toLowerCase()),
				);

			case 'contextual':
				return this.memorySystem.contextual.search(query);

			case 'episodic':
				return this.memorySystem.episodic.search(query);

			default:
				throw new AgentError(
					`Invalid memory type: ${type}`,
					'INVALID_MEMORY_TYPE',
				);
		}
	}

	/**
	 * Add item to memory
	 */
	async addToMemory(
		content: string,
		type: 'working' | 'contextual' | 'episodic' = 'contextual',
	): Promise<string> {
		const memoryItem: MemoryItem = {
			id: randomUUID(),
			type,
			content,
			tags: [],
			timestamp: new Date().toISOString(),
		};

		switch (type) {
			case 'working':
				this.memorySystem.working.set(memoryItem.id, memoryItem);
				// Enforce working memory limits
				if (
					this.memorySystem.working.size > this.config.memory.working.maxItems
				) {
					const oldestKey = Array.from(this.memorySystem.working.keys())[0];
					this.memorySystem.working.delete(oldestKey);
				}
				break;

			case 'contextual':
				await this.memorySystem.contextual.add([memoryItem]);
				break;

			case 'episodic':
				// Add to episodic memory as a system message
				await this.memorySystem.episodic.add({
					id: randomUUID(),
					role: 'system',
					content,
					timestamp: new Date().toISOString(),
				});
				break;
		}

		this.emit('memory_added', { memoryItem, timestamp: Date.now() });
		return memoryItem.id;
	}

	/**
	 * Get agent status
	 */
	getStatus() {
		return {
			id: this.config.id,
			name: this.config.name,
			isRunning: this.isRunning,
			capabilities: this.config.capabilities,
			activeStreams: this.activeStreams.size,
			memoryUsage: {
				working: this.memorySystem.working.size,
				contextual: 'N/A', // Would need to query vector store
				episodic: 'N/A', // Would need to query history store
			},
		};
	}

	/**
	 * Shutdown the agent
	 */
	async shutdown(): Promise<void> {
		this.isRunning = false;

		// Cancel all active streams
		for (const stream of this.activeStreams) {
			if ('return' in stream) {
				stream.return?.();
			}
		}
		this.activeStreams.clear();

		// Emit shutdown event
		this.emit('shutdown', { timestamp: Date.now() });

		// Remove all listeners
		this.removeAllListeners();
	}

	// ===== Private Methods =====

	private async prepareContext(
		input: AgentInput,
	): Promise<ConversationContext> {
		const context: ConversationContext = input.context || {
			timestamp: new Date().toISOString(),
		};

		// Retrieve relevant memories
		if (input.memory) {
			const relevantMemories = await this.queryMemory(
				input.memory.query,
				input.memory.type,
			);
			context.metadata = {
				...context.metadata,
				relevantMemories: relevantMemories.slice(0, 5), // Limit to top 5
			};
		}

		return context;
	}

	private async selectModelProvider(
		_input: AgentInput,
	): Promise<ModelProvider> {
		// For now, use the first available provider
		// TODO: Implement intelligent routing based on capabilities, cost, etc.
		for (const provider of this.config.modelProviders) {
			if (await provider.isAvailable()) {
				return provider;
			}
		}

		throw new ModelProviderError('No model providers available', 'system');
	}

	private async processMultiModalInput(input: AgentInput): Promise<AgentInput> {
		// Process each input type appropriately
		const processedInputs = [];

		for (const inputItem of input.inputs) {
			switch (inputItem.type) {
				case 'text':
					processedInputs.push(inputItem);
					break;

				case 'image':
					// TODO: Implement image processing (vision models)
					if (inputItem.description) {
						processedInputs.push({
							type: 'text',
							content: `[Image: ${inputItem.description}]`,
							metadata: inputItem.metadata,
						});
					}
					break;

				case 'audio':
					// TODO: Implement audio processing (speech-to-text)
					if (inputItem.transcript) {
						processedInputs.push({
							type: 'text',
							content: `[Audio Transcript: ${inputItem.transcript}]`,
							metadata: inputItem.metadata,
						});
					}
					break;

				case 'video':
					// TODO: Implement video processing
					if (inputItem.description) {
						processedInputs.push({
							type: 'text',
							content: `[Video: ${inputItem.description}]`,
							metadata: inputItem.metadata,
						});
					}
					break;
			}
		}

		return { ...input, inputs: processedInputs };
	}

	private async generateResponse(
		modelProvider: ModelProvider,
		input: AgentInput,
		context: ConversationContext,
	): Promise<AgentResponse> {
		// Build prompt with context
		const prompt = this.buildPrompt(input, context);

		const generateRequest = {
			prompt,
			maxTokens: input.options?.maxTokens || 4096,
			temperature: input.options?.temperature || 0.7,
			tools: input.options?.tools || this.config.tools,
			seed: input.options?.seed,
		};

		const modelResponse = await modelProvider.generate(generateRequest);

		// Execute any tool calls
		const toolResults: ToolResult[] = [];
		if (modelResponse.toolCalls) {
			for (const toolCall of modelResponse.toolCalls) {
				const result = await this.executeTool(toolCall);
				toolResults.push(result);
			}
		}

		return {
			id: randomUUID(),
			content: modelResponse.content,
			toolCalls: modelResponse.toolCalls,
			usage: modelResponse.usage,
			metadata: {
				modelProvider: modelProvider.name,
				processingTime: Date.now(),
				toolResults,
			},
		};
	}

	private async createStreamProcessor(
		_input: AgentInput,
		requestId: string,
	): AsyncIterable<StreamEvent> {
		// TODO: Implement streaming
		// For now, return a simple mock stream
		return {
			async *[Symbol.asyncIterator]() {
				yield {
					type: 'token',
					data: 'Streaming response...',
					timestamp: new Date().toISOString(),
				};
				yield {
					type: 'done',
					data: { requestId },
					timestamp: new Date().toISOString(),
				};
			},
		};
	}

	private buildPrompt(input: AgentInput, context: ConversationContext): string {
		let prompt = `${this.config.instructions}\n\n`;

		// Add context
		if (context.previousMessages) {
			for (const msg of context.previousMessages) {
				prompt += `${msg.role}: ${msg.content}\n`;
			}
		}

		// Add relevant memories
		if (context.metadata?.relevantMemories) {
			prompt += '\nRelevant Context:\n';
			for (const memory of context.metadata.relevantMemories as MemoryItem[]) {
				prompt += `- ${memory.content}\n`;
			}
		}

		// Add current input
		for (const inputItem of input.inputs) {
			if (inputItem.type === 'text') {
				prompt += `\nUser: ${inputItem.content}`;
			}
		}

		prompt += '\nAssistant:';

		return prompt;
	}

	private async updateMemory(
		input: AgentInput,
		response: AgentResponse,
	): Promise<void> {
		// Add conversation to episodic memory
		for (const inputItem of input.inputs) {
			if (inputItem.type === 'text') {
				await this.addToMemory(`User: ${inputItem.content}`, 'episodic');
			}
		}

		await this.addToMemory(`Assistant: ${response.content}`, 'episodic');
	}

	private async executeWithTimeout<T>(
		promise: Promise<T>,
		timeoutMs: number,
	): Promise<T> {
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error('Execution timeout')), timeoutMs);
		});

		return Promise.race([promise, timeoutPromise]);
	}

	private handleError(error: Error): void {
		console.error(`[${this.config.id}] Error:`, error);
		// Could implement error reporting, retry logic, etc.
	}

	private handleToolCall(_toolCall: ToolCall): void {
		// Tool call handling logic
	}

	private handleMemoryUpdate(_memoryItem: MemoryItem): void {
		// Memory update handling logic
	}
}
