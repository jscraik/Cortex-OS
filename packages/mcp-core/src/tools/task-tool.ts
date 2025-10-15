import { z } from 'zod';
import { createTimestampedId } from '../utils/secure-random.js';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError, ToolRegistry } from '../tools.js';
import { editTool } from './edit-tool.js';
import { globTool } from './glob-tool.js';
import { grepTool } from './grep-tool.js';
import { multiEditTool } from './multiedit-tool.js';
import { notebookReadTool } from './notebook-read-tool.js';
import { readTool } from './read-tool.js';
import { webFetchTool } from './web-fetch-tool.js';
import { webSearchTool } from './web-search-tool.js';
import { writeTool } from './write-tool.js';

const TaskInputSchema = z.object({
	description: z.string().min(1, 'description is required'),
	instructions: z.array(z.string()).min(1, 'at least one instruction is required'),
	context: z.record(z.unknown()).optional(),
	timeout: z.number().int().positive().max(300000).optional(), // max 5 minutes
	priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
	dependencies: z.array(z.string()).optional(),
});

export type TaskInput = z.infer<typeof TaskInputSchema>;

export interface TaskStep {
	step: number;
	instruction: string;
	status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
	result?: unknown;
	error?: string;
	startTime?: string;
	endTime?: string;
	duration?: number;
}

export interface TaskResult {
	taskId: string;
	description: string;
	status: 'completed' | 'failed' | 'timeout' | 'cancelled';
	steps: TaskStep[];
	totalSteps: number;
	completedSteps: number;
	failedSteps: number;
	skippedSteps: number;
	startTime: string;
	endTime: string;
	totalDuration: number;
	result?: unknown;
	error?: string;
	context?: Record<string, unknown>;
}

export class TaskTool implements McpTool<TaskInput, TaskResult> {
	readonly name = 'task';
	readonly description =
		'Runs a sub-agent to handle complex, multi-step tasks with progress tracking.';
	readonly inputSchema = TaskInputSchema;

	private registry: ToolRegistry | null = null;
	private getRegistry(): ToolRegistry {
		if (this.registry) return this.registry;
		const r = new ToolRegistry();
		// Register a safe, production-ready set of tools
		r.register(readTool);
		r.register(writeTool);
		r.register(editTool);
		r.register(multiEditTool);
		r.register(globTool);
		r.register(grepTool);
		r.register(webFetchTool);
		r.register(webSearchTool);
		r.register(notebookReadTool);
		this.registry = r;
		return r;
	}

	async execute(input: TaskInput, context?: ToolExecutionContext): Promise<TaskResult> {
		const taskId = this.generateTaskId();
		const startTime = new Date();

		if (context?.signal?.aborted) {
			throw new ToolExecutionError('Task execution aborted.', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			const steps: TaskStep[] = input.instructions.map((instruction, index) => ({
				step: index + 1,
				instruction,
				status: 'pending' as const,
			}));

			const timeout = input.timeout || 60000; // 1 minute default
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => {
					reject(
						new ToolExecutionError(`Task timed out after ${timeout}ms`, {
							code: 'E_TASK_TIMEOUT',
						}),
					);
				}, timeout);
			});

			// Execute task with timeout
			const taskPromise = this.executeTask(taskId, input, steps, context);
			const result = await Promise.race([taskPromise, timeoutPromise]);

			const endTime = new Date();
			const totalDuration = endTime.getTime() - startTime.getTime();

