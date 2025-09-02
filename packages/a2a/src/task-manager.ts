/**
 * A2A Task Manager Implementation
 * Manages task lifecycle and execution following A2A protocol
 */

import { randomUUID } from "node:crypto";
import {
	A2A_ERROR_CODES,
	type TaskCancelParams,
	type TaskGetParams,
	type TaskId,
	type TaskResult,
	type TaskSendParams,
	type TaskStatus,
} from "./protocol.js";

// Simple implementation for StructuredError
class StructuredError extends Error {
	constructor(
		public code: string,
		message: string,
		public details?: unknown,
	) {
		super(message);
		this.name = "StructuredError";
	}
}

export interface Task {
	readonly id: TaskId;
	readonly status: TaskStatus;
	readonly createdAt: Date;
	readonly updatedAt: Date;
	readonly params: TaskSendParams;
	readonly result?: TaskResult;
	readonly error?: {
		code: number;
		message: string;
		data?: unknown;
	};
}

export interface TaskStore {
	save(task: Task): Promise<void>;
	get(id: TaskId): Promise<Task | null>;
	update(id: TaskId, updates: Partial<Task>): Promise<Task | null>;
	delete(id: TaskId): Promise<boolean>;
	list(status?: TaskStatus): Promise<Task[]>;
}

// In-memory task store implementation
export class InMemoryTaskStore implements TaskStore {
	private readonly tasks = new Map<TaskId, Task>();

	async save(task: Task): Promise<void> {
		this.tasks.set(task.id, { ...task });
	}

	async get(id: TaskId): Promise<Task | null> {
		return this.tasks.get(id) || null;
	}

	async update(id: TaskId, updates: Partial<Task>): Promise<Task | null> {
		const existing = this.tasks.get(id);
		if (!existing) return null;

		const updated: Task = {
			...existing,
			...updates,
			updatedAt: new Date(),
		};

		this.tasks.set(id, updated);
		return updated;
	}

	async delete(id: TaskId): Promise<boolean> {
		return this.tasks.delete(id);
	}

	async list(status?: TaskStatus): Promise<Task[]> {
		const tasks = Array.from(this.tasks.values());
		return status ? tasks.filter((task) => task.status === status) : tasks;
	}

	// Cleanup method for testing
	clear(): void {
		this.tasks.clear();
	}
}

export interface TaskProcessor {
	process(params: TaskSendParams): Promise<TaskResult>;
}

// Simple echo processor for demonstration
export class EchoTaskProcessor implements TaskProcessor {
	async process(params: TaskSendParams): Promise<TaskResult> {
		const id = params.id || randomUUID();

		// Simulate processing delay
		await new Promise((resolve) => setTimeout(resolve, 100));

		return {
			id,
			status: "completed",
			message: {
				role: "assistant",
				parts: [
					{
						text: `Echo: ${params.message.parts.map((p) => p.text).join(" ")}`,
					},
				],
			},
		};
	}
}

export class TaskManager {
	constructor(
		private readonly store: TaskStore = new InMemoryTaskStore(),
		private readonly processor: TaskProcessor = new EchoTaskProcessor(),
		private readonly config = {
			taskTimeoutMs: 30000,
			maxConcurrentTasks: 10,
		},
	) {}

	/**
	 * Send a task for processing (tasks/send)
	 */
	async sendTask(params: TaskSendParams): Promise<TaskResult> {
		const taskId = params.id || randomUUID();
		const now = new Date();

		const task: Task = {
			id: taskId,
			status: "pending",
			createdAt: now,
			updatedAt: now,
			params,
		};

		await this.store.save(task);

		try {
			// Update status to running
			await this.store.update(taskId, { status: "running" });

			// Process the task
			const result = await Promise.race([
				this.processor.process(params),
				this.createTimeoutPromise(taskId),
			]);

			// Update with result
			await this.store.update(taskId, {
				status: "completed",
				result,
			});

			return result;
		} catch (error) {
			const taskError = {
				code:
					error instanceof TaskTimeoutError
						? A2A_ERROR_CODES.TASK_TIMEOUT
						: A2A_ERROR_CODES.INTERNAL_ERROR,
				message: error instanceof Error ? error.message : "Unknown error",
				data: error instanceof Error ? { stack: error.stack } : error,
			};

			await this.store.update(taskId, {
				status: "failed",
				error: taskError,
			});

			throw new StructuredError(
				"TASK_EXECUTION_FAILED",
				`Task ${taskId} failed: ${taskError.message}`,
				{ taskId, error: taskError },
			);
		}
	}

	/**
	 * Get task status (tasks/get)
	 */
	async getTask(params: TaskGetParams): Promise<TaskResult> {
		const task = await this.store.get(params.id);
		if (!task) {
			throw new StructuredError(
				"TASK_NOT_FOUND",
				`Task ${params.id} not found`,
				{
					taskId: params.id,
					code: A2A_ERROR_CODES.TASK_NOT_FOUND,
				},
			);
		}

		return {
			id: task.id,
			status: task.status,
			message: task.result?.message,
			artifacts: task.result?.artifacts,
			error: task.error,
		};
	}

	/**
	 * Cancel a task (tasks/cancel)
	 */
	async cancelTask(params: TaskCancelParams): Promise<void> {
		const task = await this.store.get(params.id);
		if (!task) {
			throw new StructuredError(
				"TASK_NOT_FOUND",
				`Task ${params.id} not found`,
				{
					taskId: params.id,
					code: A2A_ERROR_CODES.TASK_NOT_FOUND,
				},
			);
		}

		if (task.status === "completed" || task.status === "failed") {
			throw new StructuredError(
				"TASK_ALREADY_COMPLETED",
				`Task ${params.id} is already completed`,
				{ taskId: params.id, status: task.status },
			);
		}

		await this.store.update(params.id, {
			status: "cancelled",
			error: {
				code: A2A_ERROR_CODES.TASK_CANCELLED,
				message: "Task was cancelled",
			},
		});
	}

	/**
	 * List tasks (utility method)
	 */
	async listTasks(status?: TaskStatus): Promise<Task[]> {
		return this.store.list(status);
	}

	private async createTimeoutPromise(taskId: TaskId): Promise<never> {
		return new Promise((_, reject) => {
			setTimeout(() => {
				reject(
					new TaskTimeoutError(
						`Task ${taskId} timed out after ${this.config.taskTimeoutMs}ms`,
					),
				);
			}, this.config.taskTimeoutMs);
		});
	}
}

class TaskTimeoutError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TaskTimeoutError";
	}
}

// Factory function following functional style
export const createTaskManager = (options?: {
	store?: TaskStore;
	processor?: TaskProcessor;
	config?: {
		taskTimeoutMs?: number;
		maxConcurrentTasks?: number;
	};
}): TaskManager => {
	const defaultConfig = {
		taskTimeoutMs: 30000,
		maxConcurrentTasks: 10,
	};

	const config = options?.config
		? { ...defaultConfig, ...options.config }
		: defaultConfig;

	return new TaskManager(options?.store, options?.processor, config);
};
