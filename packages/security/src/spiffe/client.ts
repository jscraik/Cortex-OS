// Shared fallback message to reduce literal duplication and satisfy lint rule
const UNKNOWN_ERROR_MESSAGE = 'Unknown error';

/**
 * @file SPIFFE Client Implementation
 * @description SPIFFE Workload API client for certificate management and workload attestation
 */

import { logWithSpan, withSpan } from '@cortex-os/telemetry';
// Using global WHATWG fetch; remove Undici-specific Agent to simplify typing for dts build
import { z } from 'zod';
import {
	type CertificateBundle,
	SPIFFEError,
	type SpiffeId,
	SpiffeIdSchema,
	SpiffeWorkloadResponseSchema,
	type TrustDomainConfig,
	type WorkloadIdentity,
} from '../types.js';
import { extractWorkloadPath } from '../utils/security-utils.ts';

export function convertSelectors(
	selectors: Array<{ type?: string; value?: string }>,
): Record<string, string> {
	const result: Record<string, string> = {};
	selectors.forEach((selector) => {
		if (selector.type && selector.value) {
			result[selector.type] = selector.value;
		}
	});
	return result;
}

export function buildWorkloadIdentity(
	workloadResponse: z.infer<typeof SpiffeWorkloadResponseSchema>,
): WorkloadIdentity {
	const workloadPath = extractWorkloadPath(workloadResponse.spiffe_id);
	if (!workloadPath) {
		throw new SPIFFEError(
			'Invalid SPIFFE ID format',
			workloadResponse.spiffe_id,
		);
	}

	return {
		spiffeId: workloadResponse.spiffe_id,
		trustDomain: workloadResponse.trust_domain,
		workloadPath,
		selectors: convertSelectors(workloadResponse.selectors || []),
		metadata: {
			fetchedAt: new Date(),
			trustDomain: workloadResponse.trust_domain,
		},
	};
}

export function splitPEMCertificates(pemChain: string): string[] {
	const certificates: string[] = [];
	const lines = pemChain.split('\n');
	let currentCert: string[] = [];

	for (const line of lines) {
		if (line.includes('-----BEGIN CERTIFICATE-----')) {
			currentCert = [line];
		} else if (line.includes('-----END CERTIFICATE-----')) {
			currentCert.push(line);
			certificates.push(currentCert.join('\n'));
			currentCert = [];
		} else if (currentCert.length > 0) {
			currentCert.push(line);
		}
	}

	return certificates;
}

/**
 * SPIFFE Workload API Client
 * Implements the SPIFFE Workload API for certificate retrieval and workload attestation
 */
export class SpiffeClient {
	private readonly baseUrl: string;
	private readonly timeout = 10000;
	private readonly config: TrustDomainConfig;
	private readonly certificateCache: Map<
		string,
		{ bundle: CertificateBundle; expiresAt: number }
	> = new Map();
	private readonly certificateTtl: number;
	// TLS cert material retained for potential future https.Agent usage (not bound now)

	constructor(config: TrustDomainConfig, certificateTtl = 3600000) {
		this.config = config;
		this.certificateTtl = certificateTtl;
		this.baseUrl = `https://${config.spireServerAddress}:${config.spireServerPort}`;

		// (Optional) If mutual TLS to SPIRE server is required via node https Agent, introduce it here.
	}

