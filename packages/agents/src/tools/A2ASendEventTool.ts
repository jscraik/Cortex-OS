import { createTool } from '@voltagent/core';
import { createPinoLogger } from '@voltagent/logger';
import { z } from 'zod';

const logger = createPinoLogger({ name: 'A2ASendEventTool' });

export const createA2ASendEventTool = (a2aBridge: any) =>
	createTool({
		id: 'a2a-send-event',
		name: 'a2a_send_event',
		description:
			'Send a CloudEvent to the A2A event bus for agent-to-agent communication',

		parameters: z.object({
			/**
			 * Event type
			 */
			type: z.string().min(1),
			/**
			 * Event source
			 */
			source: z.string().url().optional(),
			/**
			 * Event data
			 */
			data: z.any(),
			/**
			 * Data content type
			 */
			dataContentType: z.string().optional(),
			/**
			 * Data schema URL
			 */
			dataSchema: z.string().url().optional(),
			/**
			 * Event subject
			 */
			subject: z.string().optional(),
			/**
			 * Event ID (optional, will be generated if not provided)
			 */
			id: z.string().optional(),
			/**
			 * Event timestamp (optional, will use current time if not provided)
			 */
			time: z.string().datetime().optional(),
			/**
			 * Target agent (optional, for direct agent-to-agent communication)
			 */
			toAgent: z.string().optional(),
			/**
			 * Correlation ID (optional, for request/response patterns)
			 */
			correlationId: z.string().optional(),
		}),

		async execute(params, _context) {
			logger.info(`Sending A2A event: ${params.type}`);

			try {
				// Send to specific agent if specified
				if (params.toAgent) {
					const eventId = await a2aBridge.sendToAgent(params.toAgent, {
						type: params.type,
						data: params.data,
						correlationId: params.correlationId,
					});

					return {
						success: true,
						eventId,
						deliveredTo: params.toAgent,
						timestamp: new Date().toISOString(),
					};
				}

				// Send to event bus
				const eventId = await a2aBridge.sendEvent({
					type: params.type,
					source: params.source,
					data: params.data,
					datacontenttype: params.dataContentType,
					dataschema: params.dataSchema,
					subject: params.subject,
					id: params.id,
					time: params.time,
				});

				logger.info(`Event sent successfully: ${eventId}`);

				return {
					success: true,
					eventId,
					timestamp: new Date().toISOString(),
					delivery: 'broadcast',
				};
			} catch (error) {
				logger.error('Failed to send A2A event:', error as Error);
				return {
					success: false,
					error: error instanceof Error ? error.message : String(error),
					timestamp: new Date().toISOString(),
				};
			}
		},
	});
