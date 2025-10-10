import { resolveTransport } from '@cortex-os/mcp-bridge/runtime/transport';
import type { FastMcpServer } from 'fastmcp';
import type { Logger } from 'pino';
import { BRAND, createBrandedLog } from '../utils/brand.js';
import type { ServerConfig } from '../utils/config.js';

export type TransportController = {
	mode: 'http' | 'stdio';
	stop: () => Promise<void>;
};

const STDIO_MODE = 'stdio';

async function startStdio(server: FastMcpServer, logger: Logger): Promise<TransportController> {
	await server.start({ transportType: STDIO_MODE });
	logger.info(createBrandedLog('transport_stdio_ready'), `${BRAND.prefix} FastMCP ready on STDIO`);
	return {
		mode: STDIO_MODE,
		stop: async () => {
			await server.stop();
			logger.info(createBrandedLog('transport_stdio_stopped'), 'STDIO transport stopped');
		},
	};
}

async function startHttp(
	server: FastMcpServer,
	logger: Logger,
	config: ServerConfig,
): Promise<TransportController> {
	await server.start({
		transportType: 'httpStream',
		httpStream: {
			host: config.host,
			port: config.port,
			endpoint: config.httpEndpoint as `/${string}`,
			enableJsonResponse: true,
			stateless: true,
		},
	});

	logger.info(
		createBrandedLog('transport_http_ready', {
			host: config.host,
			port: config.port,
			endpoint: config.httpEndpoint,
		}),
		`${BRAND.prefix} FastMCP ready on HTTP/SSE`,
	);

	return {
		mode: 'http',
		stop: async () => {
			await server.stop();
			logger.info(createBrandedLog('transport_http_stopped'), 'HTTP transport stopped');
		},
	};
}

export async function startTransport(
	server: FastMcpServer,
	logger: Logger,
	config: ServerConfig,
): Promise<TransportController> {
	const decision = resolveTransport(process.env.MCP_TRANSPORT);
	for (const warning of decision.warnings) {
		logger.warn(
			createBrandedLog('transport_warning', { code: warning }),
			'Transport override warning',
		);
	}

	if (decision.selected === STDIO_MODE) {
		return startStdio(server, logger);
	}

	const apiKey = process.env.MCP_API_KEY?.trim();
	if (!apiKey) {
		logger.error(
			createBrandedLog('http_auth_missing', {
				host: config.host,
				port: config.port,
				endpoint: config.httpEndpoint,
			}),
			`${BRAND.prefix} HTTP transport requires MCP_API_KEY`,
		);
		throw new Error(
			'[brAInwav] MCP_API_KEY is required for HTTP transport. Set MCP_API_KEY or configure MCP_TRANSPORT=stdio to continue.',
		);
	}

	return startHttp(server, logger, config);
}
