/**
 * @fileoverview Simplified Tool Orchestrator - Functional Design
 * @module SimplifiedToolOrchestrator
 * @description Functional-first orchestrator following CODESTYLE.md
 * @author brAInwav Development Team
 * @version 3.6.1
 * @since 2024-12-21
 */

import { EventEmitter } from 'node:events';
import { withEnhancedSpan } from '../observability/otel';
import { selectExecutionStrategy } from './tool-execution-strategies';
import type {
	ChainExecutionResult,
	ExecutionContext,
	ExecutionStatus,
	ToolChain,
} from './tool-orchestration-contracts';
import { createExecutionContext, validateToolChain } from './tool-orchestration-contracts';
import {
	calculateFinalMetrics,
	createExecutionResult,
	createExecutionStatus,
	simulateToolExecution,
} from './tool-orchestration-utils';

/**
 * Simplified Tool Orchestrator - Functional Design
 * Co-authored-by: brAInwav Development Team
 */
export class SimplifiedToolOrchestrator extends EventEmitter {
	private readonly activeExecutions = new Map<string, Promise<ChainExecutionResult>>();
	private readonly executionStatus = new Map<string, ExecutionStatus>();
	private isShuttingDown = false;

	/**
	 * Execute tool chain with functional approach
	 */
	async executeChain(chain: ToolChain): Promise<ChainExecutionResult> {
		return withEnhancedSpan(
			'simplifiedToolOrchestrator.executeChain',
			async () => {
				const validation = validateToolChain(chain);
				if (!validation.valid) {
					throw new Error(`Invalid tool chain: ${validation.errors.join(', ')}`);
				}

				if (this.activeExecutions.has(chain.id)) {
					throw new Error(`Tool chain ${chain.id} is already executing`);
				}

				const context = this.createContext(chain);
				const executionPromise = this.executeInternal(chain, context);
				this.activeExecutions.set(chain.id, executionPromise);

				try {
					this.emitStartEvent(chain);
					const result = await executionPromise;
					this.emitCompleteEvent(chain, result);
					return result;
				} finally {
					this.activeExecutions.delete(chain.id);
					this.executionStatus.delete(chain.id);
				}
			},
			{
				workflowName: 'brAInwav-tool-orchestration',
				stepKind: 'execution',
				phase: 'chain-execution',
			},
		);
	}

	/**
	 * Get execution status
	 */
	async getExecutionStatus(chainId: string): Promise<ExecutionStatus> {
		const status = this.executionStatus.get(chainId);
		if (!status) {
			throw new Error(`No execution found for chain ID: ${chainId}`);
		}
		return status;
	}

	/**
	 * Shutdown with brAInwav branding
	 */
	async shutdown(): Promise<void> {
		if (this.isShuttingDown) return;

		this.isShuttingDown = true;
		await this.waitForActiveExecutions();
		this.emitShutdownEvent();
		this.cleanup();
	}

	// Private helper methods (functional style)
	private createContext(chain: ToolChain): ExecutionContext {
		return createExecutionContext(chain.id, {
			timeout: chain.timeout,
			securityLevel: chain.securityLevel || 'medium',
			debugging: chain.debugging?.stackTraceEnabled || false,
		});
	}

	private async executeInternal(
		chain: ToolChain,
		context: ExecutionContext,
	): Promise<ChainExecutionResult> {
		const startTime = Date.now();
		const result = createExecutionResult(chain.id, chain.tools.length);

		this.initializeStatus(chain, context);

		try {
			await this.executeByStrategy(chain, context, result);
			return calculateFinalMetrics(result, startTime);
		} catch (error) {
			result.errors.push({
				toolId: 'orchestrator',
				error: (error as Error).message,
				context: { stage: 'execution', chainId: chain.id },
			});
			return calculateFinalMetrics(result, startTime);
		}
	}

	private async executeByStrategy(
		chain: ToolChain,
		context: ExecutionContext,
		result: ChainExecutionResult,
	): Promise<void> {
		const strategy = selectExecutionStrategy(chain.executionStrategy);
		const dependencies = {
			executeTool: simulateToolExecution,
			updateProgress: this.updateProgress.bind(this),
		};

		await strategy(chain.tools, context, result, dependencies);
	}

	private initializeStatus(chain: ToolChain, context: ExecutionContext): void {
		const status = createExecutionStatus(chain.id, true, 0, chain.tools.length);
		status.startTime = context.startTime;
		this.executionStatus.set(chain.id, status);
	}

	private updateProgress(chainId: string, completed: number, total: number): void {
		const status = this.executionStatus.get(chainId);
		if (status) {
			status.completedTools = completed;
			status.progress = total > 0 ? completed / total : 0;
			this.executionStatus.set(chainId, status);
		}
	}

	private emitStartEvent(chain: ToolChain): void {
		this.emit('toolExecutionStarted', {
			type: 'toolExecutionStarted',
			chainId: chain.id,
			toolCount: chain.tools.length,
			strategy: chain.executionStrategy,
			timestamp: new Date().toISOString(),
			organization: 'brAInwav',
		});
	}

	private emitCompleteEvent(chain: ToolChain, result: ChainExecutionResult): void {
		this.emit('toolExecutionCompleted', {
			type: 'toolExecutionCompleted',
			chainId: chain.id,
			success: result.success,
			executionTime: result.totalExecutionTime,
			timestamp: new Date().toISOString(),
			organization: 'brAInwav',
		});
	}

	private emitShutdownEvent(): void {
		this.emit('orchestratorShutdown', {
			type: 'orchestratorShutdown',
			message: 'brAInwav Simplified Tool Orchestrator shutdown complete',
			timestamp: new Date().toISOString(),
			organization: 'brAInwav',
		});
	}

	private async waitForActiveExecutions(): Promise<void> {
		const timeout = 10000;
		await Promise.race([
			Promise.all(Array.from(this.activeExecutions.values())),
			new Promise((resolve) => setTimeout(resolve, timeout)),
		]);
	}

	private cleanup(): void {
		this.activeExecutions.clear();
		this.executionStatus.clear();
		this.removeAllListeners();
	}
}
