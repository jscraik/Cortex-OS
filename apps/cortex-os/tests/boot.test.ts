import { afterEach, describe, expect, test, vi } from 'vitest';
import { TOKENS } from '../src/tokens.js';

type MemoryRecord = { id: string } & Record<string, unknown>;

vi.mock('../src/services', async () => {
	const actual = await vi.importActual<typeof import('../src/services')>('../src/services');
	return {
		...actual,
		createPolicyAwareStoreFromEnv: vi.fn(() => ({})),
		createEmbedderFromEnv: vi.fn(() => ({})),
		createMemoryService: vi.fn(() => {
			const store = new Map<string, MemoryRecord>();
			return {
				async save(memory: MemoryRecord) {
					store.set(memory.id, memory);
					return memory;
				},
				async get(id: string) {
					return store.get(id);
				},
			};
		}),
	};
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.resetModules();
});

describe('boot container', () => {
	test('creates container with required bindings', async () => {
		const { createContainer } = await import('../src/boot');

		const container = createContainer();

		expect(container.isBound(TOKENS.Memories)).toBe(true);
		expect(container.isBound(TOKENS.Orchestration)).toBe(true);
		expect(container.isBound(TOKENS.MCPGateway)).toBe(true);
	});

	test('throws when a required binding fails validation', async () => {
		const services = await import('../src/services');
		const provideMCPSpy = vi.spyOn(services, 'provideMCP');
		provideMCPSpy.mockImplementationOnce(() => ({
			callTool: vi.fn(),
			close: vi.fn(),
		}));
		provideMCPSpy.mockImplementationOnce(() => undefined as never);

		const { createContainer } = await import('../src/boot');

		expect(() => createContainer()).toThrowError(
			/Failed to resolve binding for Symbol\(MCPGateway\)/,
		);
	});
});
