#!/usr/bin/env node

import type { Logger } from 'pino';
import { pino } from 'pino';
import { type ConnectorsConfig, loadConnectorsConfig } from './config/connectors.js';
import { loadHybridConfig } from './config/hybrid.js';
import { loadOllamaConfig, type OllamaConfig } from './config/ollama.js';
import { ConnectorsProxyManager } from './connectors-proxy.js';
import { PiecesMCPProxy } from './pieces-proxy.js';
import { createPrompts } from './prompts/index.js';
import { createResources } from './resources/index.js';
import { createServer } from './server/mcp-server.js';
import { startTransport, type TransportController } from './server/transport.js';
import { prewarm, scheduleHeartbeat } from './server/warmup.js';
import { registerPiecesTools, registerTools } from './tools/index.js';
import { BRAND, createBrandedLog } from './utils/brand.js';
import { loadServerConfig, type ServerConfig } from './utils/config.js';

type HeartbeatStopper = () => void;

const PIECES_DEFAULT_ENDPOINT = 'http://localhost:39300/model_context_protocol/2024-11-05/sse';

function createLogger(level: string): Logger {
	return pino({ level });
}

function createPiecesProxy(config: ServerConfig, logger: Logger): PiecesMCPProxy | null {
	if (!config.piecesEnabled) {
		logger.info(createBrandedLog('pieces_disabled'), 'Pieces MCP proxy disabled by config');
		return null;
	}

	const endpoint = process.env.PIECES_MCP_ENDPOINT ?? PIECES_DEFAULT_ENDPOINT;
	logger.debug(createBrandedLog('pieces_endpoint', { endpoint }), 'Configuring Pieces MCP proxy');

	return new PiecesMCPProxy({
		enabled: true,
		endpoint,
		logger,
	});
}

async function attachPiecesTools(
	server: any,
	logger: Logger,
	proxy: PiecesMCPProxy | null,
): Promise<void> {
	if (!proxy) {
		return;
	}

	try {
		await proxy.connect();
		logger.info(createBrandedLog('pieces_connected'), 'Pieces MCP proxy connected');
		registerPiecesTools(server, logger, proxy);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.warn(
			createBrandedLog('pieces_connect_failed', { error: message }),
			'Pieces MCP proxy connection failed',
		);
	}
}

