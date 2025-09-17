/**
 * @file cortex-py-bridge.ts
 * @description Bridge for integrating cortex-py with TypeScript A2A core
 * @version 1.0.0
 * @status active
 */

import { createLogger } from '@cortex-os/observability';
import type { Envelope } from '../a2a-contracts/src/envelope.js';
import { createBus } from '../a2a-core/src/bus.js';
import type { Transport } from '../a2a-core/src/transport.js';
import { stdio } from '../a2a-transport/src/stdio.js';

const logger = createLogger('cortex-py-bridge');

export interface CortexPyBridgeConfig {
	/**
	 * Path to Python executable (default: python3)
	 */
	pythonPath?: string;

	/**
	 * Path to cortex-py application directory
	 */
	cortexPyPath?: string;

	/**
	 * Additional environment variables for Python process
	 */
	env?: Record<string, string>;

	/**
	 * Bus options for A2A core integration
	 */
	busOptions?: {
		enableTracing?: boolean;
		strictValidation?: boolean;
	};
}

export interface CortexPyBridge {
	/**
	 * Get the underlying A2A bus for direct access
	 */
	getBus(): any;

	/**
	 * Get the stdio transport for the Python process
	 */
	getTransport(): Transport & { terminate: () => Promise<void> };

	/**
	 * Start the bridge and Python process
	 */
	start(): Promise<void>;

	/**
	 * Stop the bridge and terminate Python process
	 */
	stop(): Promise<void>;

	/**
	 * Check if the bridge is running
	 */
	isRunning(): boolean;

	/**
	 * Get bridge statistics
	 */
	getStats(): {
		isRunning: boolean;
		pythonPid: number | null;
		messagesSent: number;
		messagesReceived: number;
	};
}

/**
 * Create a bridge to integrate cortex-py with TypeScript A2A core
 */
export function createCortexPyBridge(
	config: CortexPyBridgeConfig = {},
): CortexPyBridge {
	const {
		pythonPath = 'python3',
		cortexPyPath = process.cwd(),
		env = {},
		busOptions = {
			enableTracing: true,
			strictValidation: true,
		},
	} = config;

	let transport: (Transport & { terminate: () => Promise<void> }) | null = null;
	let bus: any = null;
	let isRunning = false;
	let messagesSent = 0;
	let messagesReceived = 0;

	const bridgeImpl: CortexPyBridge = {
		getBus() {
			if (!bus) {
				throw new Error('Bridge not started. Call start() first.');
			}
			return bus;
		},

		getTransport() {
			if (!transport) {
				throw new Error('Bridge not started. Call start() first.');
			}
			return transport;
		},

		async start() {
			if (isRunning) {
				logger.warn('Bridge already running');
				return;
			}

			logger.info('Starting cortex-py bridge', {
				pythonPath,
				cortexPyPath,
			});

			try {
				// Create stdio transport that spawns cortex-py with stdio bridge mode
				transport = stdio(pythonPath, ['-m', 'cortex_py.a2a.stdio_bridge'], {
					...env,
					PYTHONPATH: cortexPyPath,
					// Ensure cortex-py runs in stdio bridge mode
					CORTEX_PY_A2A_MODE: 'stdio',
				});

				// Create A2A bus with the stdio transport
				bus = createBus(transport, undefined, undefined, undefined, busOptions);

				// Track message statistics
				const originalPublish = transport.publish;
				transport.publish = async (envelope: Envelope) => {
					messagesSent++;
					logger.debug('Sending message to cortex-py', { type: envelope.type });
					return originalPublish.call(transport, envelope);
				};

				// Subscribe to all messages from cortex-py to track received messages
				await transport.subscribe(['*'], async (envelope: Envelope) => {
					messagesReceived++;
					logger.debug('Received message from cortex-py', {
						type: envelope.type,
					});
				});

				isRunning = true;
				logger.info('Cortex-py bridge started successfully', {
					pythonPid: transport.pid,
				});
			} catch (error) {
				logger.error('Failed to start cortex-py bridge', { error });
				throw error;
			}
		},

		async stop() {
			if (!isRunning) {
				logger.warn('Bridge not running');
				return;
			}

			logger.info('Stopping cortex-py bridge');

			try {
				if (transport) {
					await transport.terminate();
					transport = null;
				}
				bus = null;
				isRunning = false;
				logger.info('Cortex-py bridge stopped successfully');
			} catch (error) {
				logger.error('Error stopping cortex-py bridge', { error });
				throw error;
			}
		},

		isRunning() {
			return isRunning;
		},

		getStats() {
			return {
				isRunning,
				pythonPid: transport?.pid || null,
				messagesSent,
				messagesReceived,
			};
		},
	};

	return bridgeImpl;
}

/**
 * Factory function to create and start a cortex-py bridge
 */
export async function createAndStartCortexPyBridge(
	config: CortexPyBridgeConfig = {},
): Promise<CortexPyBridge> {
	const bridge = createCortexPyBridge(config);
	await bridge.start();
	return bridge;
}

/**
 * Utility to check if cortex-py is available and can be started
 */
export async function checkCortexPyAvailability(
	config: CortexPyBridgeConfig = {},
): Promise<boolean> {
	const { pythonPath = 'python3' } = config;

	try {
		const { spawn } = await import('node:child_process');
		const child = spawn(
			pythonPath,
			['-c', 'import cortex_py.a2a.stdio_bridge; print("OK")'],
			{
				stdio: ['pipe', 'pipe', 'pipe'],
			},
		);

		return new Promise((resolve) => {
			let output = '';
			child.stdout.on('data', (data) => {
				output += data.toString();
			});

			child.on('close', (code) => {
				resolve(code === 0 && output.includes('OK'));
			});

			child.on('error', () => {
				resolve(false);
			});

			// Timeout after 5 seconds
			setTimeout(() => {
				child.kill();
				resolve(false);
			}, 5000);
		});
	} catch (error) {
		logger.warn('Failed to check cortex-py availability', { error });
		return false;
	}
}
