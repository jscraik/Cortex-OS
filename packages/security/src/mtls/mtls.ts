/**
 * @file mTLS Implementation
 * @description Mutual TLS implementation for secure service-to-service communication
 */

import * as tls from 'node:tls';
import { logWithSpan, withSpan } from '@cortex-os/telemetry';
import { type MTLSConfig, MTLSConfigSchema, MTLSError } from '../types.js';
import { createClientSocket, loadCertificates } from './helpers.js';

// Centralized unknown error fallback to avoid repeated literal and satisfy lint rule
const UNKNOWN_ERROR_MESSAGE = 'Unknown error';

/**
 * mTLS Client for secure service-to-service communication
 */
export class MTLSClient {
	private readonly config: MTLSConfig;
	private tlsSocket?: tls.TLSSocket;

	constructor(config: MTLSConfig) {
		try {
			this.config = MTLSConfigSchema.parse(config);
		} catch (error) {
			throw new MTLSError(
				`Invalid mTLS configuration: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`,
				undefined,
				{ originalError: error },
			);
		}
	}

	/**
	 * Establish mTLS connection to a server
	 */
	async connect(host: string, port: number): Promise<void> {
		return withSpan('mtls.connect', async () => {
			try {
				logWithSpan('info', 'Establishing mTLS connection', {
					host,
					port,
					serverName: this.config.serverName ?? '',
				});

				const certs = await loadCertificates(this.config);
				this.tlsSocket = await createClientSocket(host, port, this.config, certs);
			} catch (error) {
				logWithSpan('error', 'Failed to establish mTLS connection', {
					error: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE,
					host,
					port,
				});

				throw new MTLSError(
					`Failed to establish mTLS connection: ${
						error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE
					}`,
					undefined,
					{ host, port, originalError: error },
				);
			}
		});
	}

	/**
	 * Send data over the mTLS connection
	 */
	async send(data: Buffer | string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.tlsSocket) {
				reject(new MTLSError('No active mTLS connection'));
				return;
			}

			this.tlsSocket.write(data, (error) => {
				if (error) {
					reject(
						new MTLSError(`Failed to send data: ${error.message}`, undefined, {
							originalError: error,
						}),
					);
				} else {
					resolve(void 0);
				}
			});
		});
	}

	/**
	 * Receive data from the mTLS connection
	 */
	async receive(): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			if (!this.tlsSocket) {
				reject(new MTLSError('No active mTLS connection'));
				return;
			}

			const chunks: Buffer[] = [];

			const onData = (chunk: Buffer) => {
				chunks.push(chunk);
			};

			const onEnd = () => {
				cleanup();
				resolve(Buffer.concat(chunks));
			};

			const onError = (error: Error) => {
				cleanup();
				reject(
					new MTLSError(`Failed to receive data: ${error.message}`, undefined, {
						originalError: error,
					}),
				);
			};

			const cleanup = () => {
				this.tlsSocket?.removeListener('data', onData);
				this.tlsSocket?.removeListener('end', onEnd);
				this.tlsSocket?.removeListener('error', onError);
			};

			this.tlsSocket.on('data', onData);
			this.tlsSocket.once('end', onEnd);
			this.tlsSocket.once('error', onError);
		});
	}

	/**
	 * Close the mTLS connection
	 */
	async close(): Promise<void> {
		return new Promise((resolve) => {
			if (!this.tlsSocket) {
				resolve(void 0);
				return;
			}

			this.tlsSocket.end(() => {
				this.tlsSocket = undefined;
				logWithSpan('info', 'mTLS connection closed');
				resolve(void 0);
			});
		});
	}

	/**
	 * Get connection information
	 */
	getConnectionInfo(): {
		authorized: boolean;
		authorizationError?: string;
		peerCertificate?: tls.PeerCertificate;
		cipher?: tls.CipherNameAndProtocol;
	} | null {
		if (!this.tlsSocket) {
			return null;
		}

		return {
			authorized: this.tlsSocket.authorized,
			authorizationError: this.tlsSocket.authorizationError?.message,
			peerCertificate: this.tlsSocket.getPeerCertificate(),
			cipher: this.tlsSocket.getCipher(),
		};
	}
}

/**
 * mTLS Server for accepting secure connections
 */
export class MTLSServer {
	private readonly config: MTLSConfig;
	private readonly connectionHandler?: (socket: tls.TLSSocket) => void;
	private server?: tls.Server;

	constructor(config: MTLSConfig, connectionHandler?: (socket: tls.TLSSocket) => void) {
		try {
			this.config = MTLSConfigSchema.parse(config);
			this.connectionHandler = connectionHandler;
		} catch (error) {
			throw new MTLSError(
				`Invalid mTLS configuration: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`,
				undefined,
				{ originalError: error },
			);
		}
	}

	/**
	 * Start the mTLS server
	 */
	async listen(port: number, host = '0.0.0.0'): Promise<void> {
		return withSpan('mtls.listen', async () => {
			try {
				logWithSpan('info', 'Starting mTLS server', {
					host,
					port,
				});

				const certs = await loadCertificates(this.config);

				return new Promise((resolve, reject) => {
					this.server = tls.createServer({
						ca: certs.ca,
						cert: certs.cert,
						key: certs.key,
						requestCert: true,
						rejectUnauthorized: this.config.rejectUnauthorized,
						minVersion: this.config.minVersion,
						maxVersion: this.config.maxVersion,
					});

					this.server.on('secureConnection', (socket) => {
						logWithSpan('info', 'Secure connection established', {
							remoteAddress: socket.remoteAddress ?? '',
							remotePort: socket.remotePort ?? 0,
							authorized: socket.authorized,
							authorizationError: socket.authorizationError?.message ?? '',
						});

						this.handleSecureConnection(socket);
					});

					this.server.on('error', (error) => {
						const errorMessage = error instanceof Error ? error.message : 'Unknown error';
						logWithSpan('error', 'mTLS server error', {
							error: errorMessage,
							host,
							port,
						});
						reject(
							new MTLSError(`mTLS server error: ${errorMessage}`, undefined, {
								host,
								port,
								originalError: error,
							}),
						);
					});

					this.server.listen(port, host, () => {
						logWithSpan('info', 'mTLS server listening', {
							host,
							port,
						});
						resolve(void 0);
					});
				});
			} catch (error) {
				logWithSpan('error', 'Failed to start mTLS server', {
					error: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE,
					host,
					port,
				});

				throw new MTLSError(
					`Failed to start mTLS server: ${
						error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE
					}`,
					undefined,
					{ host, port, originalError: error },
				);
			}
		});
	}

	/**
	 * Handle secure connection
	 */
	private handleSecureConnection(socket: tls.TLSSocket): void {
		this.connectionHandler?.(socket);

		socket.on('error', (error) => {
			const errorMessage = error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
			logWithSpan('error', 'Secure connection error', {
				error: errorMessage,
				remoteAddress: socket.remoteAddress ?? '',
			});
		});

		socket.on('close', () => {
			logWithSpan('info', 'Secure connection closed', {
				remoteAddress: socket.remoteAddress ?? '',
			});
		});
	}

	/**
	 * Close the mTLS server
	 */
	async close(): Promise<void> {
		return new Promise((resolve) => {
			if (!this.server) {
				resolve(void 0);
				return;
			}

			this.server.close(() => {
				this.server = undefined;
				logWithSpan('info', 'mTLS server closed');
				resolve(void 0);
			});
		});
	}
}
