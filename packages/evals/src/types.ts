import { z } from "zod";

// Shared eval config schema (validated at runtime)
export const GateConfigSchema = z.object({
	dataset: z.string().optional(),
	suites: z.array(
		z.object({
			name: z.string(),
			enabled: z.boolean().default(true),
			thresholds: z.record(z.string(), z.number()).default({}),
			// Suite-specific options, free-form but validated in each suite
			options: z.record(z.string(), z.unknown()).optional(),
		}),
	),
});

export type GateConfig = z.infer<typeof GateConfigSchema>;

export interface SuiteOutcome {
	name: string;
	pass: boolean;
	metrics: Record<string, number>;
	notes?: string[];
}

export interface GateResult {
	pass: boolean;
	outcomes: SuiteOutcome[];
	startedAt: string; // ISO-8601
	finishedAt: string; // ISO-8601
}
