import { describe, expect, it } from 'vitest';

import { CORTEX_SEC_TOOL_ALLOWLIST, cortexSecMcpTools } from '../../src/index.js';

describe('cortex-sec MCP tools', () => {
	const getTool = (name: string) => cortexSecMcpTools.find((tool) => tool.name === name);

	it('runs deterministic Semgrep scans with brAInwav branding', async () => {
		const tool = getTool('run_semgrep_scan');
		expect(tool).toBeDefined();

		const input = {
			targetPath: 'apps/demo',
			rulesets: ['brAInwav/owasp'],
			severity: 'warning' as const,
		};

		const first = await tool?.handler(input);
		const second = await tool?.handler(input);

		const payloadA = JSON.parse(first.content[0]?.text ?? '{}');
		const payloadB = JSON.parse(second.content[0]?.text ?? '{}');

		expect(payloadA.brand).toBe('brAInwav Cortex Security');
		expect(payloadA.correlationId).toBe(first.metadata.correlationId);
		expect(payloadA.payload.scanId).toMatch(/^scan-/);
		expect(payloadA.payload.findings).toHaveLength(1);
		expect(payloadA.payload.summary.guidance).toContain('brAInwav');

		expect(first.metadata.correlationId).toBe(second.metadata.correlationId);
		expect(payloadA.payload.summary).toStrictEqual(payloadB.payload.summary);
	});

	it('flags dependency vulnerabilities consistently', async () => {
		const tool = getTool('check_dependencies');
		expect(tool).toBeDefined();

		const response = await tool?.handler({
			packageFile: 'package.json',
			includeDevDependencies: true,
			checkLicenses: true,
		});

		const payload = JSON.parse(response.content[0]?.text ?? '{}');
		expect(payload.brand).toBe('brAInwav Cortex Security');
		expect(payload.payload.summary.total).toBeGreaterThan(0);
		expect(payload.payload.summary.brand).toBe('brAInwav Cortex Security');
		expect(Array.isArray(payload.payload.dependencies)).toBe(true);
		const [firstDependency] = payload.payload.dependencies;
		expect(firstDependency).toHaveProperty('recommendation');
	});

	it('publishes a unified allow-list for orchestrator integration', () => {
		expect(CORTEX_SEC_TOOL_ALLOWLIST).toContain('run_semgrep_scan');
		expect(CORTEX_SEC_TOOL_ALLOWLIST).toContain('validate_compliance');
	});
});
