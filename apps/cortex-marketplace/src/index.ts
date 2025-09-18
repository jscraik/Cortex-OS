/**
 * @file Marketplace API Server
 * @description Entry point for MCP marketplace API server
 */

import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pino from 'pino';
import { build } from './app.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

type LoggerLevel = 'debug' | 'info' | 'warn' | 'error';

interface ServerConfig {
	port: number;
	host: string;
	registries: Record<string, string>;
	cacheDir: string;
	cacheTtl: number;
	logLevel: LoggerLevel;
}

async function loadConfig(): Promise<ServerConfig> {
	const config: ServerConfig = {
		port: parseInt(process.env.PORT || '3000', 10),
		host: process.env.HOST || '0.0.0.0',
		registries: {
			official:
				process.env.OFFICIAL_REGISTRY ||
				'https://registry.cortex-os.dev/v1/registry.json',
			community:
				process.env.COMMUNITY_REGISTRY ||
				'https://community.mcp.dev/v1/registry.json',
		},
		cacheDir:
			process.env.CACHE_DIR ||
			path.join(os.tmpdir(), 'cortex-marketplace-cache'),
		cacheTtl: parseInt(process.env.CACHE_TTL || '300000', 10),
		logLevel: ((): LoggerLevel => {
			const lvl = (process.env.LOG_LEVEL || 'info').toLowerCase();
			return ['debug', 'info', 'warn', 'error'].includes(lvl)
				? (lvl as LoggerLevel)
				: 'info';
		})(),
	};

	try {
		const configPath = process.env.CONFIG_FILE || './config.json';
		const raw = await readFile(configPath, 'utf-8');
		const fileConfig = JSON.parse(raw) as Partial<ServerConfig> & {
			registries?: Record<string, string>;
		};
		if (fileConfig.registries && !process.env.OFFICIAL_REGISTRY) {
			config.registries = { ...fileConfig.registries, ...config.registries };
		}
		if (fileConfig.cacheDir && !process.env.CACHE_DIR) {
			config.cacheDir = fileConfig.cacheDir;
		}
		if (fileConfig.cacheTtl && !process.env.CACHE_TTL) {
			config.cacheTtl = fileConfig.cacheTtl;
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		logger.warn(
			{ err: msg },
			'Using default configuration (config file not found or invalid)',
		);
	}

	return config;
}

async function start(): Promise<void> {
	let server: ReturnType<typeof build> | null = null;
	try {
		const config = await loadConfig();
		logger.info('Starting Cortex MCP Marketplace API...');
		logger.info(
			{ port: config.port, host: config.host },
			'Server configuration',
		);
		logger.info(
			{ cacheDir: config.cacheDir, cacheTtl: config.cacheTtl },
			'Cache settings',
		);
		logger.info(
			{ registries: Object.keys(config.registries) },
			'Configured registries',
		);

		server = build({
			logger: config.logLevel !== 'error',
			registries: config.registries,
			cacheDir: config.cacheDir,
			cacheTtl: config.cacheTtl,
			port: config.port,
			host: config.host,
		});

		const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
		signals.forEach((signal) => {
			process.on(signal, async () => {
				logger.info(`Received ${signal}, gracefully shutting down...`);
				try {
					if (server) {
						await server.close();
					}
					logger.info('Server closed successfully');
					process.exit(0);
				} catch (err) {
					logger.error({ err }, 'Error during shutdown');
					process.exit(1);
				}
			});
		});

		process.on('uncaughtException', (error) => {
			logger.error({ err: error }, 'Uncaught Exception');
			process.exit(1);
		});
		process.on('unhandledRejection', (reason, promise) => {
			logger.error({ reason, promise }, 'Unhandled Rejection');
			process.exit(1);
		});

		await server.listen({ port: config.port, host: config.host });
		logger.info('🚀 Marketplace API server started successfully!');
		logger.info(
			`📖 API Documentation: http://${config.host}:${config.port}/documentation`,
		);
		logger.info(`🏥 Health Check: http://${config.host}:${config.port}/health`);
	} catch (error) {
		logger.error({ err: error }, 'Failed to start server');
		if (server) {
			try {
				await server.close();
			} catch (closeError) {
				logger.error({ err: closeError }, 'Error closing server');
			}
		}
		process.exit(1);
	}
}

if (process.env.NODE_ENV !== 'test') {
	start();
}
