/**
 * @file_path apps/cortex-os/packages/mcp/src/universal-mcp-manager.test.ts
 * @description Basic tests for universal MCP manager
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-20
 * @version 1.0.0
 * @status active
 */

import { describe, expect, it } from 'vitest';
import { universalMcpManager } from './universal-mcp-manager.js';

describe('Universal MCP Manager - Basic Tests', () => {
  it('should exist and be importable', () => {
    expect(universalMcpManager).toBeDefined();
    expect(typeof universalMcpManager.parseMcpCommand).toBe('function');
    expect(typeof universalMcpManager.validateMcpServer).toBe('function');
    expect(typeof universalMcpManager.generateSecureConfig).toBe('function');
  });

  it('should parse simple cortex command', async () => {
    const command = 'cortex mcp add test-server https://example.com/mcp';
    const result = await universalMcpManager.parseMcpCommand(command);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.name).toBe('test-server');
      expect(result.url).toBe('https://example.com/mcp');
    }
  });

  it('should return null for invalid commands', async () => {
    const command = 'invalid command format';
    const result = await universalMcpManager.parseMcpCommand(command);

    expect(result).toBeNull();
  });

  it('should validate HTTPS URLs', async () => {
    const request = {
      name: 'test-server',
      url: 'https://api.example.com/mcp',
      transport: 'http' as const,
      scopes: ['read' as const],
      autoApprove: false,
    };

    const result = await universalMcpManager.validateMcpServer(request);

    expect(result).toBeDefined();
    expect(result.isValid).toBeDefined();
  });

  it('should generate configuration', async () => {
    const request = {
      name: 'test-server',
      url: 'https://api.example.com/mcp',
      transport: 'http' as const,
      scopes: ['read' as const],
      autoApprove: false,
    };

    const config = await universalMcpManager.generateSecureConfig(request);

    expect(config).toBeDefined();
    expect(config.name).toBe('test-server');
    expect(config.url).toBe('https://api.example.com/mcp');
  });
});
