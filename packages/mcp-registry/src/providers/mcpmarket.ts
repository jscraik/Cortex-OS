import type { ServerInfo } from '@cortex-os/mcp-core';
import { z } from 'zod';

const MARKETPLACE_BASE_URL =
	process.env.MARKETPLACE_BASE_URL || 'https://mcpmarket.com/api/servers';

const MarketplaceStartCommandSchema = z.object({
	type: z.string().min(1),
	command: z.string().optional(),
	args: z.array(z.string()).optional(),
	env: z.record(z.string()).optional(),
	endpoint: z.string().optional(),
	headers: z.record(z.string()).optional(),
});

const McpMarketServerSchema = z.object({
	slug: z.string().min(1),
	name: z.string().min(1),
	description: z.string().optional(),
	sourceRepository: z.string().url().optional(),
	startCommand: MarketplaceStartCommandSchema,
});

export type McpMarketServer = z.infer<typeof McpMarketServerSchema>;

export type MarketplaceProviderErrorCode =
	| 'network_error'
	| 'not_found'
	| 'validation_error'
	| 'unsupported_start_command'
	| 'unexpected_response';

export class MarketplaceProviderError extends Error {
	constructor(
		public readonly code: MarketplaceProviderErrorCode,
		message: string,
		public readonly details: string[] = [],
		public readonly status?: number,
	) {
		super(message);
		this.name = 'MarketplaceProviderError';
	}
}

const FALLBACK_SERVERS: Record<string, ServerInfo> = {
	'arxiv-1': {
		name: 'arxiv-1',
		transport: 'stdio',
		command: 'npx',
		args: ['-y', '@modelcontextprotocol/server-arxiv'],
		env: {
			ARXIV_EMAIL: 'set-your-registered-email@example.com',
		},
		// Enhanced metadata for arXiv MCP server
		metadata: {
			description: 'arXiv academic paper search and retrieval server',
			version: '1.0.0',
			author: 'Model Context Protocol',
			tags: ['academic', 'research', 'papers', 'arxiv', 'search'],
			capabilities: ['search_papers', 'download_paper'],
			remoteTools: [
				{
					name: 'search_papers',
					description: 'Search for academic papers on arXiv by query, field, or author',
					parameters: {
						query: 'string (required) - Search query for papers',
						max_results: 'number (optional) - Maximum results to return (1-20)',
						field: 'string (optional) - Field to search in: all, title, author, abstract, etc.',
						sort_by: 'string (optional) - Sort order: relevance, lastUpdatedDate, submittedDate',
					},
				},
				{
					name: 'download_paper',
					description: 'Download full text, PDF, or source of an arXiv paper',
					parameters: {
						paper_id: 'string (required) - arXiv paper ID (e.g., "2301.00001")',
						format: 'string (optional) - Download format: pdf, tex, source',
					},
				},
			],
			homepage: 'https://arxiv.org',
			documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/arxiv',
			license: 'MIT',
			healthCheck: {
				endpoint: false,
				method: 'listTools',
			},
		},
	},
};

type MarketplaceFetchOptions = {
	signal?: AbortSignal;
};

function logMarketplaceEvent(
	level: 'info' | 'warn' | 'error',
	message: string,
	extra: Record<string, unknown> = {},
): void {
	const payload = {
		brand: 'brAInwav',
		component: 'mcp-registry',
		action: 'marketplace_import',
		level,
		message,
		...extra,
	};

	const serialized = JSON.stringify(payload);

	if (level === 'info') {
		console.info(serialized);
		return;
	}

	if (level === 'warn') {
		console.warn(serialized);
		return;
	}

	console.error(serialized);
}

function normalizeStartCommand(server: McpMarketServer): ServerInfo {
	const { startCommand } = server;
	const type = startCommand.type.toLowerCase();

	if (
		type === 'http' ||
		type === 'https' ||
		type === 'sse' ||
		type === 'ws' ||
		type === 'streamablehttp'
	) {
		const endpoint = startCommand.endpoint ?? startCommand.command;

		if (!endpoint) {
			throw new MarketplaceProviderError(
				'validation_error',
				`Marketplace server "${server.slug}" is missing an endpoint for transport "${type}"`,
				['Provide a valid endpoint URL in startCommand.endpoint'],
			);
		}

		return {
			name: server.slug,
			transport: type === 'streamablehttp' ? 'streamableHttp' : (type as ServerInfo['transport']),
			endpoint,
			headers: startCommand.headers,
		} satisfies ServerInfo;
	}

	if (
		type === 'stdio' ||
		type === 'command' ||
		type === 'node' ||
		type === 'python' ||
		type === 'npm' ||
		type === 'npx' ||
		type === 'pnpm'
	) {
		const command = startCommand.command ?? startCommand.endpoint;

		if (!command) {
			throw new MarketplaceProviderError(
				'validation_error',
				`Marketplace server "${server.slug}" is missing a command for transport "${type}"`,
				['Provide a command in startCommand.command'],
			);
		}

		return {
			name: server.slug,
			transport: 'stdio',
			command,
			args: startCommand.args,
			env: startCommand.env,
		} satisfies ServerInfo;
	}

	throw new MarketplaceProviderError(
		'unsupported_start_command',
		`Marketplace server "${server.slug}" uses unsupported start command type "${startCommand.type}"`,
		[
			'Supported types: stdio, command, node, python, npm, npx, pnpm, http, https, sse, ws, streamableHttp',
		],
	);
}

