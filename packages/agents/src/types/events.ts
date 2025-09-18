/**
 * Event types for the agents package
 */

export interface EventBus {
	publish(event: CloudEvent): Promise<void>;
}

export interface CloudEvent {
	specversion: '1.0';
	id: string;
	type: string;
	source: string;
	time: string;
	ttlMs?: number;
	headers: Record<string, string>;
	data: unknown;
}
