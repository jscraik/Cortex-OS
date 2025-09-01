import { describe, expect, it, vi } from 'vitest';

vi.mock('express', () => {
  const listen = vi.fn((port: number, host: string, cb: () => void) => {
    cb();
    return { close: vi.fn() };
  });
  const app = { use: vi.fn(), get: vi.fn(), post: vi.fn(), listen };
  const router = () => ({ get: vi.fn(), post: vi.fn(), use: vi.fn() });
  const express = vi.fn(() => app) as any;
  express.json = vi.fn(() => (req: any, res: any, next: any) => next());
  express.Router = router;
  return { default: express, Router: router };
});

import express from 'express';
import { ASBRAIMcpIntegration } from '../asbr-ai-mcp-integration.js';

describe('ASBR AI MCP HTTP server', () => {
  it('starts without dynamic import', async () => {
    vi.useFakeTimers();
    const integration = new ASBRAIMcpIntegration();
    const autoRegister = vi.spyOn(integration, 'autoRegister').mockResolvedValue();

    await integration.startHTTPServer(1234);
    vi.runAllTimers();

    expect(express).toHaveBeenCalled();
    const app = (express as any).mock.results[0].value;
    expect(app.use).toHaveBeenCalled();
    expect(app.listen).toHaveBeenCalledWith(1234, '127.0.0.1', expect.any(Function));
    expect(autoRegister).toHaveBeenCalled();

    await integration.stop();
    vi.useRealTimers();
  });
});
