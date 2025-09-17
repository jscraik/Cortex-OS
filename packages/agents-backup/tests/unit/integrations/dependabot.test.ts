import { describe, expect, it } from 'vitest';
import {
	assessDependabotConfig,
	type DependabotConfig,
} from '../../../src/integrations/dependabot.js';

describe('dependabot assessment', () => {
	it('scores configuration with mixed intervals', () => {
		const cfg: DependabotConfig = {
			path: 'x',
			projects: [
				{ packageEcosystem: 'npm', directory: '/', scheduleInterval: 'weekly' },
				{
					packageEcosystem: 'github-actions',
					directory: '/',
					scheduleInterval: 'monthly',
				},
			],
		};
		const res = assessDependabotConfig(cfg);
		expect(res.totalProjects).toBe(2);
		expect(res.score).toBeGreaterThan(0);
	});

	it('handles configuration with no weak projects (all daily)', () => {
		const cfg: DependabotConfig = {
			path: 'y',
			projects: [
				{ packageEcosystem: 'npm', directory: '/', scheduleInterval: 'daily' },
				{
					packageEcosystem: 'github-actions',
					directory: '/',
					scheduleInterval: 'daily',
				},
			],
		};
		const res = assessDependabotConfig(cfg);
		expect(res.totalProjects).toBe(2);
		expect(res.weakProjects.length).toBe(0);
		expect(res.dailyOrWeekly).toBe(2);
		expect(res.score).toBeGreaterThan(50); // should reward strong cadence
	});
});
