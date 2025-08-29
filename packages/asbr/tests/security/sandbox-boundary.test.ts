import { beforeAll, describe, expect, it } from 'vitest';
import { writeFile } from 'fs/promises';
import { dump as yamlDump } from 'js-yaml';
import { MCPSandbox } from '../../src/mcp/sandbox.js';
import { getConfigPath, initializeXDG } from '../../src/xdg/index.js';

describe('MCPSandbox Sandbox Boundaries', () => {
  beforeAll(async () => {
    await initializeXDG();
    const allowlistPath = getConfigPath('mcp-allowlist.yaml');
    const allowlist = [{ name: '/usr/bin/id', version: '*', scopes: [] }];
    await writeFile(allowlistPath, yamlDump(allowlist), 'utf-8');
  });

  it('executes tools under non-root user with resource tracking', async () => {
    const sandbox = new MCPSandbox();
    await sandbox.initialize();

    const result = await sandbox.executeTool({
      toolName: '/usr/bin/id',
      version: '1.0.0',
      args: ['-u'],
      workingDir: '/tmp',
      environment: {},
      timeout: 2000,
    });

    expect(result.success).toBe(true);
    expect(result.output).toBe('65534');
    expect(result.resourceUsage.memory).toBeGreaterThanOrEqual(0);
    expect(result.resourceUsage.cpu).toBeGreaterThanOrEqual(0);
  });

  it('rejects tools not in allowlist', async () => {
    const sandbox = new MCPSandbox();
    await sandbox.initialize();

    const result = await sandbox.executeTool({
      toolName: 'forbidden',
      version: '1.0.0',
      args: [],
      workingDir: '/tmp',
      environment: {},
      timeout: 1000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not in allowlist/);
  });
});
