import { describe, expect, it } from 'vitest';

// Minimal wrapper smoke test: ensure the wrapper module is loadable
// and exposes some exports (delegated to @cortex-os/mcp/bridge).
describe('@cortex-os/mcp-bridge wrapper', () => {
  it('loads wrapper module', async () => {
    const bridge = await import('../index.js');
    expect(bridge).toBeTruthy();
    expect(Object.keys(bridge).length).toBeGreaterThan(0);
  });
});
