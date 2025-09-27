import { describe, expect, it } from 'vitest';
import { resolveCoverageThresholds } from '../../vitest.config';

describe('resolveCoverageThresholds', () => {
	it('returns brAInwav defaults when no overrides provided', () => {
		const thresholds = resolveCoverageThresholds({} as NodeJS.ProcessEnv);

		expect(thresholds).toEqual({
			statements: 90,
			branches: 90,
			functions: 90,
			lines: 95,
		});
	});

	it('honours granular overrides without mutating source env', () => {
		const env: NodeJS.ProcessEnv = {
			COVERAGE_THRESHOLD_STATEMENTS: '92',
			COVERAGE_THRESHOLD_BRANCHES: '91',
			COVERAGE_THRESHOLD_FUNCTIONS: '93',
			COVERAGE_THRESHOLD_LINES: '96',
		};

		const result = resolveCoverageThresholds(env);

		expect(result).toEqual({
			statements: 92,
			branches: 91,
			functions: 93,
			lines: 96,
		});
		expect(env).toMatchObject({
			COVERAGE_THRESHOLD_STATEMENTS: '92',
			COVERAGE_THRESHOLD_BRANCHES: '91',
			COVERAGE_THRESHOLD_FUNCTIONS: '93',
			COVERAGE_THRESHOLD_LINES: '96',
		});
	});

	it('falls back to global override when specific values absent', () => {
		const env: NodeJS.ProcessEnv = {
			COVERAGE_THRESHOLD_GLOBAL: '91',
		};

		expect(resolveCoverageThresholds(env)).toEqual({
			statements: 91,
			branches: 91,
			functions: 91,
			lines: 91,
		});
	});
});
