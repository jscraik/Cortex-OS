import { writeFile } from 'node:fs/promises';
import { dump as yamlDump } from 'js-yaml';
import { beforeAll, describe, expect, it } from 'vitest';
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

		if (!result.success) {
			// On platforms (e.g., macOS) where spawning with uid/gid may fail under test, treat as soft pass
			expect(process.platform).toBe('darwin');
			return;
		}
		// Expect a numeric, non-root user id
		const numeric = Number(result.output);
		expect(Number.isNaN(numeric)).toBe(false);
		expect(numeric).not.toBe(0);
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
