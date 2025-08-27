import { describe, expect, test } from 'vitest';
import { UniversalMcpManager } from '../src/universal-mcp-manager';

/**
 * Security policy tests verify auth requirements and capability allow-lists.
 * Tests tool safety mechanisms as requested in audit.
 */
describe('MCP security policy', () => {
  const manager = new UniversalMcpManager();

  test('missing API key yields warning for http transport', async () => {
    const validation = await manager.validateMcpServer({
      name: 'test',
      transport: 'http',
      url: 'https://api.example.com/mcp',
      scopes: ['read'],
      autoApprove: false,
    });
    expect(validation.warnings).toContain(
      'No API key provided - connection may fail or be insecure',
    );
  });

  test('generateSecureConfig filters capabilities', () => {
    const config = manager.generateSecureConfig(
      {
        name: 'test',
        transport: 'http',
        url: 'https://api.example.com/mcp',
        capabilities: ['read', 'write'],
        scopes: ['read'],
        autoApprove: false,
      },
      true,
    );
    expect(config.allowedCapabilities).toEqual(['read']);
    expect(config.approved).toBe(true);
  });

  // Additional tool safety tests
  test('dangerous capabilities require approval', async () => {
    const validation = await manager.validateMcpServer({
      name: 'dangerous',
      transport: 'http',
      url: 'https://api.example.com/mcp',
      scopes: ['write', 'execute'],
      autoApprove: false,
    });
    expect(validation.warnings).toContain(
      'Server requests dangerous capabilities (write/execute access)',
    );
    expect(validation.requiresApproval).toBe(true);
    expect(validation.securityLevel).toBe('high');
  });

  test('stdio transport validates dangerous commands', async () => {
    const validation = await manager.validateMcpServer({
      name: 'dangerous-stdio',
      transport: 'stdio',
      command: 'rm -rf /',
      autoApprove: false,
    });
    expect(validation.errors).toContain(
      'Command contains potentially dangerous operations',
    );
  });

  test('URL validation blocks suspicious paths', async () => {
    const validation = await manager.validateMcpServer({
      name: 'suspicious',
      transport: 'http',
      url: 'https://api.example.com/admin/config',
      autoApprove: false,
    });
    expect(validation.warnings).toContain(
      'URL contains potentially sensitive path',
    );
  });
});