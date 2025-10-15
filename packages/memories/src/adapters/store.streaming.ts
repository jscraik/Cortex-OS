import type { Memory } from '../domain/types.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';
import { getIdentifierFactory } from '../utils/secure-random.js';

export interface ChangeEvent {
	type: 'create' | 'update' | 'delete';
	memory?: Memory;
	previousMemory?: Memory;
	memoryId?: string;
	timestamp: string;
	namespace: string;
	version?: string;
}

export interface ChangeLogEntry extends ChangeEvent {
	sequence: number;
}

export interface ChangeLogQuery {
	limit?: number;
	offset?: number;
	operationTypes?: ('create' | 'update' | 'delete')[];
	since?: string;
	until?: string;
}

export interface Subscription {
	id: string;
	namespace: string;
	callback: (change: ChangeEvent) => void;
	unsubscribe: () => void;
}

export class StreamingMemoryStore implements MemoryStore {
	private changeLogs = new Map<string, ChangeLogEntry[]>();
	private subscribers = new Map<string, Map<string, Subscription>>();
	private sequenceNumbers = new Map<string, number>();
	private maxChangeLogSize = 1000;
	private eventVersion = '1.0';

	constructor(private readonly store: MemoryStore) {}

	async upsert(memory: Memory, namespace = 'default'): Promise<Memory> {
		// Check if memory exists to determine if it's an update
		const existing = await this.store.get(memory.id, namespace);

		// Perform the upsert
		const result = await this.store.upsert(memory, namespace);

		// Create and record change event
		const event: ChangeEvent = {
			type: existing ? 'update' : 'create',
			memory: result,
			previousMemory: existing || undefined,
			timestamp: new Date().toISOString(),
			namespace,
			version: this.eventVersion,
		};

		await this.recordChangeEvent(namespace, event);
		await this.notifySubscribers(namespace, event);

		return result;
	}

	async get(id: string, namespace = 'default'): Promise<Memory | null> {
		return this.store.get(id, namespace);
	}

	async delete(id: string, namespace = 'default'): Promise<void> {
		// Get memory before deletion for the event
		const memory = await this.store.get(id, namespace);

		// Perform the deletion
		await this.store.delete(id, namespace);

		if (memory) {
			// Create and record change event
			const event: ChangeEvent = {
				type: 'delete',
				memoryId: id,
				memory,
				timestamp: new Date().toISOString(),
				namespace,
				version: this.eventVersion,
			};

			await this.recordChangeEvent(namespace, event);
			await this.notifySubscribers(namespace, event);
		}
	}

	async searchByText(q: TextQuery, namespace = 'default'): Promise<Memory[]> {
		return this.store.searchByText(q, namespace);
	}

	async searchByVector(
		q: VectorQuery,
		namespace = 'default',
	): Promise<(Memory & { score: number })[]> {
		return this.store.searchByVector(q, namespace);
	}

	async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
		const result = await this.store.purgeExpired(nowISO, namespace);

		// Record purge events
		if (namespace) {
			const event: ChangeEvent = {
				type: 'delete',
				timestamp: new Date().toISOString(),
				namespace,
				version: this.eventVersion,
				memoryId: 'purge-expired',
			};

			await this.recordChangeEvent(namespace, event);
			await this.notifySubscribers(namespace, event);
		}

