/**
 * @file_path packages/mcp-bridge/src/__tests__/mlx-mcp-integration.test.ts
 * @description Ensures MLX integration has no side effects on import
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-28
 * @version 1.0.0
 * @status active
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../mlx-mcp-server.js', () => ({
  MLXMcpServer: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    chat: vi.fn(),
    getHealth: vi.fn(),
    getAvailableModels: vi.fn().mockReturnValue([]),
  })),
}));

vi.mock('../universal-mcp-manager.js', () => ({
  universalMcpManager: {
    isServerInstalled: vi.fn(),
    addMcpServer: vi.fn(),
  },
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('mlx-mcp-integration import', () => {
  it('does not trigger auto registration on import', async () => {
    const { MLXMcpServer } = await import('../mlx-mcp-server.js');
    const { universalMcpManager } = await import('../universal-mcp-manager.js');

    await import('../mlx-mcp-integration.js');

    expect(MLXMcpServer).not.toHaveBeenCalled();
    expect(universalMcpManager.addMcpServer).not.toHaveBeenCalled();
  });
});

describe('mlx-mcp server startup', () => {
  it('starts server using express without dynamic import', async () => {
    const listen = vi.fn((_port, _host, cb) => {
      cb();
      return { close: vi.fn() };
    });
    vi.doMock('express', () => {
      const app = { use: vi.fn(), post: vi.fn(), get: vi.fn(), listen } as any;
      const express = () => app;
      (express as any).json = vi.fn();
      return { default: express };
    });
    const { createMlxIntegration } = await import('../mlx-mcp-integration.js');
    const integration = createMlxIntegration('config.json');
    await integration.startMLXServer(1234);
    expect(listen).toHaveBeenCalled();
  });
});