function applyFallbackDefaults(slug: string, server: ServerInfo): ServerInfo {
	const fallback = FALLBACK_SERVERS[slug];

	if (!fallback) {
		return server;
	}

	const mergedArgs = server.args ?? fallback.args;
	const mergedEnv = {
		...(fallback.env ?? {}),
		...(server.env ?? {}),
	};

	return {
		...fallback,
		...server,
		...(mergedArgs ? { args: mergedArgs } : {}),
		...(Object.keys(mergedEnv).length > 0 ? { env: mergedEnv } : {}),
	} satisfies ServerInfo;
}

async function parseMarketplaceResponse(response: Response, slug: string): Promise<ServerInfo> {
	const contentType = response.headers.get('content-type') ?? '';

	if (!contentType.includes('application/json')) {
		throw new MarketplaceProviderError(
			'unexpected_response',
			`Marketplace responded with unsupported content type for slug "${slug}"`,
			['Ensure the marketplace API is reachable and returns JSON'],
			response.status,
		);
	}

	const json = (await response.json()) as unknown;
	const parsed = McpMarketServerSchema.safeParse(json);

	if (!parsed.success) {
		throw new MarketplaceProviderError(
			'validation_error',
			`Marketplace payload for slug "${slug}" failed validation`,
			parsed.error.issues.map((issue) => issue.message),
			response.status,
		);
	}

	const normalized = normalizeStartCommand(parsed.data);
	const withFallback = applyFallbackDefaults(slug, normalized);

	return withFallback;
}

export async function fetchMarketplaceServer(
	slug: string,
	options: MarketplaceFetchOptions = {},
): Promise<ServerInfo> {
	if (!slug.trim()) {
		throw new MarketplaceProviderError('validation_error', 'Marketplace slug must not be empty');
	}
	// Validate slug: only allow lowercase letters, numbers, dashes, and underscores
	if (!/^[a-z0-9_-]+$/.test(slug)) {
		throw new MarketplaceProviderError(
			'validation_error',
			'Marketplace slug contains invalid characters. Only lowercase letters, numbers, dashes, and underscores are allowed.',
		);
	}

	const url = `${MARKETPLACE_BASE_URL}/${encodeURIComponent(slug)}`;

	logMarketplaceEvent('info', 'Fetching marketplace server', { slug, url });

	const response = await sendMarketplaceRequest(url, slug, options.signal);
	const serverInfo = await resolveMarketplaceResponse(slug, response);

	logMarketplaceEvent('info', 'Marketplace server fetched successfully', {
		slug,
		transport: serverInfo.transport,
	});

	return serverInfo;
}

async function sendMarketplaceRequest(
	url: string,
	slug: string,
	signal?: AbortSignal,
): Promise<Response> {
	try {
		return await fetch(url, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'User-Agent': 'brAInwav-CortexOS/1.0',
			},
			signal,
		});
	} catch (error) {
		logMarketplaceEvent('error', 'Marketplace fetch failed', {
			slug,
			url,
			error: error instanceof Error ? error.message : 'unknown-error',
		});

		throw new MarketplaceProviderError(
			'network_error',
			`Failed to contact MCP marketplace for slug "${slug}"`,
			['Check network connectivity and marketplace availability'],
		);
	}
}

async function resolveMarketplaceResponse(slug: string, response: Response): Promise<ServerInfo> {
	if (response.status === 404) {
		logMarketplaceEvent('warn', 'Marketplace returned 404 for slug', { slug });

		const fallback = FALLBACK_SERVERS[slug];

		if (fallback) {
			logMarketplaceEvent('info', 'Using fallback configuration for slug', { slug });
			return fallback;
		}

		throw new MarketplaceProviderError('not_found', `Marketplace server "${slug}" was not found`, [
			'Verify the slug on mcpmarket.com and try again',
		]);
	}

	if (!response.ok) {
		logMarketplaceEvent('error', 'Marketplace returned error response', {
			slug,
			status: response.status,
		});

		throw new MarketplaceProviderError(
			'network_error',
			`Marketplace request for slug "${slug}" failed with status ${response.status}`,
			['Retry later or contact marketplace support'],
			response.status,
		);
	}

	return parseMarketplaceResponse(response, slug);
}
