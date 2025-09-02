import { EventEmitter } from "node:events";
import { z } from "zod";

// Agent Task schemas following CloudEvents format
export const AgentTaskRequestedSchema = z.object({
	id: z.string().uuid(),
	type: z.literal("agent.task.requested"),
	source: z.string(),
	subject: z.string(),
	time: z.string().datetime(),
	data: z.object({
		taskId: z.string().uuid(),
		taskType: z.string(),
		payload: z.record(z.unknown()),
		priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
		timeout: z.number().optional(), // in milliseconds
		metadata: z.record(z.unknown()).optional(),
	}),
});

export const AgentTaskCompletedSchema = z.object({
	id: z.string().uuid(),
	type: z.literal("agent.task.completed"),
	source: z.string(),
	subject: z.string(),
	time: z.string().datetime(),
	data: z.object({
		taskId: z.string().uuid(),
		result: z.record(z.unknown()),
		executionTime: z.number(), // in milliseconds
		metadata: z.record(z.unknown()).optional(),
	}),
});

export const AgentTaskFailedSchema = z.object({
	id: z.string().uuid(),
	type: z.literal("agent.task.failed"),
	source: z.string(),
	subject: z.string(),
	time: z.string().datetime(),
	data: z.object({
		taskId: z.string().uuid(),
		error: z.string(),
		errorCode: z.string().optional(),
		executionTime: z.number(), // in milliseconds
		retryable: z.boolean().default(false),
		metadata: z.record(z.unknown()).optional(),
	}),
});

export type AgentTaskRequested = z.infer<typeof AgentTaskRequestedSchema>;
export type AgentTaskCompleted = z.infer<typeof AgentTaskCompletedSchema>;
export type AgentTaskFailed = z.infer<typeof AgentTaskFailedSchema>;

// Task handler interface
export interface TaskHandler {
	canHandle(taskType: string): boolean;
	execute(task: AgentTaskRequested): Promise<Record<string, unknown>>;
}

// Task registry for managing handlers
export class TaskRegistry {
	private handlers = new Map<string, TaskHandler>();

	register(taskType: string, handler: TaskHandler): void {
		this.handlers.set(taskType, handler);
	}

	getHandler(taskType: string): TaskHandler | undefined {
		return this.handlers.get(taskType);
	}

	getSupportedTaskTypes(): string[] {
		return Array.from(this.handlers.keys());
	}

	unregister(taskType: string): boolean {
		return this.handlers.delete(taskType);
	}
}

// Example task handlers
export class DataProcessingHandler implements TaskHandler {
	canHandle(taskType: string): boolean {
		return taskType === "data.process";
	}

	async execute(task: AgentTaskRequested): Promise<Record<string, unknown>> {
		const { payload } = task.data;

		// Simulate data processing
		await new Promise((resolve) => setTimeout(resolve, 100));

		return {
			processed: true,
			inputSize: JSON.stringify(payload).length,
			processedAt: new Date().toISOString(),
			result: {
				...payload,
				processed: true,
				timestamp: new Date().toISOString(),
			},
		};
	}
}

export class AnalysisHandler implements TaskHandler {
	canHandle(taskType: string): boolean {
		return taskType === "data.analyze";
	}

	async execute(task: AgentTaskRequested): Promise<Record<string, unknown>> {
		const { payload } = task.data;

		// Simulate data analysis
		await new Promise((resolve) => setTimeout(resolve, 200));

		return {
			analyzed: true,
			insights: [
				"Pattern detected in data",
				"Anomaly found at position 42",
				"Recommendation: increase monitoring",
			],
			confidence: 0.85,
			processedAt: new Date().toISOString(),
			result: {
				...payload,
				analysis: {
					patterns: ["pattern1", "pattern2"],
					anomalies: ["anomaly1"],
					recommendations: ["recommendation1"],
				},
			},
		};
	}
}

// Main Agent A class
export class AgentA extends EventEmitter {
	private registry = new TaskRegistry();
	private isRunning = false;

	constructor(private agentId: string = "agent-a") {
		super();

		// Register default handlers
		this.registry.register("data.process", new DataProcessingHandler());
		this.registry.register("data.analyze", new AnalysisHandler());
	}

	start(): void {
		if (this.isRunning) {
			return;
		}

		this.isRunning = true;
		this.emit("started", this.agentId);
	}

	stop(): void {
		if (!this.isRunning) {
			return;
		}

		this.isRunning = false;
		this.emit("stopped", this.agentId);
	}

	getSupportedTaskTypes(): string[] {
		return this.registry.getSupportedTaskTypes();
	}

	registerTaskHandler(taskType: string, handler: TaskHandler): void {
		this.registry.register(taskType, handler);
		this.emit("handlerRegistered", taskType);
	}

	async processTask(
		task: AgentTaskRequested,
	): Promise<AgentTaskCompleted | AgentTaskFailed> {
		const startTime = Date.now();
		const handler = this.registry.getHandler(task.data.taskType);

		if (!handler) {
			const executionTime = Date.now() - startTime;
			return {
				id: crypto.randomUUID(),
				type: "agent.task.failed",
				source: this.agentId,
				subject: task.subject,
				time: new Date().toISOString(),
				data: {
					taskId: task.data.taskId,
					error: `No handler found for task type: ${task.data.taskType}`,
					errorCode: "HANDLER_NOT_FOUND",
					executionTime,
					retryable: false,
				},
			};
		}

		try {
			const result = await handler.execute(task);
			const executionTime = Date.now() - startTime;

			const completed: AgentTaskCompleted = {
				id: crypto.randomUUID(),
				type: "agent.task.completed",
				source: this.agentId,
				subject: task.subject,
				time: new Date().toISOString(),
				data: {
					taskId: task.data.taskId,
					result,
					executionTime,
				},
			};

			this.emit("taskCompleted", completed);
			return completed;
		} catch (error) {
			const executionTime = Date.now() - startTime;
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			const failed: AgentTaskFailed = {
				id: crypto.randomUUID(),
				type: "agent.task.failed",
				source: this.agentId,
				subject: task.subject,
				time: new Date().toISOString(),
				data: {
					taskId: task.data.taskId,
					error: errorMessage,
					errorCode: "EXECUTION_ERROR",
					executionTime,
					retryable: true,
				},
			};

			this.emit("taskFailed", failed);
			return failed;
		}
	}

	// Utility method to create a task request
	createTaskRequest(
		taskType: string,
		payload: Record<string, unknown>,
		priority: AgentTaskRequested["data"]["priority"] = "medium",
		timeout?: number,
	): AgentTaskRequested {
		return {
			id: crypto.randomUUID(),
			type: "agent.task.requested",
			source: "external",
			subject: `${this.agentId}:${taskType}`,
			time: new Date().toISOString(),
			data: {
				taskId: crypto.randomUUID(),
				taskType,
				payload,
				priority,
				timeout,
			},
		};
	}
}

// Factory function to create Agent A instance
export function createAgentA(agentId?: string): AgentA {
	return new AgentA(agentId);
}