	/**
	 * Perform a fetch request with timeout support
	 */
	private async fetchWithTimeout(
		path: string,
		init?: RequestInit,
	): Promise<Response> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeout);
		try {
			const response = await fetch(`${this.baseUrl}${path}`, {
				...init,
				signal: controller.signal,
				headers: {
					'Content-Type': 'application/json',
					...(init?.headers || {}),
				},
			});
			// Provide a minimal bytes() polyfill if absent (some environments use undici Response with bytes method)
			if (!(response as any).bytes) {
				(response as any).bytes = async () => {
					const arrayBuffer = await response.arrayBuffer();
					return Buffer.from(arrayBuffer);
				};
			}
			return response;
		} finally {
			clearTimeout(timeoutId);
		}
	}

	/**
	 * Perform fetch with retry and exponential backoff
	 */
	private async fetchWithRetry(
		path: string,
		init?: RequestInit,
		retries = 3,
	): Promise<Response> {
		let attempt = 0;
		let delay = 500;

		while (true) {
			try {
				const res = await this.fetchWithTimeout(path, init);
				if (!res.ok && res.status >= 500 && attempt < retries) {
					throw new Error(`HTTP ${res.status}`);
				}
				return res;
			} catch (error) {
				if (attempt >= retries) {
					throw error;
				}
				await new Promise((r) => setTimeout(r, delay));
				delay *= 2;
				attempt++;
			}
		}
	}

	/**
	 * Fetch workload identity and certificates from SPIFFE Workload API
	 */
	async fetchWorkloadIdentity(): Promise<WorkloadIdentity> {
		return withSpan('spiffe.fetchWorkloadIdentity', async (span) => {
			try {
				logWithSpan(
					'info',
					'Fetching workload identity from SPIFFE Workload API',
					{
						trustDomain: this.config.name,
					},
					span,
				);

				const response = await this.fetchWithRetry('/workload/identity', {
					method: 'GET',
				});
				if (!response.ok) {
					throw new Error(
						`Failed to fetch workload identity: HTTP ${response.status} ${response.statusText}`,
					);
				}
				const data = await response.json();
				const workloadResponse = SpiffeWorkloadResponseSchema.parse(data);

				const workloadIdentity = buildWorkloadIdentity(workloadResponse);

				logWithSpan(
					'info',
					'Successfully fetched workload identity',
					{
						spiffeId: workloadIdentity.spiffeId,
						trustDomain: workloadIdentity.trustDomain,
					},
					span,
				);

				return workloadIdentity;
			} catch (error) {
				logWithSpan(
					'error',
					'Failed to fetch workload identity',
					{
						error:
							error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE,
						trustDomain: this.config.name,
					},
					span,
				);

				throw new SPIFFEError(
					`Failed to fetch workload identity: ${
						error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE
					}`,
					undefined,
					{ trustDomain: this.config.name, originalError: error },
				);
			}
		});
	}

	/**
	 * Fetch SVID (SPIFFE Verifiable Identity Document) certificates
	 */
	async fetchSVID(spiffeId?: SpiffeId): Promise<CertificateBundle> {
		return withSpan('spiffe.fetchSVID', async (span) => {
			try {
				const url = new URL('/workload/svid', this.baseUrl);
				if (spiffeId) {
					url.searchParams.set('spiffe_id', spiffeId);
				}

				logWithSpan(
					'info',
					'Fetching SVID certificates',
					{
						spiffeId: spiffeId || 'default',
						trustDomain: this.config.name,
					},
					span,
				);

				const response = await this.fetchWithRetry(url.pathname + url.search, {
					method: 'GET',
				});
				if (!response.ok) {
					throw new Error(
						`Failed to fetch SVID: HTTP ${response.status} ${response.statusText}`,
					);
				}
				const data = await response.json();
				const svidResponse = z
					.object({
						svids: z.array(
							z.object({
								spiffe_id: SpiffeIdSchema,
								certificate: z.string(),
								private_key: z.string(),
								bundle: z.string(),
							}),
						),
					})
					.parse(data);

				if (svidResponse.svids.length === 0) {
					throw new SPIFFEError('No SVIDs returned from SPIFFE Workload API');
				}

				const svid = svidResponse.svids[0];

				const certificateBundle: CertificateBundle = {
					certificates: [svid.certificate],
					privateKey: svid.private_key,
					trustBundle: [svid.bundle],
				};

				this.certificateCache.set(svid.spiffe_id, {
					bundle: certificateBundle,
					expiresAt: Date.now() + this.certificateTtl,
				});

				logWithSpan(
					'info',
					'Successfully fetched SVID certificates',
					{
						spiffeId: svid.spiffe_id,
						certificateCount: certificateBundle.certificates.length,
					},
					span,
				);

				return certificateBundle;
			} catch (error) {
				logWithSpan(
					'error',
					'Failed to fetch SVID certificates',
					{
						error:
							error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE,
						spiffeId: spiffeId || 'default',
					},
					span,
				);

				throw new SPIFFEError(
					`Failed to fetch SVID: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`,
					spiffeId,
					{ originalError: error },
				);
			}
		});
	}

	/**
	 * Get cached certificate bundle
	 */
	getCachedCertificate(spiffeId: SpiffeId): CertificateBundle | undefined {
		const entry = this.certificateCache.get(spiffeId);
		if (entry && entry.expiresAt > Date.now()) {
			return entry.bundle;
		}
		if (entry) {
			this.certificateCache.delete(spiffeId);
		}
		return undefined;
	}

	/**
	 * Clear certificate cache
	 */
	clearCertificateCache(): void {
		this.certificateCache.clear();
		logWithSpan('info', 'Certificate cache cleared', {
			trustDomain: this.config.name,
		});
	}

	/**
	 * Validate SPIFFE ID format
	 */
	validateSpiffeId(spiffeId: string): boolean {
		return SpiffeIdSchema.safeParse(spiffeId).success;
	}

	/**
	 * Get trust bundle from SPIFFE Workload API
	 */
	async fetchTrustBundle(): Promise<string[]> {
		return withSpan('spiffe.fetchTrustBundle', async (span) => {
			try {
				logWithSpan(
					'info',
					'Fetching trust bundle',
					{
						trustDomain: this.config.name,
					},
					span,
				);

				const response = await this.fetchWithRetry('/workload/trust-bundle', {
					method: 'GET',
				});
				if (!response.ok) {
					throw new Error(
						`Failed to fetch trust bundle: HTTP ${response.status} ${response.statusText}`,
					);
				}
				const data = await response.json();
				const trustBundleResponse = z
					.object({
						trust_bundle: z.string(),
					})
					.parse(data);

				const certificates = splitPEMCertificates(
					trustBundleResponse.trust_bundle,
				);

				logWithSpan(
					'info',
					'Successfully fetched trust bundle',
					{
						certificateCount: certificates.length,
						trustDomain: this.config.name,
					},
					span,
				);

				return certificates;
			} catch (error) {
				logWithSpan(
					'error',
					'Failed to fetch trust bundle',
					{
						error:
							error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE,
						trustDomain: this.config.name,
					},
					span,
				);

				throw new SPIFFEError(
					`Failed to fetch trust bundle: ${
						error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE
					}`,
					undefined,
					{ trustDomain: this.config.name, originalError: error },
				);
			}
		});
	}
}
