import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validatePolicy } from '../../../tools/structure-guard/policy-schema';

// Contract Stability: Guard against accidental breaking changes to required top-level keys.
// If a required field is intentionally changed/removed, update this list *and* document migration.
const REQUIRED_KEYS: string[] = [
	'version',
	'excludePatterns',
	'allowedPaths',
	'allowedRootEntries',
	'filePatterns',
	'maxFilesPerChange',
	'overrideRules',
	'protectedFiles',
	'allowedGlobs',
	'deniedGlobs',
	'importRules',
	'enforcement',
	'testRequirements',
];

describe('contract: structure-guard policy schema', () => {
	const policyPath = path.resolve(__dirname, '../../../tools/structure-guard/policy.json');
	const policyJson = JSON.parse(fs.readFileSync(policyPath, 'utf8'));

	it('parses current policy.json with validatePolicy (version aware)', () => {
		const result = validatePolicy(policyJson, {
			version: policyJson.version,
			allowDeprecated: true,
			strict: true,
			checkPerformance: true,
		});
		expect(result.valid).toBe(true);
		expect(result.policy).toBeTruthy();
	});

	it('ensures required top-level keys remain stable', () => {
		const keys = Object.keys(policyJson).sort();
		for (const required of REQUIRED_KEYS) {
			expect(keys).toContain(required);
		}
	});

	it('new optional fields do not break validation (extended schema)', () => {
		const augmented = { ...policyJson, newField: 'demo-optional' };
		const result = validatePolicy(augmented, { version: augmented.version });
		expect(result.valid).toBe(true);
	});

	it('rejects invalid semver version format', () => {
		const bad = { ...policyJson, version: '2' };
		expect(() => validatePolicy(bad, { version: bad.version })).toThrow();
	});

	it('provides warnings when strict+allowDeprecated+performance flags enabled', () => {
		const result = validatePolicy(
			{ ...policyJson, deprecatedField: 'x' },
			{
				version: policyJson.version,
				allowDeprecated: true,
				strict: true,
				checkPerformance: true,
			},
		);
		expect(result.valid).toBe(true);
		expect(result.warnings?.length).toBeGreaterThan(0);
	});
});
