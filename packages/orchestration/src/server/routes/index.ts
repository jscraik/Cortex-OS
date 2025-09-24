import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { executeAgentSchema } from '../index.js';

export const routes = new Hono();

// POST /agents/execute
routes.post('/agents/execute', async (c) => {
	try {
		const body = await c.req.json();

		// Validate request body
		const validatedData = executeAgentSchema.parse(body);

		// TODO: Implement actual agent execution with LangGraph
		// For now, return a mock response
		const result = {
			agentId: validatedData.agentId,
			response: `Processed: ${validatedData.input}`,
			timestamp: new Date().toISOString(),
			status: 'completed',
		};

		return c.json(result);
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new HTTPException(400, {
				message: 'Invalid request body',
			});
		}
		throw error;
	}
});

// 404 handler
routes.all('*', (c) => {
	return c.json(
		{
			error: {
				code: 404,
				message: 'Not Found',
			},
		},
		404,
	);
});
