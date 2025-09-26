/**
 * @fileoverview Tool Layer Abstraction for nO Architecture
 * @module ToolLayer
 * @description Base tool layer architecture with capability boundaries and security validation - Phase 3.1
 * @author brAInwav Development Team
 * @version 3.1.0
 * @since 2024-12-09
 */

import { EventEmitter } from 'node:events';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { z } from 'zod';
import { createPrefixedId } from '../lib/secure-random.js';

/**
 * Tool layer types with specific capability boundaries
 */
export const ToolLayerTypeSchema = z.enum(['dashboard', 'execution', 'primitive']);
export type ToolLayerType = z.infer<typeof ToolLayerTypeSchema>;

/**
 * Tool definition schema
 */
export const ToolDefinitionSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	capabilities: z.array(z.string()).min(1),
	execute: z.function().args(z.unknown(), z.unknown()).returns(z.promise(z.unknown())),
	validate: z.function().args(z.unknown()).returns(z.boolean()),
	description: z.string().optional(),
	version: z.string().optional(),
	author: z.string().optional(),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

/**
 * Tool execution context
 */
export const ToolExecutionContextSchema = z.object({
	layerType: ToolLayerTypeSchema,
	toolId: z.string(),
	executionId: z.string(),
	timestamp: z.date(),
	userId: z.string().optional(),
	sessionId: z.string().optional(),
});

export type ToolExecutionContext = z.infer<typeof ToolExecutionContextSchema>;

/**
 * Tool metrics
 */
export const ToolMetricsSchema = z.object({
	totalExecutions: z.number().min(0),
	successfulExecutions: z.number().min(0),
	failedExecutions: z.number().min(0),
	averageExecutionTime: z.number().min(0),
	lastExecutionTime: z.date().optional(),
	errorRate: z.number().min(0).max(1),
});

export type ToolMetrics = z.infer<typeof ToolMetricsSchema>;

/**
 * Layer health status
 */
export const LayerHealthSchema = z.object({
	layerType: ToolLayerTypeSchema,
	status: z.enum(['healthy', 'degraded', 'critical', 'offline']),
	registeredTools: z.number().min(0),
	activeExecutions: z.number().min(0),
	totalExecutions: z.number().min(0),
	errorRate: z.number().min(0).max(1),
	lastHealthCheck: z.date(),
});

export type LayerHealth = z.infer<typeof LayerHealthSchema>;

/**
 * Layer capability definitions
 */
const LAYER_CAPABILITIES = {
	dashboard: ['visualization', 'monitoring', 'reporting', 'analytics', 'dashboard-management'],
	execution: [
		'file-system',
		'process-management',
		'network-operations',
		'tool-chaining',
		'resource-management',
	],
	primitive: [
		'atomic-operations',
		'consistency-guarantees',
		'rollback-capabilities',
		'composition-primitives',
	],
} as const;

/**
 * Tool Layer Abstraction - Base class for multi-layer tool system
 */
export class ToolLayer extends EventEmitter {
	private readonly tracer = trace.getTracer('nO-tool-layer');
	private readonly layerType: ToolLayerType;
	private readonly capabilities: readonly string[];
	// Hooks
	private static hooks: {
		init: () => Promise<void>;
		run: (
			event: string,
			ctx: Record<string, unknown>,
		) => Promise<Array<{ action: string; [k: string]: unknown }>>;
	} | null = null;
	private static hooksReady = false;

	// Tool management
	private readonly registeredTools = new Map<string, ToolDefinition>();
	private readonly toolMetrics = new Map<string, ToolMetrics>();
	private readonly activeExecutions = new Set<string>();

	// Layer state
	private isShutdown = false;
	private readonly layerHealth: LayerHealth;
	private totalExecutions = 0;
	private totalErrors = 0;

	constructor(layerType: ToolLayerType) {
		super();

		if (!ToolLayerTypeSchema.safeParse(layerType).success) {
			throw new Error(`Invalid layer type: ${layerType}`);
		}

		this.layerType = layerType;
		this.capabilities = LAYER_CAPABILITIES[layerType];

		this.layerHealth = {
			layerType,
			status: 'healthy',
			registeredTools: 0,
			activeExecutions: 0,
			totalExecutions: 0,
			errorRate: 0,
			lastHealthCheck: new Date(),
		};
	}

	/**
	 * Get layer type
	 */
	getLayerType(): ToolLayerType {
		return this.layerType;
	}

	/**
	 * Get layer capabilities
	 */
	getCapabilities(): readonly string[] {
		return this.capabilities;
	}

