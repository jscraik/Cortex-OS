import { z } from 'zod';
import { evidenceArraySchema } from './evidence.js';
/**
 * Model Gateway-related A2A event schemas for inter-package communication
 */
// Request Routed Event
export const RequestRoutedEventSchema = z.object({
	requestId: z.string(),
	model: z.string(),
	provider: z.string(),
	routedAt: z.string(),
});
// Model Response Event
export const ModelResponseEventSchema = z.object({
	requestId: z.string(),
	model: z.string(),
	provider: z.string(),
	latency: z.number().positive(),
	tokens: z
		.object({
			input: z.number().nonnegative(),
			output: z.number().nonnegative(),
		})
		.optional(),
	completedAt: z.string(),
	evidence: evidenceArraySchema
		.optional()
		.describe(
			'Supporting evidence citations (max 50) for model output provenance',
		),
});
// Model Error Event
export const ModelErrorEventSchema = z.object({
	requestId: z.string(),
	model: z.string(),
	provider: z.string(),
	error: z.string(),
	errorCode: z.string().optional(),
	failedAt: z.string(),
	evidence: evidenceArraySchema
		.optional()
		.describe('Evidence supporting error diagnostics (e.g., logs, policies)'),
});
// Provider Health Event
export const ProviderHealthEventSchema = z.object({
	provider: z.string(),
	status: z.enum(['healthy', 'degraded', 'unhealthy']),
	latency: z.number().positive().optional(),
	checkedAt: z.string(),
});
// Helper function to create model gateway events
export const createModelGatewayEvent = {
	requestRouted: (data) => ({
		type: 'model_gateway.request.routed',
		data: RequestRoutedEventSchema.parse(data),
	}),
	modelResponse: (data) => ({
		type: 'model_gateway.response.completed',
		data: ModelResponseEventSchema.parse(data),
	}),
	modelError: (data) => ({
		type: 'model_gateway.response.error',
		data: ModelErrorEventSchema.parse(data),
	}),
	providerHealth: (data) => ({
		type: 'model_gateway.provider.health',
		data: ProviderHealthEventSchema.parse(data),
	}),
};
//# sourceMappingURL=model-gateway-events.js.map
