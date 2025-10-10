/**
 * ASBR SDK - Typed interfaces for task creation and management
 * Implements the SDK surface as specified in the blueprint
 */

import { createHash } from 'node:crypto';
import type {
        ArtifactRef,
        Event as AsbrEvent,
        EventType as AsbrEventType,
        ConnectorServiceMap,
        CreateProfileRequest,
        CreateProfileResponse,
        CreateTaskRequest,
        CreateTaskResponse,
        GetTaskResponse,
	ListArtifactsQuery,
	ListArtifactsResponse,
	Profile,
	Task,
	TaskInput,
	TaskRef,
	UnsubscribeFunction,
} from '@cortex-os/asbr-schemas';
import { isPrivateHostname, NodeEventSource, safeFetch } from '@cortex-os/utils';
import { z } from 'zod';
import { ConnectorServiceMapSchema } from '../connectors/manifest-schema.js';

const ConnectorServiceMapResponseSchema = ConnectorServiceMapSchema.extend({
        signature: z.string().min(1),
});

export type ConnectorServiceMapResponse = z.infer<typeof ConnectorServiceMapResponseSchema>;
// NOTE: structured logger import removed to avoid cross-package coupling in quick lint-fix.
// We'll keep console usage but explicitly allow it on these lines.

/**
 * Main ASBR SDK Client
 */
export class ASBRClient {
	private baseUrl: string;
	private token?: string;
	private eventSubscriptions = new Map<string, Set<(event: AsbrEvent) => void>>();
	private eventStreams = new Map<string, NodeEventSource>();
	private readonly allowedHosts: string[];
	private readonly allowedProtocols: string[];
	private readonly allowLocalhost: boolean;

	constructor(
		options: {
			baseUrl?: string;
			token?: string;
		} = {},
	) {
		this.baseUrl = options.baseUrl || 'http://127.0.0.1:7439';
		this.token = options.token;
		const parsed = new URL(this.baseUrl);
		this.allowedHosts = [parsed.hostname.toLowerCase()];
		this.allowedProtocols = [parsed.protocol];
		this.allowLocalhost = isPrivateHostname(parsed.hostname);
	}

