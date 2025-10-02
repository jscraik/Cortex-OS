// Metrics Collection Middleware for brAInwav Cortex WebUI
// Automatic HTTP request metrics collection

import type { NextFunction, Request, Response } from 'express';
import { performance } from 'node:perf_hooks';
import { MetricsService } from '../services/metricsService.js';

interface RequestWithMetrics extends Request {
	_startTime?: number;
	_route?: string;
}

export function metricsMiddleware(): (
	req: RequestWithMetrics,
	res: Response,
	next: NextFunction,
) => void {
	return (req: RequestWithMetrics, res: Response, next: NextFunction): void => {
		// Record start time
		req._startTime = performance.now();

		// Extract route pattern (handle cases where route might not be available)
		req._route = req.route ? req.route.path : req.path || 'unknown';

		// Hook into response finish event
		res.on('finish', () => {
			recordMetrics(req, res);
		});

		next();
	};
}

function recordMetrics(req: RequestWithMetrics, res: Response): void {
	try {
		const metricsService = MetricsService.getInstance();

		// Calculate response time
		const responseTime = req._startTime ? performance.now() - req._startTime : 0;

		// Get route information
		const route = getSanitizedRoute(req._route || req.path);
		const method = req.method || 'UNKNOWN';

		// Record HTTP request metrics
		metricsService.recordHttpRequest(method, route, res.statusCode, responseTime);

		// Record additional metrics for specific endpoints
		recordEndpointSpecificMetrics(metricsService, req, res, responseTime);
	} catch (error) {
		// Log error but don't let metrics collection break the request
		console.error('Error recording metrics:', error);
	}
}

function getSanitizedRoute(route: string): string {
	if (!route || route === '/') return '/';

	// Remove query parameters and hash
	const cleanRoute = route.split('?')[0].split('#')[0];

	// Replace dynamic segments with placeholder patterns
	let sanitized = cleanRoute
		.replace(
			/\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
			'/:id',
		) // UUIDs
		.replace(/\/\d+/g, '/:id') // Numeric IDs
		.replace(/\/[a-fA-F0-9]{24}/g, '/:id') // MongoDB ObjectIDs
		.replace(/\/[^/]+\.[^/]+$/g, '/:file') // Files with extensions
		.replace(/\/[^/]{20,}/g, '/:token'); // Long strings (tokens, keys)

	// Limit route length to prevent metric explosion
	if (sanitized.length > 100) {
		const segments = sanitized.split('/').slice(0, 5);
		sanitized = `${segments.join('/')}/...`;
	}
	return sanitized || '/';
}

function recordEndpointSpecificMetrics(
	metricsService: MetricsService,
	req: RequestWithMetrics,
	res: Response,
	responseTime: number,
): void {
	const route = req._route || req.path || 'unknown';
	const method = req.method || 'UNKNOWN';

	// Authentication metrics
	if (route.includes('/auth') || route.includes('/login') || route.includes('/oauth')) {
		const provider = extractAuthProvider(req);
		const success = res.statusCode >= 200 && res.statusCode < 300;

		metricsService.recordAuthAttempt(provider, success);

		if (!success) {
			const reason = getAuthFailureReason(res.statusCode);
			metricsService.recordAuthFailure(provider, reason);
		}
	}

	// Token validation metrics
	if (req.headers.authorization || req.headers['x-api-key']) {
		const valid = res.statusCode !== 401;
		metricsService.recordTokenValidation(valid, responseTime);
	}

	// Database operation metrics (simplified - in a real app you'd track actual DB operations)
	if (
		route.includes('/conversations') ||
		route.includes('/messages') ||
		route.includes('/documents')
	) {
		const operation = extractDatabaseOperation(method, route);
		const table = extractTableFromRoute(route);
		const success = res.statusCode < 500;

		metricsService.recordDatabaseQuery(operation, table, responseTime, success);
	}
}

function extractAuthProvider(req: RequestWithMetrics): string {
	const route = req._route || req.path || '';

	if (route.includes('/oauth')) {
		const providerMatch = route.match(/\/oauth\/([^/]+)/);
		return providerMatch ? providerMatch[1] : 'oauth';
	}

	if (route.includes('/auth/local') || req.body?.email) {
		return 'local';
	}

	return 'unknown';
}

function getAuthFailureReason(statusCode: number): string {
	switch (statusCode) {
		case 400:
			return 'invalid_request';
		case 401:
			return 'invalid_credentials';
		case 403:
			return 'forbidden';
		case 429:
			return 'rate_limited';
		case 500:
			return 'server_error';
		default:
			return 'unknown';
	}
}

function extractDatabaseOperation(method: string, route: string): string {
	if (route.includes('/search')) return 'SELECT';
	if (method === 'GET') return 'SELECT';
	if (method === 'POST') return 'INSERT';
	if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
	if (method === 'DELETE') return 'DELETE';
	return 'UNKNOWN';
}

function extractTableFromRoute(route: string): string {
	if (route.includes('/conversations')) return 'conversations';
	if (route.includes('/messages')) return 'messages';
	if (route.includes('/documents')) return 'documents';
	if (route.includes('/users')) return 'users';
	if (route.includes('/files')) return 'files';
	if (route.includes('/models')) return 'models';
	return 'unknown';
}

// Middleware to record custom metrics based on business logic
export function recordCustomMetric(
	name: string,
	type: 'counter' | 'gauge' | 'histogram',
	value?: number,
	labels?: Record<string, string>,
): (req: Request, res: Response, next: NextFunction) => void {
	return (_req: Request, _res: Response, next: NextFunction): void => {
		try {
			const metricsService = MetricsService.getInstance();

			switch (type) {
				case 'counter':
					metricsService.incrementCounter(name, labels);
					break;
				case 'gauge':
					if (value !== undefined) {
						metricsService.setGauge(name, value, labels);
					}
					break;
				case 'histogram':
					if (value !== undefined) {
						metricsService.recordHistogram(name, value, labels);
					}
					break;
			}
		} catch (error) {
			console.error('Error recording custom metric:', error);
		}

		next();
	};
}

// Helper function to record metrics manually in controllers
export function recordHttpRequestMetric(
	method: string,
	route: string,
	statusCode: number,
	responseTimeMs: number,
): void {
	try {
		const metricsService = MetricsService.getInstance();
		metricsService.recordHttpRequest(method, route, statusCode, responseTimeMs);
	} catch (error) {
		console.error('Error recording HTTP metric:', error);
	}
}

// Helper function to record database metrics manually
export function recordDatabaseMetric(
	operation: string,
	table: string,
	durationMs: number,
	success: boolean,
): void {
	try {
		const metricsService = MetricsService.getInstance();
		metricsService.recordDatabaseQuery(operation, table, durationMs, success);
	} catch (error) {
		console.error('Error recording database metric:', error);
	}
}

// Helper function to record authentication metrics manually
export function recordAuthMetric(provider: string, success: boolean, reason?: string): void {
	try {
		const metricsService = MetricsService.getInstance();
		metricsService.recordAuthAttempt(provider, success);

		if (!success && reason) {
			metricsService.recordAuthFailure(provider, reason);
		}
	} catch (error) {
		console.error('Error recording auth metric:', error);
	}
}
