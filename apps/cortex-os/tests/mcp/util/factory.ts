import { Container } from 'inversify';
import { createMcpGateway } from '../../../src/mcp/gateway';
import type { CortexOsToolName } from '../../../src/mcp/tools';
import { provideMemories, provideOrchestration } from '../../../src/services';
import { TOKENS } from '../../../src/tokens';

export interface TestMcpFacade {
	listTools(): { name: CortexOsToolName; description: string }[];
	callTool(tool: CortexOsToolName, input: unknown): Promise<unknown>;
}

export interface CreateTestMcpOptions {
	allowMutations?: boolean;
	runtimeConfig?: Record<string, unknown>;
	auditSink?: (e: Record<string, unknown>) => void;
	capturePublished?: boolean;
}

export function createTestMcpContainer(opts: CreateTestMcpOptions = {}) {
	const container = new Container({ defaultScope: 'Singleton' });
	const published: { type: string; payload: Record<string, unknown> }[] = [];

	const memories = provideMemories();
	const orchestration = provideOrchestration();

	container.bind(TOKENS.Memories).toConstantValue(memories);
	container.bind(TOKENS.Orchestration).toConstantValue(orchestration);

	const gateway = createMcpGateway({
		memories,
		orchestration,
		config: { runtime: opts.runtimeConfig ?? {} },
		audit: opts.auditSink,
		publishMcpEvent: opts.capturePublished
			? (evt) => {
					published.push(evt);
				}
			: undefined,
		security: {
			allowTool: (name) =>
				opts.allowMutations ? true : !['config.set', 'system.restart_service'].includes(name),
		},
	});

	const facade: TestMcpFacade = {
		listTools: () => gateway.listTools(),
		callTool: (tool, input) => gateway.callTool(tool, input),
	};

	container.bind(TOKENS.MCPGateway).toConstantValue(gateway);

	return { container, mcp: facade, published };
}
