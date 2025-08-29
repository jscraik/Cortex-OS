import { describe, it, expect, afterEach, vi } from 'vitest';
import { ASBRAIMcpIntegration } from '../asbr-ai-mcp-integration.js';

vi.mock('../asbr-ai-mcp-server.js', () => ({
  ASBRAIMcpServer: class {
    listTools = vi.fn().mockResolvedValue({ tools: [] });
    callTool = vi.fn();
    getHealth = vi.fn().mockResolvedValue({ status: 'healthy', tools: 0, features: [] });
  },
}));

describe('ASBR HTTP server', () => {
  const integration = new ASBRAIMcpIntegration();

  afterEach(async () => {
    await integration.stop();
  });

  it('starts Express server without dynamic import', async () => {
    await integration.startHTTPServer(0);
    expect((integration as any).httpServer).toBeDefined();
  });
});
