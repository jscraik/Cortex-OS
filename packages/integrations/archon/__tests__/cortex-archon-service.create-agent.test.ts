import { describe, expect, it } from 'vitest';
import { createCortexArchonService } from '../src/service.js';

const config: any = {
    enableAgentIntegration: true,
    enableTaskOrchestration: false,
};

describe('CortexArchonService createAgent()', () => {
    it('throws because underlying MCP client lacks createAgent implementation', async () => {
        const service = createCortexArchonService(config);
        await service.initialize();
        await expect(
            service.createAgent({ name: 'demo', description: 'desc' }),
        ).rejects.toThrow();
    });
});
