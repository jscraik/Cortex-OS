import type { RequestHandler } from 'express';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('bcrypt', () => ({
	hash: vi.fn(),
	compare: vi.fn(),
}));

const observedPaths: Array<{ url: string; originalUrl: string; baseUrl: string }> = [];

const authMiddleware: RequestHandler = (req, res) => {
	observedPaths.push({ url: req.url, originalUrl: req.originalUrl, baseUrl: req.baseUrl });
	res.status(201).json({ url: req.url, originalUrl: req.originalUrl, baseUrl: req.baseUrl });
};

vi.mock('../../src/auth/config.js', () => ({
	authCors: ((_req, _res, next) => {
		next();
	}) as RequestHandler,
	authMiddleware,
}));

const { authRouter } = await import('../../src/routes/auth.js');

describe('auth router path rewriting', () => {
	it('routes /auth/register to Better Auth email signup', async () => {
		const app = express();
		app.use(authRouter);
		observedPaths.length = 0;

		const response = await request(app).post('/auth/register?next=/dashboard').send({});

		expect(response.status).toBe(201);
		expect(response.body.url).toBe('/sign-up/email?next=/dashboard');
		expect(observedPaths.at(-1)?.url).toBe('/sign-up/email?next=/dashboard');
	});

	it('routes /auth/login to Better Auth email sign-in', async () => {
		const app = express();
		app.use(authRouter);
		observedPaths.length = 0;

		const response = await request(app).post('/auth/login').send({});

		expect(response.status).toBe(201);
		expect(response.body.url).toBe('/sign-in/email');
		expect(observedPaths.at(-1)?.url).toBe('/sign-in/email');
	});
});
