#!/usr/bin/env node
/**
 * brAInwav Egress Proxy Entry Point
 * Starts the policy-enforced HTTP/HTTPS proxy
 */

import { pino } from 'pino';
import {
	DEFAULT_BRAINWAV_POLICY,
	DEFAULT_EGRESS_CONFIG,
	EgressProxy,
	PolicyEngine,
} from './policy/index.js';

const logger = pino({
	level: process.env.BRAINWAV_LOG_LEVEL || 'info',
	formatters: {
		level: (label) => ({ level: label }),
	},
	timestamp: pino.stdTimeFunctions.isoTime,
	base: {
		branding: 'brAInwav',
		service: 'brAInwav-egress-proxy',
		version: '1.0.0',
	},
});

// Configuration with environment overrides
const config = {
	...DEFAULT_EGRESS_CONFIG,
	port: parseInt(process.env.BRAINWAV_EGRESS_PORT || '8888', 10),
	maxRequestSize: parseInt(process.env.BRAINWAV_MAX_REQUEST_SIZE || '10485760', 10), // 10MB
	maxResponseSize: parseInt(process.env.BRAINWAV_MAX_RESPONSE_SIZE || '52428800', 10), // 50MB
	timeout: parseInt(process.env.BRAINWAV_TIMEOUT || '30000', 10), // 30s
};

// Policy configuration
const policyMode = process.env.BRAINWAV_POLICY_MODE || 'enforcing';
const policy = {
	...DEFAULT_BRAINWAV_POLICY,
	enforcement: {
		...DEFAULT_BRAINWAV_POLICY.enforcement,
		mode: policyMode as 'enforcing' | 'permissive',
	},
};

async function startBrainwavEgressProxy(): Promise<void> {
	try {
		logger.info(
			{
				branding: 'brAInwav',
				config: {
					port: config.port,
					policyMode,
					maxRequestSize: config.maxRequestSize,
					maxResponseSize: config.maxResponseSize,
					timeout: config.timeout,
				},
			},
			'brAInwav egress proxy starting',
		);

		// Initialize policy engine
		const policyEngine = new PolicyEngine(policy, logger);

		// Initialize egress proxy
		const egressProxy = new EgressProxy(config, policyEngine, logger);

		// Graceful shutdown handling
		const shutdown = async (signal: string) => {
			logger.info(
				{
					branding: 'brAInwav',
					signal,
				},
				'brAInwav egress proxy shutting down',
			);

			try {
				await egressProxy.stop();
				logger.info(
					{
						branding: 'brAInwav',
					},
					'brAInwav egress proxy stopped gracefully',
				);
				process.exit(0);
			} catch (error) {
				logger.error(
					{
						branding: 'brAInwav',
						error: error instanceof Error ? error.message : String(error),
					},
					'brAInwav egress proxy shutdown error',
				);
				process.exit(1);
			}
		};

		// Register signal handlers
		process.on('SIGTERM', () => shutdown('SIGTERM'));
		process.on('SIGINT', () => shutdown('SIGINT'));

		// Handle uncaught exceptions
		process.on('uncaughtException', (error) => {
			logger.fatal(
				{
					branding: 'brAInwav',
					error: error.message,
					stack: error.stack,
				},
				'brAInwav egress proxy uncaught exception',
			);
			process.exit(1);
		});

		process.on('unhandledRejection', (reason, promise) => {
			logger.fatal(
				{
					branding: 'brAInwav',
					reason: String(reason),
					promise: String(promise),
				},
				'brAInwav egress proxy unhandled rejection',
			);
			process.exit(1);
		});

		// Start the proxy
		await egressProxy.start();

		logger.info(
			{
				branding: 'brAInwav',
				port: config.port,
				policyVersion: policy.version,
				enforcementMode: policy.enforcement.mode,
			},
			'brAInwav egress proxy started successfully',
		);

		// Health check endpoint
		const express = await import('express');
		const healthApp = express.default();

		healthApp.get('/health', (_req, res) => {
			res.json({
				status: 'healthy',
				service: 'brAInwav-egress-proxy',
				version: '1.0.0',
				uptime: process.uptime(),
				policy: {
					version: policy.version,
					mode: policy.enforcement.mode,
				},
				branding: 'brAInwav',
			});
		});

		healthApp.get('/stats', (_req, res) => {
			res.json({
				service: 'brAInwav-egress-proxy',
				uptime: process.uptime(),
				memory: process.memoryUsage(),
				policy: {
					version: policy.version,
					mode: policy.enforcement.mode,
					allowedDomains: policy.egress.allowlist.length,
				},
				branding: 'brAInwav',
			});
		});

		// Start health check server on different port
		const healthPort = config.port + 1; // 8889
		healthApp.listen(healthPort, () => {
			logger.info(
				{
					branding: 'brAInwav',
					healthPort,
				},
				'brAInwav egress proxy health endpoint started',
			);
		});
	} catch (error) {
		logger.fatal(
			{
				branding: 'brAInwav',
				error: error instanceof Error ? error.message : String(error),
			},
			'brAInwav egress proxy startup failed',
		);
		process.exit(1);
	}
}

// Start the brAInwav egress proxy
startBrainwavEgressProxy().catch((error) => {
	console.error('brAInwav egress proxy startup error:', error);
	process.exit(1);
});
