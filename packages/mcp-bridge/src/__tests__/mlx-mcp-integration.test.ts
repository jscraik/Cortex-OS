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
