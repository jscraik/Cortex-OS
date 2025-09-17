import { z } from 'zod';
// Individual check status schema
export const diagnosticCheckStatusSchema = z.object({
	status: z
		.enum(['ok', 'freed', 'error', 'degraded'])
		.describe('Outcome status for this diagnostic component.'),
	details: z
		.string()
		.optional()
		.describe('Human readable context for this check.'),
	latencyMs: z
		.number()
		.int()
		.nonnegative()
		.optional()
		.describe('Latency in milliseconds (when relevant, e.g., health probe).'),
});
// Composite diagnostics result schema
export const diagnosticsResultSchema = z.object({
	timestamp: z.string().datetime({ offset: true }),
	port_guard: diagnosticCheckStatusSchema,
	health: diagnosticCheckStatusSchema.extend({
		latencyMs: z.number().int().nonnegative().optional(),
	}),
	tunnel: diagnosticCheckStatusSchema,
	summary: z.object({
		overall: z
			.enum(['ok', 'degraded', 'failed'])
			.describe('Aggregate outcome across all checks.'),
	}),
});
// Utility narrow validation helper
export function parseDiagnosticsResult(input) {
	return diagnosticsResultSchema.parse(input);
}
//# sourceMappingURL=diagnostics.js.map
