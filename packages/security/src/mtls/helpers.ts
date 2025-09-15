import * as fs from 'fs/promises';
import * as tls from 'tls';
import { logWithSpan } from '@cortex-os/telemetry';
import { type MTLSConfig, MTLSError } from '../types.js';

export interface CertificateSet {
	ca: string;
	cert: string;
	key: string;
}

export async function loadCertificates(
	config: MTLSConfig,
): Promise<CertificateSet> {
	const [ca, cert, key] = await Promise.all([
		fs.readFile(config.caCertificate, 'utf8'),
		fs.readFile(config.clientCertificate, 'utf8'),
		fs.readFile(config.clientKey, 'utf8'),
	]);
	return { ca, cert, key };
}

export function createClientSocket(
	host: string,
	port: number,
	config: MTLSConfig,
	certs: CertificateSet,
): Promise<tls.TLSSocket> {
	return new Promise((resolve, reject) => {
		const socket = tls.connect({
			host,
			port,
			ca: certs.ca,
			cert: certs.cert,
			key: certs.key,
			servername: config.serverName,
			rejectUnauthorized: config.rejectUnauthorized,
			minVersion: config.minVersion,
			maxVersion: config.maxVersion,
			requestCert: true,
			checkServerIdentity: (h, cert) => {
				if (config.serverName && cert.subject.CN !== config.serverName) {
					return new Error(
						`Server certificate CN mismatch: expected ${config.serverName}, got ${cert.subject.CN}`,
					);
				}
				return tls.checkServerIdentity(h, cert);
			},
		});

		socket.on('secureConnect', () => {
			logWithSpan('info', 'mTLS connection established successfully', {
				host,
				port,
				authorized: socket.authorized,
				authorizationError: socket.authorizationError?.message,
			});
			resolve(socket);
		});

		socket.on('error', (error) => {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			logWithSpan('error', 'mTLS connection failed', {
				error: errorMessage,
				host,
				port,
			});
			reject(
				new MTLSError(`mTLS connection failed: ${errorMessage}`, undefined, {
					host,
					port,
					originalError: error,
				}),
			);
		});
	});
}
