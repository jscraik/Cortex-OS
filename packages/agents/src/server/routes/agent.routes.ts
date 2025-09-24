import { Hono } from 'hono';
import { ZodError } from 'zod';
import { AgentHandler } from '../handlers/agent.handler.js';
import { executeAgentSchema } from '../types.js';

export const agentRoutes = new Hono();

// POST /agents/execute
agentRoutes.post('/execute', async (c) => {
	// Create handler instance per request to allow for better testing
	const agentHandler = new AgentHandler();

	try {
		// Handle content-type validation
		const contentType = c.req.header('Content-Type');
		if (!contentType || !contentType.includes('application/json')) {
			return c.json({ message: 'Content-Type must be application/json' }, 400);
		}

		// Get raw body first to check size
		const bodyText = await c.req.text();
		if (bodyText.length > 1024 * 1024) {
			// 1MB
			return c.json({ message: 'Request entity too large' }, 413);
		}

		// Parse JSON manually to catch syntax errors
		let body: any;
		try {
			body = JSON.parse(bodyText);
		} catch {
			return c.json({ message: 'Invalid JSON in request body' }, 400);
		}

		try {
			const validatedData = executeAgentSchema.parse(body);
			const result = await agentHandler.execute(c, validatedData);

			// Ensure result is valid before returning
			if (!result) {
				return c.json({ error: 'Handler returned null/undefined result' }, 500);
			}

			return c.json(result);
		} catch (zodError) {
			if (zodError instanceof ZodError) {
				return c.json({ message: 'Invalid request body' }, 400);
			}
			return c.json({ error: `Validation error: ${zodError}` }, 500);
		}
	} catch (error) {
		if (error instanceof Error) {
			return c.json({ error: error.message }, 500);
		}
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Handle method not allowed for /execute
agentRoutes.all('/execute', async (c) => {
	if (c.req.method !== 'POST') {
		return c.json({ message: 'Method Not Allowed' }, 405);
	}
	return c.json({ error: 'This should not be reached' }, 500);
});
