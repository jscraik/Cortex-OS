import { randomUUID } from 'node:crypto';

import type { HttpMethod, RouteDefinition, RouteResolution } from './types.js';

const defaultRoutes: RouteDefinition[] = [
	{
		id: 'gateway.health',
		method: 'GET',
		path: '/health',
		service: 'system',
		action: 'health',
		description: 'Returns API health status.',
		transactional: false,
		requiresAuth: false,
		cacheTtlSeconds: 5,
		tags: ['health', 'status'],
	},
	{
		id: 'users.list',
		method: 'GET',
		path: '/users',
		service: 'users',
		action: 'listUsers',
		description: 'Retrieves registered users.',
		transactional: false,
		requiresAuth: true,
		cacheTtlSeconds: 30,
		rateLimitPerMinute: 10,
		tags: ['users', 'read'],
	},
	{
		id: 'orders.create',
		method: 'POST',
		path: '/orders',
		service: 'orders',
		action: 'createOrder',
		description: 'Creates a new order.',
		transactional: true,
		requiresAuth: true,
		tags: ['orders', 'write'],
	},
];

const routeShapes: Record<string, RouteResolution> = {
	'gateway.health': {
		route: defaultRoutes[0]!,
		inputShape: {},
		outputShape: { status: 'ok', uptime: 0 },
	},
	'users.list': {
		route: defaultRoutes[1]!,
		inputShape: { page: 1, pageSize: 20 },
		outputShape: { users: [{ id: 'user-id', name: 'Example' }] },
	},
	'orders.create': {
		route: defaultRoutes[2]!,
		inputShape: { items: [{ sku: 'item-1', quantity: 1 }] },
		outputShape: { orderId: 'order-id', status: 'created' },
	},
};

export class RouteNotFoundError extends Error {
	constructor(method: HttpMethod, path: string) {
		super(`No route registered for ${method} ${path}`);
		this.name = 'RouteNotFoundError';
	}
}

export class RequestRouter {
	private readonly routes: Map<string, RouteResolution>;

	constructor(resolutions: RouteResolution[] = Object.values(routeShapes)) {
		this.routes = new Map(resolutions.map((resolution) => [resolution.route.id, resolution]));
	}

	resolveById(operationId: string): RouteResolution {
		const route = this.routes.get(operationId);
		if (!route) {
			throw new RouteNotFoundError('GET', operationId);
		}
		return route;
	}

	resolve(method: HttpMethod, path: string): RouteResolution {
		for (const resolution of this.routes.values()) {
			if (resolution.route.method === method && resolution.route.path === path) {
				return resolution;
			}
		}
		throw new RouteNotFoundError(method, path);
	}

	register(
		route: RouteDefinition,
		inputShape: Record<string, unknown>,
		outputShape: Record<string, unknown>,
	): void {
		const id = route.id ?? randomUUID();
		const normalized = {
			route: { ...route, id },
			inputShape,
			outputShape,
		} satisfies RouteResolution;
		this.routes.set(id, normalized);
	}

	list(): readonly RouteResolution[] {
		return Array.from(this.routes.values());
	}
}

export function createDefaultRouter(): RequestRouter {
	return new RequestRouter(Object.values(routeShapes));
}

export const DEFAULT_ROUTE_SHAPES = routeShapes;