		return result;
	}

	async list(namespace = 'default', limit?: number, offset?: number): Promise<Memory[]> {
		return this.store.list(namespace, limit, offset);
	}

	// Streaming API methods
	subscribeToChanges(
		namespace: string | '*',
		callback: (change: ChangeEvent) => void,
	): Subscription {
                const subscriptionId = getIdentifierFactory().generateSubscriptionId();

		if (!this.subscribers.has(namespace)) {
			this.subscribers.set(namespace, new Map());
		}

		const namespaceSubscribers = this.subscribers.get(namespace)!;

		const subscription: Subscription = {
			id: subscriptionId,
			namespace,
			callback,
			unsubscribe: () => {
				namespaceSubscribers.delete(subscriptionId);
				if (namespaceSubscribers.size === 0) {
					this.subscribers.delete(namespace);
				}
			},
		};

		namespaceSubscribers.set(subscriptionId, subscription);
		return subscription;
	}

	async getChangeLog(namespace: string, query: ChangeLogQuery = {}): Promise<ChangeLogEntry[]> {
		const changeLog = this.changeLogs.get(namespace) || [];
		let result = [...changeLog];

		// Filter by operation types
		if (query.operationTypes && query.operationTypes.length > 0) {
			result = result.filter((entry) => query.operationTypes?.includes(entry.type));
		}

		// Filter by date range
		if (query.since) {
			const sinceTime = new Date(query.since).getTime();
			result = result.filter((entry) => new Date(entry.timestamp).getTime() >= sinceTime);
		}

		if (query.until) {
			const untilTime = new Date(query.until).getTime();
			result = result.filter((entry) => new Date(entry.timestamp).getTime() <= untilTime);
		}

		// Sort by sequence (newest first)
		result.sort((a, b) => b.sequence - a.sequence);

		// Apply pagination
		if (query.offset) {
			result = result.slice(query.offset);
		}

		if (query.limit) {
			result = result.slice(0, query.limit);
		}

		return result;
	}

	async replayChanges(namespace: string, since: string): Promise<ChangeEvent[]> {
		const changeLog = this.changeLogs.get(namespace) || [];
		const sinceTime = new Date(since).getTime();

		return changeLog
			.filter((entry) => new Date(entry.timestamp).getTime() >= sinceTime)
			.map((entry) => ({
				type: entry.type,
				memory: entry.memory,
				previousMemory: entry.previousMemory,
				memoryId: entry.memoryId,
				timestamp: entry.timestamp,
				namespace: entry.namespace,
				version: entry.version,
			}))
			.reverse(); // Return in chronological order
	}

	setMaxChangeLogSize(size: number): void {
		this.maxChangeLogSize = size;
	}

	async addToChangeLog(namespace: string, event: any): Promise<void> {
		await this.recordChangeEvent(namespace, event);
	}

	async replayEvents(namespace: string): Promise<void> {
		const changeLog = this.changeLogs.get(namespace) || [];

		// Sort by sequence for chronological replay
		const sortedEvents = [...changeLog].sort((a, b) => a.sequence - b.sequence);

		// Clear current state
		const currentMemories = await this.store.list(namespace);
		for (const memory of currentMemories) {
			await this.store.delete(memory.id, namespace);
		}

		// Replay events
		for (const event of sortedEvents) {
			try {
				switch (event.type) {
					case 'create':
					case 'update':
						if (event.memory) {
							await this.store.upsert(event.memory, namespace);
						}
						break;
					case 'delete':
						if (event.memoryId) {
							await this.store.delete(event.memoryId, namespace);
						}
						break;
				}
			} catch (error) {
				console.error(`Error replaying event:`, error);
				// Continue replaying other events
			}
		}
	}

	private async recordChangeEvent(namespace: string, event: ChangeEvent): Promise<void> {
		// Initialize change log for namespace if needed
		if (!this.changeLogs.has(namespace)) {
			this.changeLogs.set(namespace, []);
			this.sequenceNumbers.set(namespace, 0);
		}

		const changeLog = this.changeLogs.get(namespace)!;
		let sequence = this.sequenceNumbers.get(namespace)!;

		sequence++;
		this.sequenceNumbers.set(namespace, sequence);

		const entry: ChangeLogEntry = {
			...event,
			sequence,
		};

		changeLog.push(entry);

		// Compact change log if needed
		if (changeLog.length > this.maxChangeLogSize) {
			const toRemove = changeLog.length - this.maxChangeLogSize;
			changeLog.splice(0, toRemove);
		}
	}

	private async notifySubscribers(namespace: string, event: ChangeEvent): Promise<void> {
		// Notify specific namespace subscribers
		const namespaceSubscribers = this.subscribers.get(namespace);
		if (namespaceSubscribers) {
			const subscribers = Array.from(namespaceSubscribers.values());
			for (const subscription of subscribers) {
				try {
					subscription.callback(event);
				} catch (error) {
					console.error(`Error in subscriber callback:`, error);
				}
			}
		}

		// Notify wildcard subscribers
		const wildcardSubscribers = this.subscribers.get('*');
		if (wildcardSubscribers) {
			const subscribers = Array.from(wildcardSubscribers.values());
			for (const subscription of subscribers) {
				try {
					subscription.callback(event);
				} catch (error) {
					console.error(`Error in wildcard subscriber callback:`, error);
				}
			}
		}
	}
}
