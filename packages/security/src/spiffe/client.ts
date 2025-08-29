/**
 * @file SPIFFE Client Implementation
 * @description SPIFFE Workload API client for certificate management and workload attestation
 */

import { z } from 'zod';
import { withSpan, logWithSpan } from '@cortex-os/telemetry';
import {
  CertificateBundle,
  SPIFFEError,
  SpiffeId,
  SpiffeIdSchema,
  SpiffeWorkloadResponseSchema,
  TrustDomainConfig,
  WorkloadIdentity,
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

export async function requestWorkloadIdentity(
  httpClient: ReturnType<typeof axios.create>,
): Promise<unknown> {
  const response = await httpClient.get('/workload/identity');
  return response.data;
}

export function parseWorkloadResponse(data: unknown) {
  return SpiffeWorkloadResponseSchema.parse(data);
}

export function buildWorkloadIdentity(
  workloadResponse: z.infer<typeof SpiffeWorkloadResponseSchema>,
): WorkloadIdentity {
  const workloadPath = extractWorkloadPath(workloadResponse.spiffe_id);
  if (!workloadPath) {
    throw new SPIFFEError('Invalid SPIFFE ID format', workloadResponse.spiffe_id);
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
  private readonly certificateCache: Map<string, CertificateBundle> = new Map();

  constructor(config: TrustDomainConfig) {
    this.config = config;
    this.baseUrl = `http://localhost:${config.spireServerPort}`;
  }

  /**
   * Perform a fetch request with timeout support
   */
  private async fetchWithTimeout(path: string, init?: RequestInit): Promise<Response> {
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
      return response;
    } finally {
      clearTimeout(timeoutId);
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


        const response = await this.fetchWithTimeout('/workload/identity', { method: 'GET' });
          throw new Error(`Failed to fetch workload identity: HTTP ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const workloadResponse = SpiffeWorkloadResponseSchema.parse(data);

        const workloadPath = extractWorkloadPath(workloadResponse.spiffe_id);
        if (!workloadPath) {
          throw new SPIFFEError('Invalid SPIFFE ID format', workloadResponse.spiffe_id);
        }

        const workloadIdentity: WorkloadIdentity = {
          spiffeId: workloadResponse.spiffe_id,
          trustDomain: workloadResponse.trust_domain,
          workloadPath,
          selectors: this.convertSelectors(workloadResponse.selectors || []),
          metadata: {
            fetchedAt: new Date(),
            trustDomain: workloadResponse.trust_domain,
          },
        };


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
            error: error instanceof Error ? error.message : 'Unknown error',
            trustDomain: this.config.name,
          },
          span,
        );

        throw new SPIFFEError(
          `Failed to fetch workload identity: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

        const response = await this.fetchWithTimeout(url.pathname + url.search, { method: 'GET' });
          throw new Error(`Failed to fetch SVID: HTTP ${response.status} ${response.statusText}`);
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

        this.certificateCache.set(svid.spiffe_id, certificateBundle);

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
            error: error instanceof Error ? error.message : 'Unknown error',
            spiffeId: spiffeId || 'default',
          },
          span,
        );

        throw new SPIFFEError(
          `Failed to fetch SVID: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    return this.certificateCache.get(spiffeId);
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

        const response = await this.fetchWithTimeout('/workload/trust-bundle', { method: 'GET' });
          throw new Error(`Failed to fetch trust bundle: HTTP ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const trustBundleResponse = z
          .object({
            trust_bundle: z.string(),
          })
          .parse(data);


        const certificates = this.splitPEMCertificates(trustBundleResponse.trust_bundle);


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
            error: error instanceof Error ? error.message : 'Unknown error',
            trustDomain: this.config.name,
          },
          span,
        );

        throw new SPIFFEError(
          `Failed to fetch trust bundle: ${error instanceof Error ? error.message : 'Unknown error'}`,
          undefined,
          { trustDomain: this.config.name, originalError: error },
        );
      }
    });
  }
}
