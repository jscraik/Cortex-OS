import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { app } from '../../src/server.js';

const taskSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	status: z.string().min(1),
	createdAt: z.string().or(z.date()),
});

const agentSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	status: z.enum(['idle', 'running', 'error']),
	lastRunAt: z.string().or(z.date()).nullable(),
});

const metricsSchema = z.object({
	uptimeSeconds: z.number().positive(),
	activeAgents: z.number().int().nonnegative(),
	tasksProcessed: z.number().int().nonnegative(),
	queueDepth: z.number().int().nonnegative(),
});

describe('API v1 routes', () => {
	it('GET /api/v1/tasks should return real tasks payload', async () => {
		const response = await request(app).get('/api/v1/tasks').expect(200);
		const payload = z.object({ tasks: z.array(taskSchema) }).safeParse(response.body);
		expect(payload.success).toBe(true);
	});

	it('GET /api/v1/agents should return real agents payload', async () => {
		const response = await request(app).get('/api/v1/agents').expect(200);
		const payload = z.object({ agents: z.array(agentSchema) }).safeParse(response.body);
		expect(payload.success).toBe(true);
	});

	it('GET /api/v1/metrics should return real metrics payload', async () => {
		const response = await request(app).get('/api/v1/metrics').expect(200);
		const payload = metricsSchema.safeParse(response.body);
		expect(payload.success).toBe(true);
	});
});
