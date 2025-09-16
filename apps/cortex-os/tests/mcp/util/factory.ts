import { Container } from 'inversify';
import { createMcpGateway } from '../../../src/mcp/gateway';
import type { CortexOsToolName } from '../../../src/mcp/tools';
import { TOKENS } from '../../../src/tokens';

export interface TestMcpFacade {
    listTools(): { name: CortexOsToolName; description: string }[];
    callTool(tool: CortexOsToolName, input: unknown): Promise<unknown>;
    close(): Promise<void> | void;
}

export interface CreateTestMcpOptions {
    allowMutations?: boolean;
    runtimeConfig?: Record<string, unknown>;
    auditSink?: (e: Record<string, unknown>) => void;
    capturePublished?: boolean;
}

export function createTestMcpContainer(opts: CreateTestMcpOptions = {}) {
    const c = new Container({ defaultScope: 'Singleton' });
    c.bind(TOKENS.Memories).toConstantValue({});
    c.bind(TOKENS.Orchestration).toConstantValue({ config: {} });

    const published: { type: string; payload: Record<string, unknown> }[] = [];

    const gateway = createMcpGateway({
        memories: {},
        orchestration: { config: {} },
        config: { runtime: opts.runtimeConfig || {} },
        audit: opts.auditSink,
        publishMcpEvent: opts.capturePublished
            ? (evt) => {
                published.push(evt);
            }
            : undefined,
        security: {
            allowTool: (name) =>
                opts.allowMutations
                    ? true
                    : !['config.set', 'system.restart_service'].includes(name),
        },
    });

    const facade: TestMcpFacade = {
        listTools: () =>
            gateway.listTools() as { name: CortexOsToolName; description: string }[],
        callTool: (tool, input) => gateway.callTool(tool, input),
        close: async () => { },
    };

    c.bind(TOKENS.MCPGateway).toConstantValue(facade);
    return { container: c, mcp: facade, published };
}
listTools: () =>
    gateway.listTools() as { name: CortexOsToolName; description: string }[],
    callTool: (tool, input) => gateway.callTool(tool, input),
        close: async () => { },
	};

c.bind(TOKENS.MCPGateway).toConstantValue(facade);
return { container: c, mcp: facade, published };
}
listTools: () =>
    gateway.listTools() as { name: CortexOsToolName; description: string }[],
    callTool: (tool, input) => gateway.callTool(tool, input),
        close: async () => { },
	};

c.bind(TOKENS.MCPGateway).toConstantValue(facade);
return { container: c, mcp: facade, published };
}
listTools: () =>
    gateway.listTools() as { name: CortexOsToolName; description: string }[],
    callTool: (tool, input) => gateway.callTool(tool, input),
        close: async () => { },
	};

c.bind(TOKENS.MCPGateway).toConstantValue(facade);
return { container: c, mcp: facade, published };
}
listTools: () =>
    gateway.listTools() as { name: CortexOsToolName; description: string }[],
    callTool: (tool, input) => gateway.callTool(tool, input),
        close: async () => { },
	};

c.bind(TOKENS.MCPGateway).toConstantValue(facade);
return { container: c, mcp: facade, published };
}
listTools: () =>
    gateway.listTools() as { name: CortexOsToolName; description: string }[],
    callTool: (tool, input) => gateway.callTool(tool, input),
        close: async () => { },
	};

c.bind(TOKENS.MCPGateway).toConstantValue(facade);
return { container: c, mcp: facade, published };
}
listTools: () =>
    gateway.listTools() as { name: CortexOsToolName; description: string }[],
    callTool: (tool, input) => gateway.callTool(tool, input),
        close: async () => { },
	};

c.bind(TOKENS.MCPGateway).toConstantValue(facade);
return { container: c, mcp: facade, published };
}
listTools: () =>
    gateway.listTools() as { name: CortexOsToolName; description: string }[],
    callTool: (tool, input) => gateway.callTool(tool, input),
        close: async () => { },
	};

c.bind(TOKENS.MCPGateway).toConstantValue(facade);
return { container: c, mcp: facade, published };
}
listTools: () =>
    gateway.listTools() as { name: CortexOsToolName; description: string }[],
    callTool: (tool, input) => gateway.callTool(tool, input),
        close: async () => { },
	};

c.bind(TOKENS.MCPGateway).toConstantValue(facade);
return { container: c, mcp: facade, published };
}
listTools: () =>
    gateway.listTools() as { name: CortexOsToolName; description: string }[],
    callTool: (tool, input) => gateway.callTool(tool, input),
        close: async () => { },
	};

c.bind(TOKENS.MCPGateway).toConstantValue(facade);
return { container: c, mcp: facade, published };
}
listTools: () =>
    gateway.listTools() as { name: CortexOsToolName; description: string }[],
    callTool: (tool, input) => gateway.callTool(tool, input),
        close: async () => { },
	};

c.bind(TOKENS.MCPGateway).toConstantValue(facade);
return { container: c, mcp: facade, published };
}
