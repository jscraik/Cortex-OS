/**
 * @file_path packages/mcp-server/tests/ConfigValidator.test.ts
 * @description Tests for ConfigValidator MCP tool dependency checks
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigValidator } from '../src/tools/ConfigValidator.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

describe('ConfigValidator dependency validation', () => {
  let validator: ConfigValidator;

  beforeEach(() => {
    validator = new ConfigValidator();
  });

  it('warns when cortex standardsPath does not exist', async () => {
    const args = {
      configType: 'cortex',
      config: {
        mode: 'simple',
        version: '1.0.0',
        agentOS: { compatibility: true, standardsPath: '/nonexistent/path' },
        accessibility: { wcagLevel: 'AA', enforceCompliance: true },
        security: { enforceChecks: true, owaspCompliance: true },
        development: { autoTests: true, verboseLogging: false },
        lastUpdated: '2025-01-01T00:00:00.000Z',
      },
    };

    const result = await validator.run(args);
    const warning = result.warnings.find((w) => w.path === 'agentOS.standardsPath');
    expect(warning?.message).toContain('not found');
  });

  it('warns for non-https MCP server URLs', async () => {
    const args = {
      configType: 'mcp',
      config: {
        servers: [{ name: 'local', url: 'http://example.com' }],
        client: {},
        validation: {},
      },
    };

    const result = await validator.run(args);
    const warning = result.warnings.find((w) => w.path === 'servers[0].url');
    expect(warning?.message).toContain('https');
  });

  it('warns when telemetry enabled without endpoint', async () => {
    const args = {
      configType: 'cli',
      config: {
        commands: [],
        telemetry: { enabled: true },
        performance: { enableProfiling: false, maxMemoryUsage: 512, commandTimeout: 300000 },
      },
    };

    const result = await validator.run(args);
    const warning = result.warnings.find((w) => w.path === 'telemetry.endpoint');
    expect(warning?.message).toContain('missing');
  });

  it('passes when dependencies are satisfied', async () => {
    const tempDir = await fs.mkdtemp(path.join(tmpdir(), 'std-'));
    const standardsPath = path.join(tempDir, 'standards.json');
    await fs.writeFile(standardsPath, '{}');

    const args = {
      configType: 'cortex',
      config: {
        mode: 'simple',
        version: '1.0.0',
        agentOS: { compatibility: true, standardsPath },
        accessibility: { wcagLevel: 'AA', enforceCompliance: true },
        security: { enforceChecks: true, owaspCompliance: true },
        development: { autoTests: true, verboseLogging: false },
        lastUpdated: '2025-01-01T00:00:00.000Z',
      },
    };

    const result = await validator.run(args);
    const warning = result.warnings.find((w) => w.path === 'agentOS.standardsPath');
    expect(warning).toBeUndefined();

    await fs.rm(tempDir, { recursive: true, force: true });
  });
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
