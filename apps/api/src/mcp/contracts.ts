import type { ToolContracts } from '../core/types.js';

export const apiGatewayContract: ToolContracts = {
	name: 'api-gateway',
	description:
		'Executes API operations exposed by the Cortex-OS REST interface with validation, caching, and auditing.',
	inputExample: {
		operationId: 'users.list',
		method: 'GET',
		path: '/users',
		headers: { 'x-correlation-id': '1234' },
		apiKey: 'example-key',
	},
	outputExample: {
		statusCode: 200,
		body: { users: [{ id: 'user-1', name: 'Test User' }] },
		headers: { 'content-type': 'application/json' },
		durationMs: 10,
		fromCache: false,
		requestId: 'request-id',
		auditId: 'audit-id',
	},
	errors: ['E_API_ROUTE_NOT_FOUND', 'E_API_SECURITY', 'E_API_RATE_LIMIT', 'E_API_HANDLER'],
};

export const requestRoutingContract: ToolContracts = {
	name: 'api-request-routing',
	description: 'Resolves REST method/path combinations to documented API routes and schemas.',
	inputExample: { method: 'GET', path: '/users' },
	outputExample: {
		route: {
			id: 'users.list',
			method: 'GET',
			path: '/users',
			service: 'users',
			action: 'listUsers',
			description: 'Retrieves registered users.',
			transactional: false,
			requiresAuth: true,
		},
		inputShape: { page: 1, pageSize: 20 },
		outputShape: { users: [{ id: 'user-1', name: 'Example' }] },
	},
	errors: ['E_API_ROUTE_NOT_FOUND'],
};

export const responseHandlingContract: ToolContracts = {
	name: 'api-response-handler',
	description:
		'Normalizes raw API responses into structured MCP payloads with standardized metadata.',
	inputExample: {
		routeId: 'users.list',
		statusCode: 200,
		rawBody: { users: [] },
		headers: { 'content-type': 'application/json' },
		durationMs: 6,
		requestId: 'req-id',
	},
	outputExample: {
		status: 'success',
		body: { users: [] },
		headers: { 'content-type': 'application/json' },
		metadata: { requestId: 'req-id' },
	},
	errors: ['E_API_HANDLER'],
};

export const API_TOOL_CONTRACTS: readonly ToolContracts[] = [
	apiGatewayContract,
	requestRoutingContract,
	responseHandlingContract,
];
