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

export type BusOptions = {};

export type Transport = {};

export interface SchemaRegistry {
	register: (config: any) => void;
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