			return {
				...result,
				startTime: startTime.toISOString(),
				endTime: endTime.toISOString(),
				totalDuration,
			};
		} catch (error) {
			const endTime = new Date();
			const totalDuration = endTime.getTime() - startTime.getTime();

			if (error instanceof ToolExecutionError) {
				return {
					taskId,
					description: input.description,
					status: error.code === 'E_TASK_TIMEOUT' ? 'timeout' : 'failed',
					steps: [],
					totalSteps: input.instructions.length,
					completedSteps: 0,
					failedSteps: 0,
					skippedSteps: input.instructions.length,
					startTime: startTime.toISOString(),
					endTime: endTime.toISOString(),
					totalDuration,
					error: error.message,
					context: input.context,
				};
			}

			throw error;
		}
	}

	private async executeTask(
		taskId: string,
		input: TaskInput,
		steps: TaskStep[],
		context?: ToolExecutionContext,
	): Promise<TaskResult> {
		let completedSteps = 0;
		let failedSteps = 0;
		let skippedSteps = 0;
		let taskStatus: TaskResult['status'] = 'completed';
		let taskError: string | undefined;
		let taskResult: unknown;

		for (const step of steps) {
			if (context?.signal?.aborted) {
				step.status = 'skipped';
				skippedSteps++;
				continue;
			}

			step.status = 'in_progress';
			step.startTime = new Date().toISOString();

			try {
				const stepResult = await this.executeStep(step, context);

				step.status = 'completed';
				step.result = stepResult;
				completedSteps++;
			} catch (error) {
				step.status = 'failed';
				step.error = error instanceof Error ? error.message : String(error);
				failedSteps++;

				// Decide whether to continue or fail the entire task
				if (input.priority === 'urgent' || failedSteps > Math.floor(steps.length / 2)) {
					taskStatus = 'failed';
					taskError = `Task failed at step ${step.step}: ${step.error}`;

					// Mark remaining steps as skipped
					for (let i = steps.indexOf(step) + 1; i < steps.length; i++) {
						steps[i].status = 'skipped';
						skippedSteps++;
					}
					break;
				}
			}

			step.endTime = new Date().toISOString();
			if (step.startTime && step.endTime) {
				step.duration = new Date(step.endTime).getTime() - new Date(step.startTime).getTime();
			}
		}

		// Determine final task result
		if (taskStatus === 'completed' && completedSteps > 0) {
			taskResult = {
				summary: `Successfully completed ${completedSteps} of ${steps.length} steps`,
				steps: steps.filter((s) => s.status === 'completed').map((s) => s.result),
			};
		}

		return {
			taskId,
			description: input.description,
			status: taskStatus,
			steps,
			totalSteps: steps.length,
			completedSteps,
			failedSteps,
			skippedSteps,
			startTime: '', // Will be set by caller
			endTime: '', // Will be set by caller
			totalDuration: 0, // Will be set by caller
			result: taskResult,
			error: taskError,
			context: input.context,
		};
	}

	private async executeStep(step: TaskStep, context?: ToolExecutionContext): Promise<unknown> {
		// Accept JSON instruction format: { tool: string, input: unknown }
		// If not JSON, attempt a minimal "tool: <name> | input: <json>" format.
		const registry = this.getRegistry();
		let toolName: string | null = null;
		let toolInput: unknown = null;

		// Try strict JSON first
		try {
			const parsed = JSON.parse(step.instruction);
			if (parsed && typeof parsed === 'object' && 'tool' in parsed && 'input' in parsed) {
				toolName = String((parsed as any).tool);
				toolInput = (parsed as any).input;
			}
		} catch {
			// Fallback: try simple prefix format
			const m = step.instruction.match(/^tool\s*:\s*(\w+)\s*\|\s*input\s*:\s*(\{[\s\S]*\})$/i);
			if (m) {
				toolName = m[1];
				try {
					toolInput = JSON.parse(m[2]);
				} catch (e) {
					throw new ToolExecutionError(
						`Invalid JSON input for tool ${toolName}: ${e instanceof Error ? e.message : String(e)}`,
						{ code: 'E_TASK_INVALID_INPUT', cause: e },
					);
				}
			}
		}

		if (!toolName) {
			throw new ToolExecutionError(
				'Instruction must be JSON with { tool, input } or "tool: <name> | input: <json>"',
				{ code: 'E_TASK_BAD_INSTRUCTION' },
			);
		}

		try {
			const result = await registry.execute(toolName, toolInput, context);
			return { type: 'tool_result', tool: toolName, result };
		} catch (e) {
			if (e instanceof ToolExecutionError) throw e;
			throw new ToolExecutionError(
				`Tool ${toolName} execution failed: ${e instanceof Error ? e.message : String(e)}`,
				{ code: 'E_TASK_TOOL_FAILED', cause: e },
			);
		}
	}

        private generateTaskId(): string {
                return createTimestampedId('task');
        }
}

export const taskTool = new TaskTool();