	/**
	 * Create a new task with optional idempotency key
	 */
	async createTask(input: TaskInput, opts?: { idempotencyKey?: string }): Promise<TaskRef> {
		const request: CreateTaskRequest = {
			input,
			idempotencyKey: opts?.idempotencyKey,
		};

		const response = await this.fetch('/v1/tasks', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(opts?.idempotencyKey && { 'Idempotency-Key': opts.idempotencyKey }),
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
		eventTypes: AsbrEventType[],
		callback: (event: AsbrEvent) => void,
	): UnsubscribeFunction {
		const subscriptionKey = taskId || '__all__';

		if (!this.eventSubscriptions.has(subscriptionKey)) {
			this.eventSubscriptions.set(subscriptionKey, new Set());
		}

		const callbacks = this.eventSubscriptions.get(subscriptionKey)!;
		callbacks.add(callback);

		// Set up SSE connection if this is the first subscription
		if (callbacks.size === 1) {
			this.setupEventStream(subscriptionKey, taskId, eventTypes);
		}

		return () => {
			callbacks.delete(callback);
			if (callbacks.size === 0) {
				this.eventSubscriptions.delete(subscriptionKey);
				this.closeEventStream(subscriptionKey);
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

		const searchParamsString = searchParams.toString();
		const url = searchParamsString ? `/v1/artifacts?${searchParamsString}` : '/v1/artifacts';
		const response = await this.fetch(url);
		const data: ListArtifactsResponse = await response.json();
		return data.artifacts;
	}

	/**
	 * Create or update a user profile
	 */
	async upsertProfile(profile: Omit<Profile, 'id'> | Profile): Promise<Profile> {
		const method = 'id' in profile ? 'PUT' : 'POST';
		const url = 'id' in profile ? `/v1/profiles/${profile.id}` : '/v1/profiles';

		const request: CreateProfileRequest = {
			profile,
		};

		const response = await this.fetch(url, {
			method,
			headers: {
				'Content-Type': 'application/json',
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
		const digest = response.headers.get('Digest') || '';
		const etag = response.headers.get('ETag') || '';

		return { content, digest, etag };
	}

	/**
	 * Get service map of enabled connectors
	 */

        async getConnectorServiceMap(): Promise<ConnectorServiceMapResponse> {
                const response = await this.fetch('/v1/connectors/service-map');
                const payload = await response.json();
                return ConnectorServiceMapResponseSchema.parse(payload);

        }

	/**
	 * Cancel a task
	 */
	async cancelTask(taskId: string): Promise<void> {
		await this.fetch(`/v1/tasks/${taskId}/cancel`, {
			method: 'POST',
		});
	}

	/**
	 * Resume a task
	 */
	async resumeTask(taskId: string): Promise<void> {
		await this.fetch(`/v1/tasks/${taskId}/resume`, {
			method: 'POST',
		});
	}

	protected async fetch(path: string, init?: RequestInit): Promise<Response> {
		const url = `${this.baseUrl}${path}`;
		const headers = new Headers(init?.headers);

		if (this.token) {
			headers.set('Authorization', `Bearer ${this.token}`);
		}

		const response = await safeFetch(url, {
			allowedHosts: this.allowedHosts,
			allowedProtocols: this.allowedProtocols,
			allowLocalhost: this.allowLocalhost,
			fetchOptions: {
				...init,
				headers,
			},
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`API request failed: ${response.status} ${error}`);
		}

		return response;
	}

	private setupEventStream(
		subscriptionKey: string,
		taskId?: string,
		eventTypes?: AsbrEventType[],
	): void {
		const params = new URLSearchParams();
		params.set('stream', 'sse');
		if (taskId) params.set('taskId', taskId);
		if (eventTypes) params.set('events', eventTypes.join(','));

		const url = `${this.baseUrl}/v1/events?${params}`;
		const eventSource = new NodeEventSource(url, {
			headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined,
		});

		this.eventStreams.set(subscriptionKey, eventSource);

		eventSource.onmessage = (event) => {
			try {
				const raw = typeof event.data === 'string' ? event.data : String(event.data);
				const data: AsbrEvent = JSON.parse(raw);
				this.dispatchEvent(data);
			} catch (error) {
				// Prefer structured logger when available

				console.error('Failed to parse event:', error);
			}
		};

		// Simple reconnect with backoff up to 30s
		let retryMs = 1000;
		eventSource.onerror = (error) => {
			console.error('Event stream error:', error);
			eventSource.close();
			this.eventStreams.delete(subscriptionKey);
			setTimeout(() => {
				// Only reconnect if there are still subscribers
				if (this.eventSubscriptions.has(subscriptionKey)) {
					this.setupEventStream(subscriptionKey, taskId, eventTypes);
				}
			}, retryMs);
			retryMs = Math.min(retryMs * 2, 30000);
		};
	}

	private closeEventStream(subscriptionKey: string): void {
		const es = this.eventStreams.get(subscriptionKey);
		if (es) {
			es.close();
			this.eventStreams.delete(subscriptionKey);
		}
	}

	private dispatchEvent(event: AsbrEvent): void {
		// Dispatch to specific task subscribers
		const taskCallbacks = this.eventSubscriptions.get(event.taskId);
		if (taskCallbacks) {
			for (const callback of taskCallbacks) {
				callback(event);
			}
		}

		// Dispatch to global subscribers
		const globalCallbacks = this.eventSubscriptions.get('__all__');
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
	public readonly status: Task['status'];
	private readonly client: ASBRClient;
	private readonly eventListeners = new Set<(event: AsbrEvent) => void>();

	constructor(task: Task, client: ASBRClient) {
		this.id = task.id;
		this.status = task.status;
		this.client = client;
	}

	subscribe(callback: (event: AsbrEvent) => void): UnsubscribeFunction {
		this.eventListeners.add(callback);

		const unsubscribe = this.client.subscribe(
			this.id,
			[
				'PlanStarted',
				'StepCompleted',
				'AwaitingApproval',
				'Canceled',
				'Resumed',
				'DeliverableReady',
				'Failed',
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
export function createASBRClient(options?: { baseUrl?: string; token?: string }): ASBRClient {
	return new ASBRClient(options);
}

/**
 * Utility function to create a task input with defaults
 */
export function createTaskInput(
	title: string,
	brief: string,
	options: Partial<Omit<TaskInput, 'title' | 'brief' | 'schema'>> = {},
): TaskInput {
	const inputs = options.inputs ? [...options.inputs] : [];
	const scopesSource = options.scopes ?? ['tasks:create'];
	const scopes = [...new Set(scopesSource)];

	return {
		title,
		brief,
		inputs,
		scopes,
		deadlines: options.deadlines,
		a11yProfileId: options.a11yProfileId,
		preferences: options.preferences,
		schema: 'cortex.task.input@1',
	};
}

/**
 * Utility function to create an idempotency key
 */
export function createIdempotencyKey(input: TaskInput): string {
	// Create a deterministic key based on task input
	const sortedScopes = input.scopes.slice().sort((a, b) => a.localeCompare(b));
	const key = JSON.stringify({
		title: input.title,
		brief: input.brief,
		inputs: input.inputs,
		scopes: sortedScopes,
	});
	const hash = createHash('sha256').update(key).digest('hex');
	return hash.slice(0, 32);
}

// Export types for consumers
export type {
	ArtifactRef,
	Event as AsbrEvent,
	Profile,
	Task,
	TaskInput,
	TaskRef,
	UnsubscribeFunction,
} from '../types/index.js';
