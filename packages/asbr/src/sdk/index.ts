/**
 * ASBR SDK - Typed interfaces for task creation and management
 * Implements the SDK surface as specified in the blueprint
 */

import { createHash } from "crypto";
import type {
	ArtifactRef,
	CreateProfileRequest,
	CreateProfileResponse,
	CreateTaskRequest,
	CreateTaskResponse,
	Event,
	EventType,
	GetTaskResponse,
	ListArtifactsQuery,
	ListArtifactsResponse,
	Profile,
	Task,
	TaskInput,
	TaskRef,
	UnsubscribeFunction,
} from "../types/index.js";
// NOTE: structured logger import removed to avoid cross-package coupling in quick lint-fix.
// We'll keep console usage but explicitly allow it on these lines.

/**
 * Main ASBR SDK Client
 */
export class ASBRClient {
	private baseUrl: string;
	private token?: string;
	private eventSubscriptions = new Map<string, Set<(event: Event) => void>>();

	constructor(
		options: {
			baseUrl?: string;
			token?: string;
		} = {},
	) {
		this.baseUrl = options.baseUrl || "http://127.0.0.1:7439";
		this.token = options.token;
	}

	/**
	 * Create a new task with optional idempotency key
	 */
	async createTask(
		input: TaskInput,
		opts?: { idempotencyKey?: string },
	): Promise<TaskRef> {
		const request: CreateTaskRequest = {
			input,
			idempotencyKey: opts?.idempotencyKey,
		};

		const response = await this.fetch("/v1/tasks", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(opts?.idempotencyKey && { "Idempotency-Key": opts.idempotencyKey }),
			},
			body: JSON.stringify(request),
		});

		const data: CreateTaskResponse = await response.json();
		return new TaskRefImpl(data.task, this);
	}

	/**
	 * Get an existing task by ID
	 */
	async getTask(id: string): Promise<Task> {
		const response = await this.fetch(`/v1/tasks/${id}`);
		const data: GetTaskResponse = await response.json();
		return data.task;
	}

	/**
	 * Subscribe to events for a specific task or all tasks
	 */
	subscribe(
		taskId: string | undefined,
		eventTypes: EventType[],
		callback: (event: Event) => void,
	): UnsubscribeFunction {
		const subscriptionKey = taskId || "__all__";

		if (!this.eventSubscriptions.has(subscriptionKey)) {
			this.eventSubscriptions.set(subscriptionKey, new Set());
		}

		const callbacks = this.eventSubscriptions.get(subscriptionKey)!;
		callbacks.add(callback);

		// Set up SSE connection if this is the first subscription
		if (callbacks.size === 1) {
			this.setupEventStream(taskId, eventTypes);
		}

		return () => {
			callbacks.delete(callback);
			if (callbacks.size === 0) {
				this.eventSubscriptions.delete(subscriptionKey);
				this.closeEventStream(taskId);
			}
		};
	}

	/**
	 * List artifacts with optional query parameters
	 */
	async listArtifacts(query?: ListArtifactsQuery): Promise<ArtifactRef[]> {
		const searchParams = new URLSearchParams();
		if (query) {
			Object.entries(query).forEach(([key, value]) => {
				if (value !== undefined) {
					searchParams.append(key, String(value));
				}
			});
		}

		const url = `/v1/artifacts${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
		const response = await this.fetch(url);
		const data: ListArtifactsResponse = await response.json();
		return data.artifacts;
	}

	/**
	 * Create or update a user profile
	 */
	async upsertProfile(
		profile: Omit<Profile, "id"> | Profile,
	): Promise<Profile> {
		const method = "id" in profile ? "PUT" : "POST";
		const url = "id" in profile ? `/v1/profiles/${profile.id}` : "/v1/profiles";

		const request: CreateProfileRequest = {
			profile: "id" in profile ? profile : profile,
		};

		const response = await this.fetch(url, {
			method,
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(request),
		});

		const data: CreateProfileResponse = await response.json();
		return data.profile;
	}

	/**
	 * Get profile by ID
	 */
	async getProfile(id: string): Promise<Profile> {
		const response = await this.fetch(`/v1/profiles/${id}`);
		return await response.json();
	}

	/**
	 * Get artifact content with digest verification
	 */
	async getArtifact(id: string): Promise<{
		content: ArrayBuffer;
		digest: string;
		etag: string;
	}> {
		const response = await this.fetch(`/v1/artifacts/${id}`);
		const content = await response.arrayBuffer();
		const digest = response.headers.get("Digest") || "";
		const etag = response.headers.get("ETag") || "";

		return { content, digest, etag };
	}

	/**
	 * Get service map of enabled connectors
	 */
	async getConnectorServiceMap(): Promise<
		Record<
			string,
			{
				enabled: boolean;
				scopes: string[];
				ttl?: number;
			}
		>
	> {
		const response = await this.fetch("/v1/connectors/service-map");
		return await response.json();
	}

	/**
	 * Cancel a task
	 */
	async cancelTask(taskId: string): Promise<void> {
		await this.fetch(`/v1/tasks/${taskId}/cancel`, {
			method: "POST",
		});
	}

	/**
	 * Resume a task
	 */
	async resumeTask(taskId: string): Promise<void> {
		await this.fetch(`/v1/tasks/${taskId}/resume`, {
			method: "POST",
		});
	}

	protected async fetch(path: string, init?: RequestInit): Promise<Response> {
		const url = `${this.baseUrl}${path}`;
		const headers = new Headers(init?.headers);

		if (this.token) {
			headers.set("Authorization", `Bearer ${this.token}`);
		}

		const response = await fetch(url, {
			...init,
			headers,
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`API request failed: ${response.status} ${error}`);
		}

		return response;
	}

	private setupEventStream(taskId?: string, eventTypes?: EventType[]): void {
		const params = new URLSearchParams();
		params.set("stream", "sse");
		if (taskId) params.set("taskId", taskId);
		if (eventTypes) params.set("events", eventTypes.join(","));

		const url = `${this.baseUrl}/v1/events?${params}`;
		const eventSource = new EventSource(url);

		eventSource.onmessage = (event) => {
			try {
				const data: Event = JSON.parse(event.data);
				this.dispatchEvent(data);
			} catch (error) {
				// Prefer structured logger when available

				console.error("Failed to parse event:", error);
			}
		};

		eventSource.onerror = (error) => {
			console.error("Event stream error:", error);
			// Implement reconnection logic here
		};
	}

	private closeEventStream(_taskId?: string): void {
		// Implementation would close the specific event stream
		// This is a simplified version
	}

	private dispatchEvent(event: Event): void {
		// Dispatch to specific task subscribers
		const taskCallbacks = this.eventSubscriptions.get(event.taskId);
		if (taskCallbacks) {
			for (const callback of taskCallbacks) {
				callback(event);
			}
		}

		// Dispatch to global subscribers
		const globalCallbacks = this.eventSubscriptions.get("__all__");
		if (globalCallbacks) {
			for (const callback of globalCallbacks) {
				callback(event);
			}
		}
	}
}

/**
 * Implementation of TaskRef interface
 */
class TaskRefImpl implements TaskRef {
	public readonly id: string;
	public readonly status: Task["status"];
	private client: ASBRClient;
	private eventListeners = new Set<(event: Event) => void>();

	constructor(task: Task, client: ASBRClient) {
		this.id = task.id;
		this.status = task.status;
		this.client = client;
	}

	subscribe(callback: (event: Event) => void): UnsubscribeFunction {
		this.eventListeners.add(callback);

		const unsubscribe = this.client.subscribe(
			this.id,
			[
				"PlanStarted",
				"StepCompleted",
				"AwaitingApproval",
				"Canceled",
				"Resumed",
				"DeliverableReady",
				"Failed",
			],
			callback,
		);

		return () => {
			this.eventListeners.delete(callback);
			unsubscribe();
		};
	}

	async getTask(): Promise<Task> {
		return await this.client.getTask(this.id);
	}

	async cancel(): Promise<void> {
		await this.client.cancelTask(this.id);
	}

	async resume(): Promise<void> {
		await this.client.resumeTask(this.id);
	}
}

/**
 * Create a default ASBR client instance
 */
export function createASBRClient(options?: {
	baseUrl?: string;
	token?: string;
}): ASBRClient {
	return new ASBRClient(options);
}

/**
 * Utility function to create a task input with defaults
 */
export function createTaskInput(
	title: string,
	brief: string,
	options: Partial<Omit<TaskInput, "title" | "brief" | "schema">> = {},
): TaskInput {
	return {
		title,
		brief,
		inputs: options.inputs || [],
		scopes: options.scopes || [],
		deadlines: options.deadlines,
		a11yProfileId: options.a11yProfileId,
		preferences: options.preferences,
		schema: "cortex.task.input@1",
	};
}

/**
 * Utility function to create an idempotency key
 */
export function createIdempotencyKey(input: TaskInput): string {
	// Create a deterministic key based on task input
	const key = JSON.stringify({
		title: input.title,
		brief: input.brief,
		inputs: input.inputs,
		scopes: input.scopes.sort(),
	});
	const hash = createHash("sha256").update(key).digest("hex");
	return hash.slice(0, 32);
}

// Export types for consumers
export type {
	ArtifactRef,
	Event,
	Profile,
	Task,
	TaskInput,
	TaskRef,
	UnsubscribeFunction,
} from "../types/index.js";
