import { describe, expect, it } from 'vitest';
import { createCodeAnalysisAgent } from '../../src/agents/code-analysis-agent.js';

describe('agent.failed includes errorCode/status', () => {
  it('emits errorCode and status when provider throws', async () => {
    const events: any[] = [];
    const bus = {
      publish: async (e: any) => events.push(e),
      subscribe: () => ({ unsubscribe() {} }),
      unsubscribe: () => {},
    } as any;
    const mcp = {
      callTool: async () => ({}),
      callToolWithFallback: async () => ({}),
      discoverServers: async () => [],
      isConnected: async () => true,
    } as any;
    const provider = {
      name: 'thrower',
      async generate() {
        const err: any = new Error('Bad gateway');
        err.code = 'bad_gateway';
        err.status = 502;
        throw err;
      },
    } as any;

    const agent = createCodeAnalysisAgent({ provider, eventBus: bus, mcpClient: mcp });
    await expect(
      agent.execute({
        sourceCode: 'function a(){}',
        language: 'javascript',
        analysisType: 'review',
      } as any),
    ).rejects.toThrowError();

    const failed = events.find((e) => e.type === 'agent.failed');
    expect(failed).toBeTruthy();
    expect(failed.data.errorCode).toBe('bad_gateway');
    expect(failed.data.status).toBe(502);
  });
});
