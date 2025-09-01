import { describe, expect, it } from 'vitest';

describe('@cortex-os/mcp contract exports', () => {
  it('exposes handleMCP from index', async () => {
    const mod = await import('../src/index.js');
    expect(typeof mod.handleMCP).toBe('function');
  });

  it('exposes client facade', async () => {
    const client = await import('../src/client.js');
    expect(client).toBeTruthy();
  });

  it('exposes bridge facade', async () => {
    const bridge = await import('../src/bridge.js');
    expect(bridge).toBeTruthy();
  });

  it('exposes server facade', async () => {
    const server = await import('../src/server.js');
    expect(server).toBeTruthy();
  });

  it('exposes registry facade', async () => {
    const registry = await import('../src/registry.js');
    expect(registry).toBeTruthy();
  });
});
