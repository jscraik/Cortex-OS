import { createCortexOsBus } from '../a2a.js';

export interface Envelope {
	id: string;
	type: string;
	occurredAt: string;
	ttlMs: number;
	headers: Record<string, unknown>;
	payload: Record<string, unknown>;
	source?: string;
}

export interface Handler {
	type: string;
	handle: (env: Envelope) => Promise<void> | void;
}

export function createEnvelope({
	type,
	data,
	source,
}: {
	type: string;
	data: Record<string, unknown>;
	source?: string;
}) {
	return {
		id: '00000000-0000-0000-0000-000000000000',
		type,
		occurredAt: new Date().toISOString(),
		ttlMs: 60000,
		headers: {},
		payload: data,
		source,
	};
}

// Updated to use real A2A core instead of mock implementation
export interface A2AWiring {
	bus: ReturnType<typeof createCortexOsBus>['bus'];
	publish: (
		type: string,
		data: Record<string, unknown>,
		source?: string,
	) => Promise<void>;
	publishMcp?: (event: {
		type: string;
		payload: Record<string, unknown>;
	}) => Promise<void>;
}

export function wireA2A(): A2AWiring {
	// Initialize real A2A core integration
	const { bus } = createCortexOsBus({
		busOptions: {
			enableTracing: true,
			strictValidation: true,
		},
	});

	let publishMcp: A2AWiring['publishMcp'];
	if (process.env.CORTEX_MCP_A2A_TELEMETRY === '1') {
		publishMcp = async (evt) => {
			await bus.publish({
				specversion: '1.0',
				id: crypto.randomUUID(),
				source: 'urn:cortex-os:mcp',
				type: evt.type,
				time: new Date().toISOString(),
				data: evt.payload,
				datacontenttype: 'application/json',
			});
		};
	}

	const publish = async (
		type: string,
		data: Record<string, unknown>,
		source = 'urn:cortex-os:runtime',
	) => {
		await bus.publish({
			specversion: '1.0',
			id: crypto.randomUUID(),
			source,
			type,
			time: new Date().toISOString(),
			data,
			datacontenttype: 'application/json',
		});
	};

	return { bus, publish, publishMcp };
}

export const healthHandler: Handler = {
	type: 'cortex.health.check',
	handle: async () => {},
};
