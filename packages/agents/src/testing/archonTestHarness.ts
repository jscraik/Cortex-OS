import { beforeAll, describe } from 'vitest';
import { createAgentMCPClient } from '../integrations/mcp-client';

interface ArchonHarnessConfig {
    mcpServerUrl?: string;
    webUrl?: string;
    apiKey?: string;
    timeout?: number;
    maxRetries?: number;
}

/**
 * Archon Test Harness
 * Provides conditional test execution for Archon/MCP dependent tests.
 * Usage:
 *   archonDescribe('archon integration', (ctx) => {
 *     it('does something', async () => { ... });
 *   });
 */
export interface ArchonHarnessContext {
    available: boolean;
    reason?: string;
    mcp?: ReturnType<typeof createAgentMCPClient>;
}

const DEFAULT_CONFIG: ArchonHarnessConfig = {
    mcpServerUrl: process.env.ARCHON_MCP_URL || 'http://localhost:8051',
    webUrl: process.env.ARCHON_WEB_URL || 'http://localhost:3737',
    apiKey: process.env.ARCHON_API_KEY,
    timeout: 10000,
    maxRetries: 1,
};

async function probeMCP(config: ArchonHarnessConfig): Promise<boolean> {
    try {
        const client = createAgentMCPClient(config);
        await client.initialize();
        const healthy = await client.healthCheck();
        await client.disconnect();
        return healthy;
    } catch {
        return false;
    }
}

export function archonDescribe(
    name: string,
    suite: (ctx: ArchonHarnessContext) => void,
) {
    const enabled = process.env.ARCHON_TESTS === '1';
    const ctx: ArchonHarnessContext = { available: false };

    describe(name, () => {
        beforeAll(async () => {
            if (!enabled) {
                ctx.available = false;
                ctx.reason = 'ARCHON_TESTS env flag not set';
                return;
            }
            const reachable = await probeMCP(DEFAULT_CONFIG);
            if (!reachable) {
                ctx.available = false;
                ctx.reason = 'Archon MCP server not reachable or unhealthy';
                return;
            }
            const client = createAgentMCPClient(DEFAULT_CONFIG);
            await client.initialize();
            ctx.available = true;
            ctx.mcp = client;
        });

        suite(ctx);
    });
}
