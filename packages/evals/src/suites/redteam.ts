import { z } from 'zod';
import { RedteamThresholdSchema, type SuiteOutcome } from '../types.js';

export interface RedteamDeps {
	run(files: string[]): Promise<{
		total: number;
		failures: number;
		critical: number;
	}>;
}

export const RedteamOptions = z.object({
	attackFiles: z.array(z.string()).min(1),
	thresholds: RedteamThresholdSchema.default({}),
});
export type RedteamOptions = z.infer<typeof RedteamOptions>;

export async function runRedteamSuite(
	name: string,
	opts: RedteamOptions,
	deps: RedteamDeps,
): Promise<SuiteOutcome> {
	const summary = await deps.run(opts.attackFiles);
	const parsed = RedteamThresholdSchema.parse(opts.thresholds ?? {});
	const limits = {
		maxFailures: parsed.maxFailures ?? 0,
		maxCritical: parsed.maxCritical ?? 0,
	};
	const pass = summary.failures <= limits.maxFailures && summary.critical <= limits.maxCritical;
	return {
		name,
		pass,
		metrics: {
			total: summary.total,
			failures: summary.failures,
			critical: summary.critical,
		},
		notes: [`limits failures<=${limits.maxFailures} critical<=${limits.maxCritical}`],
	};
}

export const redteamSuite = {
	name: 'redteam',
	optionsSchema: RedteamOptions,
	run: (suiteName: string, options: RedteamOptions, deps: RedteamDeps) =>
		runRedteamSuite(suiteName, options, deps),
};