async function maybeWarmupOllama(
	config: ServerConfig,
	ollama: OllamaConfig,
	logger: Logger,
): Promise<HeartbeatStopper | null> {
	if (!config.ollamaEnabled || ollama.prewarmModels.length === 0) {
		return null;
	}

	try {
		await prewarm(ollama.prewarmModels, ollama.keepAlive, { baseUrl: ollama.baseUrl });
		logger.info(
			createBrandedLog('ollama_prewarm_complete', { models: ollama.prewarmModels.length }),
			'Ollama models prewarmed',
		);
		return scheduleHeartbeat(ollama.prewarmModels, ollama.heartbeatInterval, ollama.keepAlive, {
			baseUrl: ollama.baseUrl,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.warn(
			createBrandedLog('ollama_prewarm_failed', { error: message }),
			'Ollama prewarm failed',
		);
		return null;
	}
}

async function validateOllamaDeployment(ollama: OllamaConfig, logger: Logger) {
	const needsTags = ollama.requiredModels.length > 0;
	const healthEndpoint = ollama.healthEndpoint;
	if (!needsTags && !healthEndpoint) {
		return;
	}
	try {
		if (needsTags) {
			const response = await fetch(`${ollama.baseUrl}/api/tags`);
			if (!response.ok) {
				logger.warn(
					createBrandedLog('ollama_tags_unavailable', { status: response.status }),
					'Ollama tag listing failed',
				);
			} else {
				const payload = (await response.json()) as { models?: Array<{ name?: string }> };
				const available = new Set(
					(payload.models ?? []).map((model) => model.name).filter(Boolean) as string[],
				);
				const missing = ollama.requiredModels.filter((model) => !available.has(model));
				if (missing.length > 0) {
					logger.warn(
						createBrandedLog('ollama_models_missing', { missing }),
						'Required Ollama models missing',
					);
				}
			}
		}
		if (healthEndpoint) {
			const health = await fetch(healthEndpoint);
			if (!health.ok) {
				logger.warn(
					createBrandedLog('ollama_health_failed', {
						status: health.status,
						endpoint: healthEndpoint,
					}),
					'Ollama health endpoint failed',
				);
			}
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.warn(
			createBrandedLog('ollama_validation_error', { error: message }),
			'Failed to validate Ollama deployment',
		);
	}
}

function setupShutdownHandlers(
	logger: Logger,
	transport: TransportController,
	piecesProxy: PiecesMCPProxy | null,
	connectorsProxy: ConnectorsProxyManager | null,
	heartbeatStopper: HeartbeatStopper | null,
) {
	const shutdown = async (signal: NodeJS.Signals) => {
		logger.info(createBrandedLog('shutdown_signal', { signal }), `${BRAND.prefix} shutting down`);
		heartbeatStopper?.();
		await piecesProxy?.disconnect().catch(() => undefined);
		await connectorsProxy?.disconnectAll().catch(() => undefined);
		await transport.stop().catch(() => undefined);
		process.exit(0);
	};

	process.once('SIGINT', () => {
		void shutdown('SIGINT');
	});
	process.once('SIGTERM', () => {
		void shutdown('SIGTERM');
	});
}

function setupProcessErrorHandlers(logger: Logger) {
	process.on('uncaughtException', (error) => {
		logger.error(
			createBrandedLog('uncaught_exception', { error }),
			'Unhandled exception in MCP server',
		);
	});

	process.on('unhandledRejection', (reason) => {
		logger.error(
			createBrandedLog('unhandled_rejection', { reason }),
			'Unhandled rejection in MCP server',
		);
	});
}

function createConnectorsProxy(
	config: ConnectorsConfig,
	logger: Logger,
): ConnectorsProxyManager | null {
	if (!config.enabled || config.manifest.connectors.length === 0) {
		return null;
	}

	return new ConnectorsProxyManager({
		manifest: config.manifest,
		logger: logger.child({ component: 'connectors-proxy' }),
		enabled: config.enabled,
		apiKey: config.apiKey,
	});
}

async function attachConnectorsTools(
	server: any,
	logger: Logger,
	proxy: ConnectorsProxyManager | null,
): Promise<void> {
	if (!proxy) {
		return;
	}

	await proxy.connectAll();
	proxy.registerTools(server, logger);
}

async function main() {
	const config = loadServerConfig();
	const logger = createLogger(config.logLevel);
	const hybrid = loadHybridConfig(logger);
	const ollama = loadOllamaConfig(hybrid);
	const connectorsConfig = loadConnectorsConfig(logger);
	const { server } = createServer(logger, config);
	const piecesProxy = createPiecesProxy(config, logger);
	const connectorsProxy = createConnectorsProxy(connectorsConfig, logger);

	registerTools(server, logger, { piecesProxy, config, ollama, hybrid });
	createPrompts(server, logger);
	createResources(server, logger);

	const heartbeatStopper = await maybeWarmupOllama(config, ollama, logger);
	await validateOllamaDeployment(ollama, logger);
	await attachPiecesTools(server, logger, piecesProxy);
	await attachConnectorsTools(server, logger, connectorsProxy);
	const transport = await startTransport(server, logger, config);

	setupShutdownHandlers(logger, transport, piecesProxy, connectorsProxy, heartbeatStopper);
	setupProcessErrorHandlers(logger);
}

main().catch((error) => {
	const logger = pino({ level: 'error' });
	const message = error instanceof Error ? error.message : String(error);
	logger.error(
		createBrandedLog('startup_failed', { error: message }),
		`${BRAND.prefix} failed to start MCP server`,
	);
	process.exit(1);
});