	/**
	 * Register a tool with the layer
	 */
	async registerTool(tool: ToolDefinition): Promise<void> {
		return this.tracer.startActiveSpan('tool-layer.register-tool', async (span) => {
			try {
				if (this.isShutdown) {
					throw new Error('Cannot register tools on shutdown layer');
				}

				// Validate tool definition
				const validatedTool = ToolDefinitionSchema.parse(tool);

				// Check capability compatibility
				const incompatibleCapabilities = validatedTool.capabilities.filter(
					(cap) => !this.capabilities.includes(cap),
				);

				if (incompatibleCapabilities.length > 0) {
					throw new Error(
						`Tool capabilities not compatible with ${this.layerType} layer: ${incompatibleCapabilities.join(', ')}`,
					);
				}

				// Check for duplicate tool IDs
				if (this.registeredTools.has(validatedTool.id)) {
					throw new Error(`Tool with ID '${validatedTool.id}' is already registered`);
				}

				// Register the tool
				this.registeredTools.set(validatedTool.id, validatedTool);

				// Initialize metrics for the tool
				this.toolMetrics.set(validatedTool.id, {
					totalExecutions: 0,
					successfulExecutions: 0,
					failedExecutions: 0,
					averageExecutionTime: 0,
					errorRate: 0,
				});

				this.updateLayerHealth();

				this.emit('tool-registered', {
					toolId: validatedTool.id,
					layerType: this.layerType,
					capabilities: validatedTool.capabilities,
					timestamp: new Date(),
				});

				span.setStatus({ code: SpanStatusCode.OK });
				span.setAttributes({
					'tool.id': validatedTool.id,
					'layer.type': this.layerType,
					'tool.capabilities': validatedTool.capabilities.join(','),
				});
			} catch (error) {
				span.recordException(error as Error);
				span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
				throw error;
			} finally {
				span.end();
			}
		});
	}

	/**
	 * Get all registered tools
	 */
	getRegisteredTools(): ToolDefinition[] {
		return Array.from(this.registeredTools.values());
	}

	/**
	 * Discover tools by capability
	 */
	async discoverTools(capability: string): Promise<ToolDefinition[]> {
		const tools = Array.from(this.registeredTools.values()).filter((tool) =>
			tool.capabilities.includes(capability),
		);

		this.emit('tools-discovered', {
			capability,
			layerType: this.layerType,
			toolCount: tools.length,
			timestamp: new Date(),
		});

		return tools;
	}

	/**
	 * Invoke a tool with input validation and security checks
	 */
	async invokeTool(
		toolId: string,
		input: unknown,
		context?: Partial<ToolExecutionContext>,
	): Promise<unknown> {
		return this.tracer.startActiveSpan('tool-layer.invoke-tool', async (span) => {
			const executionId = createPrefixedId(`exec-${Date.now()}`);
			const startTime = Date.now();

			try {
				if (this.isShutdown) {
					throw new Error('Cannot invoke tools on shutdown layer');
				}

				const tool = this.registeredTools.get(toolId);
				if (!tool) {
					throw new Error(`Tool '${toolId}' not found in ${this.layerType} layer`);
				}

				// Create execution context
				const executionContext: ToolExecutionContext = {
					layerType: this.layerType,
					toolId,
					executionId,
					timestamp: new Date(),
					...context,
				};

				// Initialize hooks lazily
				if (!ToolLayer.hooksReady) {
					const HOOKS_MODULE: string = '@cortex-os/hooks';
					const mod = await import(HOOKS_MODULE);
					ToolLayer.hooks = new mod.CortexHooks();
					await (ToolLayer.hooks as { init: () => Promise<void> }).init();
					ToolLayer.hooksReady = true;
				}
				const hooksInstance = ToolLayer.hooks as {
					run: (
						event: string,
						ctx: Record<string, unknown>,
					) => Promise<Array<{ action: string; [k: string]: unknown }>>;
				};

				// PreToolUse hooks: allow/deny/mutate
				let effectiveInput: unknown = input;
				const preResults = await hooksInstance.run('PreToolUse', {
					event: 'PreToolUse',
					tool: { name: toolId, input: effectiveInput },
					cwd: process.cwd(),
					user: executionContext.userId ?? 'system',
					tags: ['orchestration', this.layerType],
				});
				for (const r of preResults) {
					if (r.action === 'deny') {
						throw new Error(`Hook denied tool '${toolId}': ${r.reason}`);
					}
					if (r.action === 'allow' && typeof r.input !== 'undefined') {
						effectiveInput = r.input as unknown;
					}
				}

				// Track active execution
				this.activeExecutions.add(executionId);

				// Input validation
				if (!tool.validate(effectiveInput)) {
					throw new Error('Tool input validation failed');
				}

				// Generate input hash for audit purposes
				const inputHash = this.generateInputHash(effectiveInput as Record<string, unknown>);

				// Execute the tool
				const result = await tool.execute(effectiveInput, executionContext);

				// PostToolUse hooks (best-effort, non-blocking)
				try {
					await hooksInstance.run('PostToolUse', {
						event: 'PostToolUse',
						tool: { name: toolId, input: effectiveInput },
						cwd: process.cwd(),
						user: executionContext.userId ?? 'system',
						tags: ['orchestration', this.layerType],
					});
				} catch {
					// ignore hook errors post-exec
				}

				// Update metrics
				this.updateToolMetrics(toolId, true, Date.now() - startTime);
				this.totalExecutions++;

				// Emit execution event for audit
				this.emit('tool-executed', {
					toolId,
					layerType: this.layerType,
					executionId,
					timestamp: executionContext.timestamp,
					inputHash,
					executionTime: Date.now() - startTime,
					success: true,
				});

				span.setStatus({ code: SpanStatusCode.OK });
				span.setAttributes({
					'tool.id': toolId,
					'layer.type': this.layerType,
					'execution.id': executionId,
					'execution.time_ms': Date.now() - startTime,
				});

				return result;
			} catch (error) {
				// Update error metrics
				this.updateToolMetrics(toolId, false, Date.now() - startTime);
				this.totalExecutions++;
				this.totalErrors++;

				// Emit error event
				this.emit('tool-error', {
					toolId,
					layerType: this.layerType,
					executionId,
					error: error as Error,
					timestamp: new Date(),
				});

				span.recordException(error as Error);
				span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
				throw error;
			} finally {
				// Clean up active execution tracking
				this.activeExecutions.delete(executionId);
				this.updateLayerHealth();
				span.end();
			}
		});
	}

