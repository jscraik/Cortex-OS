import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadMcpConfigs } from '../src/config-loader.js';

describe('MCP Connector Isolation', () => {
  let originalNetworkPolicy: string | undefined;

  beforeEach(() => {
    // Store original network policy
    originalNetworkPolicy = process.env.MCP_NETWORK_EGRESS;
    // Disable network egress for tests
    process.env.MCP_NETWORK_EGRESS = 'disabled';
  });

  afterEach(() => {
    // Restore original network policy
    if (originalNetworkPolicy !== undefined) {
      process.env.MCP_NETWORK_EGRESS = originalNetworkPolicy;
    } else {
      delete process.env.MCP_NETWORK_EGRESS;
    }
  });

  it('should enforce default-deny policy in production config', async () => {
    const productionConfigPath = path.resolve(import.meta.dirname, '../config/production.json');
    const configContent = await fs.readFile(productionConfigPath, 'utf8');
    const config = JSON.parse(configContent);

    expect(config.security.policy).toBe('default-deny');
    expect(config.security.network.egress).toBe('disabled');
    expect(config.security.allowlist.connectors).toEqual(['local-fs', 'github-api']);
  });

  it('should block context7 connector in production', async () => {
    const productionConfigPath = path.resolve(import.meta.dirname, '../config/production.json');
    const configContent = await fs.readFile(productionConfigPath, 'utf8');
    const config = JSON.parse(configContent);

    expect(config.security.blocklist.connectors).toContain('context7');
    expect(config.security.blocklist.development_only).toContain('context7');
  });

  it('should allow context7 connector in development only', async () => {
    const developmentConfigPath = path.resolve(import.meta.dirname, '../config/development.json');
    const configContent = await fs.readFile(developmentConfigPath, 'utf8');
    const config = JSON.parse(configContent);

    expect(config.security.allowlist.connectors).toContain('context7');
    expect(config.tools.some((tool) => tool.id === 'context7-dev')).toBe(true);
  });

  it('should enforce network isolation during tests', () => {
    expect(process.env.MCP_NETWORK_EGRESS).toBe('disabled');
  });

  it('should validate audit configuration', async () => {
    const productionConfigPath = path.resolve(import.meta.dirname, '../config/production.json');
    const configContent = await fs.readFile(productionConfigPath, 'utf8');
    const config = JSON.parse(configContent);

    expect(config.audit.enabled).toBe(true);
    expect(config.audit.format).toBe('jsonl');
    expect(config.audit.logLevel).toBe('info');
    expect(config.audit.destination).toBe('/var/log/cortex/mcp-audit.jsonl');
    expect(config.audit.retentionDays).toBe(30);
  });

  it('should limit request sizes in production', async () => {
    const productionConfigPath = path.resolve(import.meta.dirname, '../config/production.json');
    const configContent = await fs.readFile(productionConfigPath, 'utf8');
    const config = JSON.parse(configContent);

    expect(config.security.network.maxRequestSize).toBe('1MB');
    expect(config.security.network.timeout).toBe(30000);
  });

  it('should merge configs correctly with override prevention', async () => {
    const configFiles = [path.resolve(import.meta.dirname, '../config/production.json')];

    const result = await loadMcpConfigs(configFiles);

    expect(result.tools).toBeDefined();
    expect(result.tools.length).toBeGreaterThan(0);
    expect(result.registry).toBeDefined();

    // Verify allowlisted tools only
    const toolIds = result.tools.map((tool) => tool.id);
    expect(toolIds).toContain('local-fs-read');
    expect(toolIds).toContain('github-api-readonly');
    expect(toolIds).not.toContain('context7-dev');
  });

  it('should enforce sandboxing for local-fs operations', async () => {
    const productionConfigPath = path.resolve(import.meta.dirname, '../config/production.json');
    const configContent = await fs.readFile(productionConfigPath, 'utf8');
    const config = JSON.parse(configContent);

    const localFsTool = config.tools.find((tool) => tool.id === 'local-fs-read');
    expect(localFsTool).toBeDefined();
    expect(localFsTool.meta.sandboxed).toBe(true);
    expect(localFsTool.meta.maxFileSize).toBe('10MB');
    expect(localFsTool.scopes).toEqual(['read']);
  });

  it('should enforce rate limiting for github-api', async () => {
    const productionConfigPath = path.resolve(import.meta.dirname, '../config/production.json');
    const configContent = await fs.readFile(productionConfigPath, 'utf8');
    const config = JSON.parse(configContent);

    const githubTool = config.tools.find((tool) => tool.id === 'github-api-readonly');
    expect(githubTool).toBeDefined();
    expect(githubTool.meta.rateLimited).toBe(true);
    expect(githubTool.meta.maxRequestsPerMinute).toBe(60);
    expect(githubTool.scopes).toEqual(['read', 'metadata']);
  });
});
