import { createPinoLogger } from '@voltagent/logger';
import { z } from 'zod';
import { createTool } from './mocks/voltagent-core.js';

const logger = createPinoLogger({ name: 'A2AReceiveEventTool' });

export const createA2AReceiveEventTool = (a2aBridge: any) =>
	createTool({
		id: 'a2a-receive-event',
		name: 'a2a_receive_event',
		description: 'Receive and process A2A events from other agents',

		parameters: z.object({
			/**
			 * Event type to receive
			 */
			eventType: z.string().min(1),
			/**
			 * Limit number of events
			 */
			limit: z.number().int().min(1).max(100).optional().default(10),
			/**
			 * Receive events since timestamp
			 */
			since: z.string().datetime().optional(),
			/**
			 * Filter events by custom criteria
			 */
			filter: z
				.object({
					source: z.string().optional(),
					subject: z.string().optional(),
				})
				.optional(),
		}),

		async execute(params) {
			logger.info(`Receiving A2A events of type: ${params.eventType}`);

			try {
				const events = await a2aBridge.receiveEvent(params.eventType, {
					limit: params.limit,
					since: params.since,
					filter: params.filter
						? (event: any) => {
								if (
									params.filter?.source &&
									event.source !== params.filter.source
								) {
									return false;
								}
								if (
									params.filter?.subject &&
									event.subject !== params.filter.subject
								) {
									return false;
								}
								return true;
							}
						: undefined,
				});

				logger.info(`Received ${events.length} A2A events`);

				return {
					success: true,
					events,
					count: events.length,
					eventType: params.eventType,
					timestamp: new Date().toISOString(),
				};
			} catch (error) {
				logger.error('Failed to receive A2A events:', error as Error);
				return {
					success: false,
					error: error instanceof Error ? error.message : String(error),
					timestamp: new Date().toISOString(),
				};
			}
		},
	});
