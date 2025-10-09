/**
 * Resources Registry Module
 *
 * MCP 2025-06-18 Resources implementation using FastMCP's
 * built-in resource support with URI templates and providers.
 */

import type { FastMcpServer } from 'fastmcp';
import { BRAND, createBrandedLog } from '../utils/brand.js';
import { loadServerConfig } from '../utils/config.js';
import { readMemoryById, searchMemory } from './memory-provider.js';
import { readHealthMetrics } from './metrics-provider.js';
import { readRepoFile } from './repo-provider.js';

/**
 * Register all resources with the server
 */
export function createResources(server: FastMcpServer, logger: any) {
	const config = loadServerConfig();

	if (!config.resourcesEnabled) {
		logger.info(createBrandedLog('resources_disabled'), 'MCP resources disabled');
		return;
	}

	// Memory Item Resource
	server.resources.add({
		uriTemplate: 'memory://cortex-local/{id}',
		name: 'Memory Item',
		description: 'Access stored memories by ID with full content and metadata',
		mimeType: 'application/json',
		read: async (uri, signal) => {
			logger.info(createBrandedLog('resource_read', { uri: uri.href }), 'Reading memory item');
			const id = uri.pathname.split('/').pop();
			if (!id) {
				throw new Error('Memory ID is required');
			}
			return readMemoryById(id, signal);
		},
	});

	// Memory Search Resource
	server.resources.add({
		uriTemplate: 'memory://cortex-local/search{?query,limit}',
		name: 'Memory Search',
		description: 'Search memories with semantic or keyword queries',
		mimeType: 'application/json',
		read: async (uri, signal) => {
			logger.info(createBrandedLog('resource_read', { uri: uri.href }), 'Searching memories');
			const query = uri.searchParams.get('query') || '';
			const limit = Number.parseInt(uri.searchParams.get('limit') || '10', 10);
			return searchMemory(query, limit, signal);
		},
	});

	// Repository File Resource
	server.resources.add({
		uriTemplate: 'repo://cortex-os/file{?path}',
		name: 'Repository File',
		description: 'Access files in the repository with path filtering and security controls',
		mimeType: 'text/plain',
		read: async (uri, signal) => {
			logger.info(createBrandedLog('resource_read', { uri: uri.href }), 'Reading repository file');
			return readRepoFile(uri, signal);
		},
	});

	// System Health Metrics Resource
	server.resources.add({
		uriTemplate: 'metrics://cortex-os/health',
		name: 'System Health',
		description: 'brAInwav system health snapshot and metrics',
		mimeType: 'application/json',
		read: async (uri, signal) => {
			logger.info(createBrandedLog('resource_read', { uri: uri.href }), 'Reading health metrics');
			return readHealthMetrics(signal);
		},
	});

	logger.info(
		createBrandedLog('resources_registered', { count: 4 }),
		`${BRAND.prefix} resources registered`,
	);
}
