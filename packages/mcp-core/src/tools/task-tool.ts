import { z } from 'zod';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

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
				// Simulate step execution - in a real implementation, this would
				// delegate to appropriate sub-agents or tools
				const stepResult = await this.executeStep(step, input.context);

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

	private async executeStep(step: TaskStep): Promise<unknown> {
		// This is a placeholder implementation that simulates step execution
		// In a real implementation, this would:
		// 1. Parse the instruction to determine what action to take
		// 2. Delegate to appropriate sub-agents or tools
		// 3. Handle the result and any errors

		// Simulate some processing time
		await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 500));

		// Simulate different outcomes based on instruction content
		const instruction = step.instruction.toLowerCase();

		if (instruction.includes('fail') || instruction.includes('error')) {
			throw new Error(`Simulated failure for instruction: ${step.instruction}`);
		}

		if (instruction.includes('search') || instruction.includes('find')) {
			return {
				type: 'search_result',
				query: step.instruction,
				results: [`Mock result for: ${step.instruction}`],
				count: 1,
			};
		}

		if (instruction.includes('create') || instruction.includes('write')) {
			return {
				type: 'creation_result',
				instruction: step.instruction,
				created: true,
				output: `Mock output for: ${step.instruction}`,
			};
		}

		if (instruction.includes('analyze') || instruction.includes('check')) {
			return {
				type: 'analysis_result',
				instruction: step.instruction,
				analysis: `Mock analysis for: ${step.instruction}`,
				score: Math.random(),
			};
		}

		// Default result
		return {
			type: 'generic_result',
			instruction: step.instruction,
			completed: true,
			message: `Successfully executed: ${step.instruction}`,
		};
	}

	private generateTaskId(): string {
		return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
}

export const taskTool = new TaskTool();
