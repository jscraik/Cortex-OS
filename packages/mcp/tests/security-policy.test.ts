import { describe, expect, test } from 'vitest';
import { UniversalMcpManager } from '../src/universal-mcp-manager';

/** Security policy tests verify auth requirements and capability allow-lists. */
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
});
