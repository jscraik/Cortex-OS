import type { GraphRAGService } from '@cortex-os/memory-core';
import { GraphRAGQueryRequestSchema } from '@cortex-os/memory-core';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';

export function graphragRoutes(service: GraphRAGService): Router {
	const router = Router();

	router.post('/query', async (req: Request, res: Response, next: NextFunction) => {
		try {
			const payload = GraphRAGQueryRequestSchema.parse(req.body);
			const result = await service.query(payload);
			res.json({ success: true, data: result, timestamp: new Date().toISOString() });
		} catch (error) {
			next(error);
		}
	});

	router.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
		try {
			const health = await service.healthCheck();
			res.status(health.status === 'healthy' ? 200 : 503).json({ success: true, data: health });
		} catch (error) {
			next(error);
		}
	});

	router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
		try {
			const stats = await service.getStats();
			res.json({ success: true, data: stats });
		} catch (error) {
			next(error);
		}
	});

	return router;
}
