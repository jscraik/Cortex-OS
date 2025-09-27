import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Router } from 'express';
import { describe, expect, it } from 'vitest';
import { apiOpenApiSpec, apiOpenApiJson } from '../../apps/api/src/openapi/spec.js';
import { apiV1Router } from '../../apps/api/src/routes/api-v1.js';
import { authRouter } from '../../apps/api/src/routes/auth.js';

const HEALTH_ROUTE_SIGNATURE = 'GET /health';

function normalizePath(basePath: string, routePath: string): string {
	const segments = [basePath, routePath]
		.filter((segment) => segment && segment !== '/')
		.map((segment) => segment.replace(/^\//, '').replace(/\/$/, ''));
	const combined = `/${segments.join('/')}`.replace(/\/+/g, '/');
	const withoutTrailing =
		combined.endsWith('/') && combined !== '/' ? combined.slice(0, -1) : combined;
	return withoutTrailing.replace(/:(\w+)/g, '{$1}');
}

function collectRouterRoutes(router: Router, basePath: string): Set<string> {
	const signatures = new Set<string>();
	for (const layer of router.stack ?? []) {
		const route = layer.route;
		if (!route) {
			continue;
		}
		const paths = Array.isArray(route.path) ? route.path : [route.path];
		for (const currentPath of paths) {
			const fullPath = normalizePath(basePath, currentPath);
			for (const method of Object.keys(route.methods)) {
				if (route.methods[method]) {
					signatures.add(`${method.toUpperCase()} ${fullPath}`);
				}
			}
		}
	}
	return signatures;
}

function collectSpecRoutes(): Set<string> {
	const signatures = new Set<string>();
	for (const [path, operations] of Object.entries(apiOpenApiSpec.paths)) {
		for (const method of Object.keys(operations)) {
			signatures.add(`${method.toUpperCase()} ${path}`);
		}
	}
	return signatures;
}

describe('OpenAPI contract sync', () => {
	it('documents every exposed API route', () => {
		const documentedRoutes = collectSpecRoutes();
		const apiRoutes = collectRouterRoutes(apiV1Router, '/api/v1');
		const authRoutes = collectRouterRoutes(authRouter, '');
		authRoutes.add(HEALTH_ROUTE_SIGNATURE);
		const actualRoutes = new Set([...apiRoutes, ...authRoutes]);
		expect(documentedRoutes).toEqual(actualRoutes);
	});

	it('keeps the JSON export aligned with the TypeScript source', () => {
		const jsonPath = join(process.cwd(), 'apps', 'api', 'src', 'openapi', 'spec.json');
		const parsed = JSON.parse(readFileSync(jsonPath, 'utf-8'));
		expect(parsed).toEqual(apiOpenApiSpec);
		expect(JSON.stringify(parsed, null, 2)).toBe(apiOpenApiJson);
	});
});
