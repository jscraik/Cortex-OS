#!/usr/bin/env node

import type { Logger } from 'pino';
import { pino } from 'pino';
import { type ConnectorsConfig, loadConnectorsConfig } from './config/connectors.js';
import { loadHybridConfig } from './config/hybrid.js';
import { loadOllamaConfig, type OllamaConfig } from './config/ollama.js';
import { ConnectorsProxyManager } from './connectors-proxy.js';
import { createPiecesContextBridge } from './context-bridge.js';
import { PiecesCopilotMCPProxy } from './pieces-copilot-proxy.js';
import { PiecesDriveMCPProxy } from './pieces-drive-proxy.js';
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
const PIECES_DRIVE_DEFAULT_ENDPOINT =
	'http://localhost:39301/model_context_protocol/2024-11-05/sse';
const PIECES_COPILOT_DEFAULT_ENDPOINT =
	'http://localhost:39302/model_context_protocol/2024-11-05/sse';

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

function createPiecesDriveProxy(config: ServerConfig, logger: Logger): PiecesDriveMCPProxy | null {
	if (!config.piecesEnabled) {
		logger.debug(
			createBrandedLog('pieces_drive_disabled'),
			'Pieces Drive MCP proxy disabled by config',
		);
		return null;
	}

	const endpoint = process.env.PIECES_DRIVE_MCP_ENDPOINT ?? PIECES_DRIVE_DEFAULT_ENDPOINT;
	logger.debug(
		createBrandedLog('pieces_drive_endpoint', { endpoint }),
		'Configuring Pieces Drive MCP proxy',
	);

	return new PiecesDriveMCPProxy({
		enabled: true,
		endpoint,
		logger,
	});
}

function createPiecesCopilotProxy(
	config: ServerConfig,
	logger: Logger,
): PiecesCopilotMCPProxy | null {
	if (!config.piecesEnabled) {
		logger.debug(
			createBrandedLog('pieces_copilot_disabled'),
			'Pieces Copilot MCP proxy disabled by config',
		);
		return null;
	}

	const endpoint = process.env.PIECES_COPILOT_MCP_ENDPOINT ?? PIECES_COPILOT_DEFAULT_ENDPOINT;
	logger.debug(
		createBrandedLog('pieces_copilot_endpoint', { endpoint }),
		'Configuring Pieces Copilot MCP proxy',
	);

	return new PiecesCopilotMCPProxy({
		enabled: true,
		endpoint,
		logger,
	});
}

async function attachPiecesTools(
	server: any,
	logger: Logger,
	piecesProxy: PiecesMCPProxy | null,
	driveProxy: PiecesDriveMCPProxy | null,
	copilotProxy: PiecesCopilotMCPProxy | null,
	contextBridge: any,
): Promise<void> {
	// Connect Pieces LTM proxy
	if (piecesProxy) {
		try {
			await piecesProxy.connect();
			logger.info(createBrandedLog('pieces_connected'), 'Pieces MCP proxy connected');
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logger.warn(
				createBrandedLog('pieces_connect_failed', { error: message }),
				'Pieces MCP proxy connection failed',
			);
		}
	}

	// Connect Pieces Drive proxy
	if (driveProxy) {
		try {
			await driveProxy.connect();
			logger.info(createBrandedLog('pieces_drive_connected'), 'Pieces Drive MCP proxy connected');
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logger.warn(
				createBrandedLog('pieces_drive_connect_failed', { error: message }),
				'Pieces Drive MCP proxy connection failed',
			);
		}
	}

	// Connect Pieces Copilot proxy
	if (copilotProxy) {
		try {
			await copilotProxy.connect();
			logger.info(
				createBrandedLog('pieces_copilot_connected'),
				'Pieces Copilot MCP proxy connected',
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			logger.warn(
				createBrandedLog('pieces_copilot_connect_failed', { error: message }),
				'Pieces Copilot MCP proxy connection failed',
			);
		}
	}

	// Register all Pieces tools (including hybrid search)
	registerPiecesTools(server, logger, { piecesProxy, driveProxy, copilotProxy, contextBridge });
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
	driveProxy: PiecesDriveMCPProxy | null,
	copilotProxy: PiecesCopilotMCPProxy | null,
	connectorsProxy: ConnectorsProxyManager | null,
	heartbeatStopper: HeartbeatStopper | null,
) {
	const shutdown = async (signal: NodeJS.Signals) => {
		logger.info(createBrandedLog('shutdown_signal', { signal }), `${BRAND.prefix} shutting down`);
		heartbeatStopper?.();
		await piecesProxy?.disconnect().catch(() => undefined);
		await driveProxy?.disconnect().catch(() => undefined);
		await copilotProxy?.disconnect().catch(() => undefined);
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
	const { server, auth, oauthOptions } = createServer(logger, config);

	// Create all Pieces proxies
	const piecesProxy = createPiecesProxy(config, logger);
	const driveProxy = createPiecesDriveProxy(config, logger);
	const copilotProxy = createPiecesCopilotProxy(config, logger);
	const contextBridge = createPiecesContextBridge(logger);

	const connectorsProxy = createConnectorsProxy(connectorsConfig, logger);

        registerTools(server, logger, {
                piecesProxy,
                driveProxy,
                copilotProxy,
                contextBridge,
                config,
                ollama,
                hybrid,
                auth,
                oauthOptions,
        });
	createPrompts(server, logger);
	createResources(server, logger);

	const heartbeatStopper = await maybeWarmupOllama(config, ollama, logger);
	await validateOllamaDeployment(ollama, logger);
        await attachPiecesTools(server, logger, piecesProxy, driveProxy, copilotProxy, contextBridge);
	await attachConnectorsTools(server, logger, connectorsProxy);
	const transport = await startTransport(server, logger, config, auth);

	setupShutdownHandlers(
		logger,
		transport,
		piecesProxy,
		driveProxy,
		copilotProxy,
		connectorsProxy,
		heartbeatStopper,
	);
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
