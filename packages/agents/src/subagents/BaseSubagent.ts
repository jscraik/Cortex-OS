/**
 * Base Subagent Class
 *
 * Abstract base class for all subagents in the nO Master Agent Loop system.
 * Provides common functionality and enforces consistent interface.
 */

import { EventEmitter } from 'node:events';
import type { SubagentConfig, SubagentRunInput, SubagentRunResult } from '../lib/types.js';
import { SubagentRunResultSchema } from '../lib/types.js';

export abstract class BaseSubagent extends EventEmitter {
	public readonly config: SubagentConfig;
	protected isActive = false;
	protected executionCount = 0;
	protected lastExecutionTime: Date | null = null;

	constructor(config: SubagentConfig) {
		super();
		this.config = {
			...config,
			name: config.name || 'unknown',
			description: config.description || 'No description provided',
			capabilities: config.capabilities || [],
			tools: config.tools || [],
			model: config.model || 'default',
			systemPrompt: config.systemPrompt || '',
			scope: config.scope || 'project',
			maxConcurrency: config.maxConcurrency || 1,
			timeout: config.timeout || 30000,
		};
	}

	/**
	 * Execute the subagent with the given input
	 */
	abstract execute(input: SubagentRunInput): Promise<SubagentRunResult>;

	/**
	 * Validate input before execution
	 */
	protected validateInput(input: unknown): input is SubagentRunInput {
		return this.isSubagentRunInput(input);
	}

	/**
	 * Type guard for SubagentRunInput
	 */
	private isSubagentRunInput(input: unknown): input is SubagentRunInput {
		return (
			typeof input === 'object' &&
			input !== null &&
			'task' in input &&
			typeof input.task === 'string' &&
			'context' in input &&
			typeof input.context === 'object'
		);
	}

	/**
	 * Create a successful result
	 */
	protected createSuccessResult(
		output: string,
		metrics: { executionTime: number; tokensUsed: number },
	): SubagentRunResult {
		return {
			output,
			metrics,
			success: true,
			error: undefined,
		};
	}

	/**
	 * Create a failed result
	 */
	protected createFailureResult(
		error: string,
		metrics?: { latencyMs?: number; tokensUsed?: number },
	): SubagentRunResult {
		return {
			output: '',
			metrics: metrics || { latencyMs: 0, tokensUsed: 0 },
			success: false,
			error,
		};
	}

	/**
	 * Get subagent statistics
	 */
	getStats(): {
		isActive: boolean;
		executionCount: number;
		lastExecutionTime: Date | null;
		capabilities: string[];
	} {
		return {
			isActive: this.isActive,
			executionCount: this.executionCount,
			lastExecutionTime: this.lastExecutionTime,
			capabilities: this.config.capabilities || [],
		};
	}

	/**
	 * Execute with validation and error handling
	 */
	async executeWithValidation(input: unknown): Promise<SubagentRunResult> {
		if (!this.validateInput(input)) {
			return this.createFailureResult('Invalid input format');
		}

		try {
			this.isActive = true;
			this.emit('subagentExecutionStarted', {
				input,
				timestamp: new Date().toISOString(),
			});

			const startTime = Date.now();
			const result = await this.execute(input);
			const endTime = Date.now();

			// Ensure result matches schema
			const validatedResult = SubagentRunResultSchema.parse(result);

			this.executionCount++;
			this.lastExecutionTime = new Date();
			this.isActive = false;

			// Update metrics if not provided
			if (!validatedResult.metrics) {
				validatedResult.metrics = {
					latencyMs: endTime - startTime,
					tokensUsed: 0, // Should be provided by implementation
				};
			}

			this.emit('subagentExecutionCompleted', {
				input,
				result: validatedResult,
				duration: endTime - startTime,
				timestamp: new Date().toISOString(),
			});

			return validatedResult;
		} catch (error) {
			this.isActive = false;
			this.emit('subagentExecutionFailed', {
				input,
				error,
				timestamp: new Date().toISOString(),
			});

			return this.createFailureResult(error instanceof Error ? error.message : 'Unknown error', {
				latencyMs: 0,
				tokensUsed: 0,
			});
		}
	}

	/**
	 * Check if subagent can handle a specific capability
	 */
	hasCapability(capability: string): boolean {
		return this.config.capabilities?.includes(capability) || false;
	}

	/**
	 * Check if subagent is available for execution
	 */
	isAvailable(): boolean {
		return !this.isActive && this.executionCount < 10; // Default max executions
	}

	/**
	 * Reset subagent state
	 */
	reset(): void {
		this.isActive = false;
		this.executionCount = 0;
		this.lastExecutionTime = null;
		this.emit('subagentReset', {
			timestamp: new Date().toISOString(),
		});
	}
}
