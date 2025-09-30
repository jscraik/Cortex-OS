import type { MemoryProvider } from '@cortex-os/memory-core';
import {
	MemoryAnalysisInputSchema,
	MemoryRelationshipsInputSchema,
	MemorySearchInputSchema,
	MemoryStatsInputSchema,
	MemoryStoreInputSchema,
} from '@cortex-os/tool-spec';
import { Router } from 'express';
import { validateRequest } from '../middleware/validateRequest.js';

export function memoryRoutes(provider: MemoryProvider): Router {
	const router = Router();

	// POST /memory/store - Store a memory
	router.post('/store', validateRequest(MemoryStoreInputSchema), async (req, res, next) => {
		try {
			const result = await provider.store(req.body);
			res.status(201).json({
				success: true,
				data: result,
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			next(error);
		}
	});

	// GET /memory/search - Search memories
	router.get(
		'/search',
		validateRequest(MemorySearchInputSchema, 'query'),
		async (req, res, next) => {
			try {
				const results = await provider.search(req.query);
				res.json({
					success: true,
					data: results,
					count: results.length,
					timestamp: new Date().toISOString(),
				});
			} catch (error) {
				next(error);
			}
		},
	);

	// POST /memory/search - Search memories (POST for complex queries)
	router.post('/search', validateRequest(MemorySearchInputSchema), async (req, res, next) => {
		try {
			const results = await provider.search(req.body);
			res.json({
				success: true,
				data: results,
				count: results.length,
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			next(error);
		}
	});

	// POST /memory/analysis - Analyze memories
	router.post('/analysis', validateRequest(MemoryAnalysisInputSchema), async (req, res, next) => {
		try {
			const result = await provider.analysis(req.body);
			res.json({
				success: true,
				data: result,
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			next(error);
		}
	});

	// POST /memory/relationships - Manage relationships
	router.post(
		'/relationships',
		validateRequest(MemoryRelationshipsInputSchema),
		async (req, res, next) => {
			try {
				const result = await provider.relationships(req.body);
				res.json({
					success: true,
					data: result,
					timestamp: new Date().toISOString(),
				});
			} catch (error) {
				next(error);
			}
		},
	);

	// GET /memory/stats - Get statistics
	router.get('/stats', validateRequest(MemoryStatsInputSchema, 'query'), async (req, res, next) => {
		try {
			const stats = await provider.stats(req.query);
			res.json({
				success: true,
				data: stats,
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			next(error);
		}
	});

	// POST /memory/stats - Get statistics (POST for complex queries)
	router.post('/stats', validateRequest(MemoryStatsInputSchema), async (req, res, next) => {
		try {
			const stats = await provider.stats(req.body);
			res.json({
				success: true,
				data: stats,
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			next(error);
		}
	});

	// GET /memory/health - Memory provider health check
	router.get('/health', async (_req, res, next) => {
		try {
			const health = await provider.healthCheck();
			res.json({
				success: true,
				data: health,
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			next(error);
		}
	});

	// POST /memory/optimize - Optimize memory store
	router.post('/optimize', async (_req, res, next) => {
		try {
			await provider.optimize?.();
			res.json({
				success: true,
				message: 'Memory store optimized successfully',
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			next(error);
		}
	});

	// POST /memory/cleanup - Cleanup old data
	router.post('/cleanup', async (_req, res, next) => {
		try {
			await provider.cleanup?.();
			res.json({
				success: true,
				message: 'Memory cleanup completed successfully',
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			next(error);
		}
	});

	return router;
}
