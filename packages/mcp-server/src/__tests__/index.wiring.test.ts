import { describe, expect, it, vi } from 'vitest';

const registerTools = vi.fn();
const registerPiecesTools = vi.fn();
const createPrompts = vi.fn();
const createResources = vi.fn();
const startTransport = vi.fn(async () => ({ mode: 'http', stop: vi.fn() }));
const prewarm = vi.fn().mockResolvedValue(undefined);
const scheduleHeartbeat = vi.fn().mockReturnValue(() => undefined);

vi.mock('../config/hybrid.js', () => ({
	loadHybridConfig: () => ({ strategy: null, enforcement: null }),
}));

vi.mock('../config/connectors.js', () => ({
	loadConnectorsConfig: () => ({
		enabled: false,
		manifest: {
			brand: 'brAInwav',
			version: '0',
			ttlSeconds: 0,
			connectors: [],
		},
		manifestPath: 'mock',
		apiKey: undefined,
	}),
}));

vi.mock('@cortex-os/asbr/types', () => ({
	connectorsManifestSchema: {
		parse: (value: unknown) => value,
	},
}));

vi.mock('../utils/config.js', () => ({
	loadServerConfig: () => ({
		logLevel: 'silent',
		piecesEnabled: false,
		ollamaEnabled: false,
		promptsEnabled: true,
		resourcesEnabled: true,
		host: '0.0.0.0',
		port: 3024,
		httpEndpoint: '/mcp',
		ollamaHost: 'http://127.0.0.1:11434',
	}),
}));

vi.mock('../config/ollama.js', () => ({
	loadOllamaConfig: () => ({
		baseUrl: 'http://127.0.0.1:11434',
		defaultModel: 'llama3.2',
		keepAlive: '5m',
		prewarmModels: [],
		heartbeatInterval: '5m',
		watchdogIdleMs: 0,
		requiredModels: [],
		healthEndpoint: undefined,
		defaults: {
			tool_calling: undefined,
			embedding: undefined,
			chat: undefined,
		},
	}),
}));

vi.mock('../server/mcp-server.js', () => ({
	createServer: () => ({ server: { tools: {}, prompts: {}, resources: {} }, authenticator: {} }),
}));

vi.mock('../server/transport.js', () => ({
	startTransport,
}));

vi.mock('../tools/index.js', () => ({
	registerTools,
	registerPiecesTools,
}));

vi.mock('../prompts/index.js', () => ({
	createPrompts,
}));

vi.mock('../resources/index.js', () => ({
	createResources,
}));

vi.mock('../server/warmup.js', () => ({
	prewarm,
	scheduleHeartbeat,
}));

describe('index wiring', () => {
	it('bootstraps server components and starts transport', async () => {
		await import('../index.ts');
		await Promise.resolve(); // allow async microtasks
		expect(registerTools).toHaveBeenCalled();
		expect(createPrompts).toHaveBeenCalled();
		expect(createResources).toHaveBeenCalled();
		expect(startTransport).toHaveBeenCalled();
		expect(prewarm).not.toHaveBeenCalled();
	});
});
