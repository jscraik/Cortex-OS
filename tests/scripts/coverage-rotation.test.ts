import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
	assertThresholds,
	enforceRegression,
	loadRotationConfig,
	readCoverageTotals,
	resolveWeekIndex,
	selectRotationWeek,
} from '../../scripts/code-quality/coverage-rotation.mjs';

const fixturePath = fileURLToPath(new URL('./fixtures/rotation.yml', import.meta.url));

describe('coverage rotation helpers', () => {
	it('loads config and applies manual week override', () => {
		const config = loadRotationConfig(fixturePath);
		expect(resolveWeekIndex(config, { ROTATION_WEEK: '2' }, new Date('2025-01-06T00:00:00Z'))).toBe(
			1,
		);
	});

	it('computes week index based on elapsed time', () => {
		const config = loadRotationConfig(fixturePath);
		expect(resolveWeekIndex(config, {}, new Date('2025-01-20T00:00:00Z'))).toBe(0);
	});

	it('selects rotation week with env overrides for target and goals', () => {
		const config = loadRotationConfig(fixturePath);
		const week = selectRotationWeek(
			config,
			{ WEEKLY_TARGET: 'packages/manual', WEEKLY_GOAL_LINES: '91' },
			new Date('2025-01-06T00:00:00Z'),
		);
		expect(week.target).toBe('packages/manual');
		expect(week.goal.lines).toBe(91);
		expect(week.goal.branches).toBe(80);
	});

	it('reads coverage totals from vitest summary', () => {
		const dir = mkdtempSync(join(tmpdir(), 'rotation-'));
		const summaryPath = join(dir, 'coverage-summary.json');
		writeFileSync(
			summaryPath,
			JSON.stringify({
				total: {
					lines: { pct: 91.2 },
					branches: { pct: 83.4 },
					functions: { pct: 88.9 },
					statements: { pct: 90.1 },
				},
			}),
		);
		expect(readCoverageTotals(summaryPath)).toStrictEqual({
			lines: 91.2,
			branches: 83.4,
			functions: 88.9,
			statements: 90.1,
		});
		rmSync(dir, { recursive: true, force: true });
		expect(readCoverageTotals(summaryPath)).toBeUndefined();
	});

	it('fails thresholds when coverage dips below minimum', () => {
		expect(() => assertThresholds({ lines: 80 }, { lines: 90 }, 'weekly goal')).toThrow(
			/lines: 80\.00 < 90/,
		);
	});

	it('detects coverage regression beyond allowed drop', () => {
		expect(() => enforceRegression({ lines: 92 }, { lines: 90.5 }, 0)).toThrow(
			/coverage regression detected/,
		);
	});
});
