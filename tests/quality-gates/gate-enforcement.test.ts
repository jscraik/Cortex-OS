import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runQualityGateEnforcement } from '../../scripts/ci/quality-gate-enforcer';

const createTempDir = (): string => mkdtempSync(join(tmpdir(), 'quality-gate-tests-'));

const writeJson = (filePath: string, payload: unknown): void => {
	writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
};

describe('Quality Gate Enforcement (brAInwav policy)', () => {
	let workingDir: string;
	let configPath: string;

	beforeEach(() => {
		workingDir = createTempDir();
		configPath = join(workingDir, 'quality_gate.json');

		writeJson(configPath, {
			name: 'brAInwav Cortex-OS Quality Gates',
			version: '1.0.0',
			enforcer: 'brAInwav Development Team',
			thresholds: {
				coverage: { line: 95, branch: 95, function: 95, statement: 95 },
				mutation: { score: 80 },
				security: { criticalVulnerabilities: 0, highVulnerabilities: 0 },
			},
			branding: {
				organization: 'brAInwav',
				brandingMessage: '[brAInwav] Cortex-OS Quality Gates',
			},
		});
	});

	afterEach(() => {
		rmSync(workingDir, { recursive: true, force: true });
	});

	it('fails when coverage drops below the brAInwav threshold', () => {
		const result = runQualityGateEnforcement(
			{
				coverage: { line: 94.5, branch: 96, function: 97, statement: 98 },
				mutation: { score: 85 },
				security: { criticalVulnerabilities: 0, highVulnerabilities: 0 },
			},
			configPath,
		);

		expect(result.passed).toBe(false);
		expect(result.violations).toContain('brAInwav: Line coverage 94.5% < 95%');
		expect(result.branding).toBe('[brAInwav] Cortex-OS Quality Gates');
	});

	it('fails when security findings exceed the policy', () => {
		const result = runQualityGateEnforcement(
			{
				coverage: { line: 98, branch: 97, function: 99, statement: 99 },
				mutation: { score: 90 },
				security: { criticalVulnerabilities: 1, highVulnerabilities: 0 },
			},
			configPath,
		);

		expect(result.passed).toBe(false);
		expect(result.violations.some((msg) => msg.includes('critical vulnerabilities found'))).toBe(true);
	});

	it('passes when all metrics satisfy the contract', () => {
		const result = runQualityGateEnforcement(
			{
				coverage: { line: 97, branch: 97, function: 98, statement: 98 },
				mutation: { score: 90 },
				security: { criticalVulnerabilities: 0, highVulnerabilities: 0 },
			},
			configPath,
		);

		expect(result.passed).toBe(true);
		expect(result.violations).toHaveLength(0);
		// Expect score to sit between 0 and 100 for sanity; exact value not needed here.
		expect(result.score).toBeGreaterThan(0);
		expect(result.score).toBeLessThanOrEqual(100);
	});
});
