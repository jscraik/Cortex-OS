// Metrics API Routes for brAInwav Cortex WebUI
// Secure metrics endpoints with API key authentication

import { type Router, type Request, type Response } from 'express';
import { register } from 'prom-client';
import { MetricsService } from './services/metricsService.js';
import logger from '../../utils/logger.js';

interface AuthenticatedRequest extends Request {
	apiKey?: string;
}

// API Key validation middleware
function validateApiKey(req: AuthenticatedRequest, res: Response, next: any): void {
	const apiKey = getApiKeyFromRequest(req);
	const validApiKey = getValidApiKey();

	if (!apiKey || apiKey !== validApiKey) {
		res.set({
			'WWW-Authenticate': 'Bearer realm="Metrics API"',
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'DENY',
		});

		res.status(401).json({
			error: 'Invalid or missing API key',
			timestamp: new Date().toISOString(),
			brand: 'brAInwav',
		});
		return;
	}

	req.apiKey = apiKey;
	next();
}

function getApiKeyFromRequest(req: Request): string | null {
	// Try multiple methods of API key extraction
	const headerKey = req.headers['x-api-key'] as string;
	const bearerKey = req.headers.authorization?.replace('Bearer ', '');
	const queryKey = req.query.api_key as string;

	return headerKey || bearerKey || queryKey || null;
}

function getValidApiKey(): string {
	// In production, this should come from environment variables or a secure config
	return process.env.METRICS_API_KEY || 'dev-api-key-change-in-production';
}

export function createMetricsRoutes(): Router {
	const router = Router();

	// Apply API key validation to all routes
	router.use(validateApiKey);

	// Prometheus-formatted metrics endpoint
	router.get('/', (req: AuthenticatedRequest, res: Response) => {
		try {
			const metricsService = MetricsService.getInstance();
			const metrics = metricsService.getMetrics();

			res.set({
				'Content-Type': register.contentType,
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Pragma': 'no-cache',
				'Expires': '0',
				'X-Content-Type-Options': 'nosniff',
				'X-Frame-Options': 'DENY',
			});

			res.send(metrics);
		} catch (error) {
			logger.error('Error serving metrics', {
				brand: 'brAInwav',
				message: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			});

			res.status(500).json({
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
				brand: 'brAInwav',
			});
		}
	});

	// JSON-formatted metrics endpoint
	router.get('/json', (req: AuthenticatedRequest, res: Response) => {
		try {
			const metricsService = MetricsService.getInstance();
			const metricsJson = metricsService.getMetricsJson();

			const response = {
				metrics: metricsJson,
				timestamp: new Date().toISOString(),
				brand: 'brAInwav',
				service: 'cortex-webui',
				version: process.env.npm_package_version || '1.0.0',
				uptime: process.uptime(),
			};

			res.set({
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Pragma': 'no-cache',
				'Expires': '0',
				'X-Content-Type-Options': 'nosniff',
				'X-Frame-Options': 'DENY',
			});

			res.json(response);
		} catch (error) {
			logger.error('Error serving JSON metrics', {
				brand: 'brAInwav',
				message: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			});

			res.status(500).json({
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
				brand: 'brAInwav',
			});
		}
	});

	// Manual metrics collection endpoint
	router.post('/collect', async (req: AuthenticatedRequest, res: Response) => {
		try {
			const metricsService = MetricsService.getInstance();
			await metricsService.collectMetrics();

			const response = {
				status: 'collected',
				timestamp: new Date().toISOString(),
				brand: 'brAInwav',
			};

			res.set({
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Pragma': 'no-cache',
				'Expires': '0',
				'X-Content-Type-Options': 'nosniff',
				'X-Frame-Options': 'DENY',
			});

			res.json(response);
		} catch (error) {
			logger.error('Error collecting metrics', {
				brand: 'brAInwav',
				message: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			});

			res.status(500).json({
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString(),
				brand: 'brAInwav',
			});
		}
	});

	// Handle unsupported methods for all metrics endpoints
	router.all('/', (req: Request, res: Response) => {
		res.set('Allow', 'GET');
		res.status(405).json({
			error: 'Method not allowed',
			timestamp: new Date().toISOString(),
			brand: 'brAInwav',
		});
	});

	router.all('/json', (req: Request, res: Response) => {
		res.set('Allow', 'GET');
		res.status(405).json({
			error: 'Method not allowed',
			timestamp: new Date().toISOString(),
			brand: 'brAInwav',
		});
	});

	router.all('/collect', (req: Request, res: Response) => {
		res.set('Allow', 'POST');
		res.status(405).json({
			error: 'Method not allowed',
			timestamp: new Date().toISOString(),
			brand: 'brAInwav',
		});
	});

	// Handle 404 for unknown routes
	router.use((req: Request, res: Response) => {
		res.status(404).json({
			error: 'Not Found',
			timestamp: new Date().toISOString(),
			brand: 'brAInwav',
		});
	});

	return router;
}