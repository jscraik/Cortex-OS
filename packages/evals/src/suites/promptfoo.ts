import { z } from 'zod';
import { PromptThresholdSchema, type SuiteOutcome } from '../types.js';

export interface PromptDeps {
        run(configs: string[]): Promise<{
                accuracy: number;
                groundedness: number;
                refusal: number;
        }>;
}

export const PromptOptions = z.object({
        configs: z.array(z.string()).min(1),
        thresholds: PromptThresholdSchema.default({}),
});
export type PromptOptions = z.infer<typeof PromptOptions>;

export async function runPromptSuite(
        name: string,
        opts: PromptOptions,
        deps: PromptDeps,
): Promise<SuiteOutcome> {
        const summary = await deps.run(opts.configs);
        const parsed = PromptThresholdSchema.parse(opts.thresholds ?? {});
        const thresholds = {
                accuracy: parsed.accuracy ?? 0.8,
                groundedness: parsed.groundedness ?? 0.95,
                refusal: parsed.refusal ?? 0.98,
        };
        const pass =
                summary.accuracy >= thresholds.accuracy &&
                summary.groundedness >= thresholds.groundedness &&
                summary.refusal >= thresholds.refusal;
        return {
                name,
                pass,
                metrics: {
                        accuracy: summary.accuracy,
                        groundedness: summary.groundedness,
                        refusal: summary.refusal,
                },
                notes: [
                        `thresholds accuracy>=${thresholds.accuracy.toFixed(2)}`,
                        `groundedness>=${thresholds.groundedness.toFixed(2)} refusal>=${thresholds.refusal.toFixed(2)}`,
                ],
        };
}

export const promptSuite = {
        name: 'prompt',
        optionsSchema: PromptOptions,
        run: (suiteName: string, options: PromptOptions, deps: PromptDeps) =>
                runPromptSuite(suiteName, options, deps),
};
