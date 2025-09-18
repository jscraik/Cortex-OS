// Mock A2A implementation
export interface SchemaCompatibility {
	BACKWARD: 'backward';
	FORWARD: 'forward';
	FULL: 'full';
	NONE: 'none';
}

export interface TopicACL {
	[topic: string]: {
		publish: boolean;
		subscribe: boolean;
	};
}

export interface BusOptions {
	bufferSize?: number;
	timeout?: number;
	retryAttempts?: number;
	[key: string]: unknown;
}

export interface Transport {
	send?: (message: unknown) => Promise<void>;
	receive?: () => Promise<unknown>;
	disconnect?: () => Promise<void>;
	[key: string]: unknown;
}

export interface SchemaConfig {
	name: string;
	version: string;
	schema: unknown;
	compatibility?: string;
}

export interface SchemaRegistry {
	register: (config: SchemaConfig) => void;
}

export function createAgentsSchemaRegistry(): SchemaRegistry {
	return {
		register: () => {},
	};
}

export interface AgentsBusConfig {
	transport?: Transport;
	schemaRegistry?: SchemaRegistry;
	acl?: TopicACL;
	busOptions?: BusOptions;
}

export function createAgentsBus(config: AgentsBusConfig = {}) {
	return {
		bus: {
			publish: () => {},
			subscribe: () => {},
		},
		schemaRegistry: config.schemaRegistry || createAgentsSchemaRegistry(),
		transport: config.transport || {},
	};
}
