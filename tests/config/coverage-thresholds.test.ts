import { afterEach, describe, expect, it } from 'vitest';
import { resolveCoverageThresholds } from '../../vitest.config';

describe('resolveCoverageThresholds', () => {
        const originalEnv = { ...process.env };

        afterEach(() => {
                process.env = { ...originalEnv };
        });

        it('returns default thresholds when overrides are absent', () => {
                const thresholds = resolveCoverageThresholds({} as NodeJS.ProcessEnv);

                expect(thresholds).toEqual({
                        statements: 90,
                        branches: 90,
                        functions: 90,
                        lines: 95,
                });
        });

        it('applies metric-specific overrides without mutating the provided env', () => {
                const env = {
                        COVERAGE_THRESHOLD_STATEMENTS: '92',
                        COVERAGE_THRESHOLD_BRANCHES: '91',
                        COVERAGE_THRESHOLD_FUNCTIONS: '93',
                        COVERAGE_THRESHOLD_LINES: '96',
                } satisfies Partial<NodeJS.ProcessEnv>;

                const thresholds = resolveCoverageThresholds(env as NodeJS.ProcessEnv);

                expect(thresholds).toEqual({
                        statements: 92,
                        branches: 91,
                        functions: 93,
                        lines: 96,
                });
                expect(env.COVERAGE_THRESHOLD_STATEMENTS).toBe('92');
                expect(env.COVERAGE_THRESHOLD_LINES).toBe('96');
        });

        it('falls back to the global threshold when metric-specific values are missing', () => {
                process.env.COVERAGE_THRESHOLD_GLOBAL = '93';
                delete process.env.COVERAGE_THRESHOLD_STATEMENTS;
                delete process.env.COVERAGE_THRESHOLD_BRANCHES;
                delete process.env.COVERAGE_THRESHOLD_FUNCTIONS;
                delete process.env.COVERAGE_THRESHOLD_LINES;

                const thresholds = resolveCoverageThresholds();

                expect(thresholds).toEqual({
                        statements: 93,
                        branches: 93,
                        functions: 93,
                        lines: 93,
                });
        });
});
