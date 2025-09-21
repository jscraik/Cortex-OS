/**
 * Health check router.
 */
import { Router } from 'express';
import type { ASBRAIMcpServer } from '../../asbr-ai-mcp-server.js';
import { createRateLimiter } from '../../security/rate-limiter.js';
import { checkMlxAvailability } from '../infra/mlx.js';
import { getRedisFromEnv } from '../infra/redis.js';

export function createHealthRouter(mcpServer: ASBRAIMcpServer): Router {
	const router = Router();

	const healthLimiter = createRateLimiter({ windowMs: 60_000, max: 10, scope: 'health' });
	router.get('/', healthLimiter, async (_req, res) => {
		try {
			const health = await mcpServer.getHealth();
			res.json(health);
		} catch (error) {
			res.status(500).json({ error: `Health check failed: ${error}` });
		}
	});

	// Optional Redis health probe
	const redisLimiter = createRateLimiter({ windowMs: 60_000, max: 30, scope: 'health-redis' });
	router.get('/redis', redisLimiter, async (_req, res) => {
		const client = getRedisFromEnv();
		if (!client) {
			res.status(200).json({ redis: 'disabled' });
			return;
		}
		try {
			const pong = await client.ping();
			res.json({ redis: pong === 'PONG' ? 'ok' : 'degraded' });
		} catch (error) {
			res.status(503).json({ redis: 'unavailable', error: String(error) });
		}
	});

	// Optional MLX health probe
	const mlxLimiter = createRateLimiter({ windowMs: 60_000, max: 15, scope: 'health-mlx' });
	router.get('/mlx', mlxLimiter, async (_req, res) => {
		try {
			const status = await checkMlxAvailability();
			res.status(status.available ? 200 : 503).json({ mlx: status });
		} catch (error) {
			res.status(503).json({ mlx: { available: false, error: String(error) } });
		}
	});

	return router;
}
