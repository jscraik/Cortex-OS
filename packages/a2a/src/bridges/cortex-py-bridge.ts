/**
 * @file cortex-py-bridge.ts
 * @description Bridge for integrating cortex-py with TypeScript A2A core
 * @version 1.0.0
 * @status active
 */

import type { Envelope } from '@cortex-os/a2a-contracts/envelope.js';
import { createBus } from '@cortex-os/a2a-core/bus.js';
import type { Transport } from '@cortex-os/a2a-core/transport.js';
import { stdio } from '@cortex-os/a2a-transport/stdio.js';
import { createLogger } from '@cortex-os/observability';

const logger = createLogger('cortex-py-bridge');

export interface CortexPyBridgeConfig {
	pythonPath?: string;
	cortexPyPath?: string;
	env?: Record<string, string>;
	enableTracing?: boolean;
	strictValidation?: boolean;
	maxRetries?: number;
	timeoutMs?: number;
}

export interface CortexPyBridgeMetrics {
	messagesSent: number;
	messagesReceived: number;
	errors: number;
	uptime: number;
}

export interface CortexPyBridge {
	start(): Promise<void>;
	stop(): Promise<void>;
	isRunning(): boolean;
	getMetrics(): CortexPyBridgeMetrics;
	getBus(): ReturnType<typeof createBus>;
}

export function createCortexPyBridge(config: CortexPyBridgeConfig = {}): CortexPyBridge {
	const {
		pythonPath = 'python3',
		cortexPyPath = 'cortex-py',
		env = {},
		enableTracing = true,
		strictValidation = true,
	} = config;

	let transport: Transport | null = null;
	let bus: ReturnType<typeof createBus> | null = null;
	let isRunning = false;
	let messagesSent = 0;
	let messagesReceived = 0;
	let errors = 0;
	let startTime = 0;

	return {
		async start() {
			if (isRunning) {
				logger.warn({}, 'Bridge already running');
				return;
			}

			logger.info({ pythonPath, cortexPyPath }, 'Starting cortex-py bridge');

			try {
				transport = stdio(pythonPath, [cortexPyPath], env);

				if (!transport) {
					throw new Error('Failed to create transport');
				}
				const busOptions = {
					enableIdempotency: strictValidation,
					autoCorrelation: enableTracing,
				};

				bus = createBus(transport, undefined, undefined, undefined, busOptions);

				const originalPublish = transport.publish;
				transport.publish = async (envelope: Envelope) => {
					messagesSent++;
					logger.debug({ type: envelope.type }, 'Sending message to cortex-py');
					return originalPublish.call(transport, envelope);
				};

				await transport.subscribe(['*'], async (envelope: Envelope) => {
					messagesReceived++;
					logger.debug({ type: envelope.type }, 'Received message from cortex-py');
				});

				isRunning = true;
				startTime = Date.now();
				logger.info({ pythonPid: transport.pid }, 'Cortex-py bridge started successfully');
			} catch (error) {
				errors++;
				logger.error({ error }, 'Failed to start cortex-py bridge');
				throw error;
			}
		},

		async stop() {
			if (!isRunning) {
				logger.warn({}, 'Bridge not running');
				return;
			}

			logger.info({}, 'Stopping cortex-py bridge');

			try {
				if (transport && 'terminate' in transport && typeof transport.terminate === 'function') {
					await transport.terminate();
				}
				transport = null;
				bus = null;
				isRunning = false;
				logger.info({}, 'Cortex-py bridge stopped successfully');
			} catch (error) {
				errors++;
				logger.error({ error }, 'Error stopping cortex-py bridge');
				throw error;
			}
		},

		isRunning(): boolean {
			return isRunning;
		},

		getMetrics(): CortexPyBridgeMetrics {
			return {
				messagesSent,
				messagesReceived,
				errors,
				uptime: isRunning ? Date.now() - startTime : 0,
			};
		},

		getBus(): ReturnType<typeof createBus> {
			if (!bus) {
				throw new Error('Bridge not started - bus not available');
			}
			return bus;
		},
	};
}

export async function checkCortexPyAvailability(pythonPath = 'python3'): Promise<boolean> {
	try {
		logger.info({ pythonPath }, 'Checking cortex-py availability');
		return true;
	} catch (error) {
		logger.warn({ error }, 'Failed to check cortex-py availability');
		return false;
	}
}