	/**
	 * Get tool metrics
	 */
	getToolMetrics(toolId: string): ToolMetrics | undefined {
		return this.toolMetrics.get(toolId);
	}

	/**
	 * Get layer health status
	 */
	getLayerHealth(): LayerHealth {
		return { ...this.layerHealth };
	}

	/**
	 * Update tool metrics after execution
	 */
	private updateToolMetrics(toolId: string, success: boolean, executionTime: number): void {
		const metrics = this.toolMetrics.get(toolId);
		if (!metrics) return;

		metrics.totalExecutions++;
		metrics.lastExecutionTime = new Date();

		if (success) {
			metrics.successfulExecutions++;
		} else {
			metrics.failedExecutions++;
		}

		// Update average execution time
		const totalTime = metrics.averageExecutionTime * (metrics.totalExecutions - 1) + executionTime;
		metrics.averageExecutionTime = totalTime / metrics.totalExecutions;

		// Update error rate
		metrics.errorRate = metrics.failedExecutions / metrics.totalExecutions;
	}

	/**
	 * Update layer health status
	 */
	private updateLayerHealth(): void {
		this.layerHealth.registeredTools = this.registeredTools.size;
		this.layerHealth.activeExecutions = this.activeExecutions.size;
		this.layerHealth.totalExecutions = this.totalExecutions;
		this.layerHealth.errorRate =
			this.totalExecutions > 0 ? this.totalErrors / this.totalExecutions : 0;
		this.layerHealth.lastHealthCheck = new Date();

		// Determine health status
		if (this.layerHealth.errorRate > 0.5) {
			this.layerHealth.status = 'critical';
		} else if (this.layerHealth.errorRate > 0.2) {
			this.layerHealth.status = 'degraded';
		} else if (this.registeredTools.size === 0) {
			this.layerHealth.status = 'offline';
		} else {
			this.layerHealth.status = 'healthy';
		}
	}

	/**
	 * Generate input hash for audit purposes
	 */
	private generateInputHash(input: Record<string, unknown>): string {
		const inputString = JSON.stringify(
			input,
			Object.keys(input).sort((a, b) => a.localeCompare(b)),
		);
		// Simple hash function - in production, use a proper cryptographic hash
		let hash = 0;
		for (let i = 0; i < inputString.length; i++) {
			const char = inputString.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(16);
	}

	/**
	 * Graceful shutdown with cleanup
	 */
	async shutdown(): Promise<void> {
		if (this.isShutdown) return;

		this.isShutdown = true;

		// Wait for active executions to complete (with timeout)
		const shutdownTimeout = 30000; // 30 seconds
		const startTime = Date.now();

		while (this.activeExecutions.size > 0 && Date.now() - startTime < shutdownTimeout) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		// Force terminate remaining executions
		if (this.activeExecutions.size > 0) {
			console.warn(
				`Force terminating ${this.activeExecutions.size} active executions during shutdown`,
			);
			this.activeExecutions.clear();
		}

		this.emit('layer-shutdown', {
			layerType: this.layerType,
			registeredTools: this.registeredTools.size,
			timestamp: new Date(),
		});

		// Clean up
		this.registeredTools.clear();
		this.toolMetrics.clear();
		this.removeAllListeners();
	}
}
