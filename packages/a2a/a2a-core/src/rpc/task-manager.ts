import { z } from 'zod';

export const TaskStatus = z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']);

export const TaskSchema = z.object({
	id: z.string(),
	status: TaskStatus,
	message: z.object({
		role: z.enum(['user', 'assistant', 'system']),
		parts: z.array(
			z.object({
				text: z.string(),
			}),
		),
	}),
	result: z
		.object({
			message: z
				.object({
					role: z.enum(['user', 'assistant', 'system']),
					parts: z.array(
						z.object({
							text: z.string(),
						}),
					),
				})
				.optional(),
			metadata: z.record(z.unknown()).optional(),
		})
		.optional(),
	context: z.array(z.unknown()).default([]),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	estimatedCompletion: z.string().datetime().optional(),
	error: z.string().optional(),
});

export type Task = z.infer<typeof TaskSchema>;
export type TaskStatusType = z.infer<typeof TaskStatus>;

export interface TaskCreateParams {
	id: string;
	message: Task['message'];
	context: unknown[];
	streaming?: boolean;
}

export interface ServerSentEvent {
	id?: string;
	type: string;
	data: string;
	retry?: number;
}

export class TaskManager {
	private readonly tasks = new Map<string, Task>();
	private readonly eventStreams = new Map<string, Set<(event: ServerSentEvent) => void>>();

	async sendTask(params: TaskCreateParams): Promise<Task> {
		const now = new Date().toISOString();

		const task: Task = {
			id: params.id,
			status: 'pending',
			message: params.message,
			context: params.context,
			createdAt: now,
			updatedAt: now,
			estimatedCompletion: new Date(Date.now() + 30000).toISOString(), // 30 seconds
		};

		this.tasks.set(task.id, task);

		// Start processing (simulate async work)
		this.processTask(task.id);

		return task;
	}

	async getTask(taskId: string): Promise<Task | null> {
		return this.tasks.get(taskId) || null;
	}

	async cancelTask(taskId: string, reason?: string): Promise<boolean> {
		const task = this.tasks.get(taskId);
		if (!task) return false;

		if (task.status === 'processing' || task.status === 'pending') {
			task.status = 'cancelled';
			task.updatedAt = new Date().toISOString();
			task.error = reason || 'Cancelled by user';

			this.emitEvent(taskId, {
				type: 'cancelled',
				data: JSON.stringify({ taskId, reason }),
			});

			return true;
		}

		return false;
	}

	async *subscribeToTask(
		taskId: string,
		_events: string[], // Events filter - could be used for filtering in future
	): AsyncGenerator<ServerSentEvent> {
		const task = this.tasks.get(taskId);
		if (!task) {
			throw new Error(`Task ${taskId} not found`);
		}

		// Simulate streaming events
		yield {
			type: 'status',
			data: JSON.stringify({ taskId, status: task.status }),
		};

		if (task.status === 'processing') {
			// Emit progress events
			for (let i = 0; i < 5; i++) {
				await this.delay(1000);
				yield {
					type: 'progress',
					data: JSON.stringify({
						taskId,
						progress: (i + 1) * 20,
						message: `Processing step ${i + 1}`,
					}),
				};
			}
		}

		if (task.status === 'completed') {
			yield {
				type: 'completion',
				data: JSON.stringify({
					taskId,
					result: task.result,
				}),
			};
		}
	}

	private async processTask(taskId: string): Promise<void> {
		const task = this.tasks.get(taskId);
		if (!task) return;

		// Update status to processing
		task.status = 'processing';
		task.updatedAt = new Date().toISOString();

		this.emitEvent(taskId, {
			type: 'status_changed',
			data: JSON.stringify({ taskId, status: 'processing' }),
		});

		try {
			// Simulate processing time
			await this.delay(5000);

			// Complete the task
			task.status = 'completed';
			task.updatedAt = new Date().toISOString();
			task.result = {
				message: {
					role: 'assistant',
					parts: [{ text: `Processed: ${task.message.parts[0]?.text}` }],
				},
				metadata: {
					processedAt: new Date().toISOString(),
				},
			};

			this.emitEvent(taskId, {
				type: 'completion',
				data: JSON.stringify({ taskId, result: task.result }),
			});
		} catch (error) {
			task.status = 'failed';
			task.updatedAt = new Date().toISOString();
			task.error = error instanceof Error ? error.message : 'Unknown error';

			this.emitEvent(taskId, {
				type: 'error',
				data: JSON.stringify({ taskId, error: task.error }),
			});
		}
	}

	private emitEvent(taskId: string, event: ServerSentEvent): void {
		const listeners = this.eventStreams.get(taskId);
		if (listeners) {
			for (const listener of listeners) {
				listener(event);
			}
		}
	}

	private async delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	// Generate unique event ID
	generateEventId(): string {
		return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}
}

export const createTaskManager = (): TaskManager => {
	return new TaskManager();
};
