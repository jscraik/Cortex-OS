/**
 * @file Workload Identity Management
 * @description Workload identity attestation and management for SPIFFE/SPIRE
 */

import { withSpan, logWithSpan } from '@cortex-os/telemetry';
import {
  SpiffeId,
  WorkloadIdentity,
  WorkloadIdentityError,
  WorkloadIdentitySchema,
} from '../types.ts';
import { extractTrustDomain, extractWorkloadPath } from '../utils/security-utils.ts';

/**
 * Workload Identity Manager
 * Handles workload identity attestation and management
 */
export class WorkloadIdentityManager {
  private readonly identities = new Map<string, WorkloadIdentity>();
  private readonly attestationCache = new Map<
    string,
    { identity: WorkloadIdentity; expiresAt: number }
  >();

  /**
   * Attest a workload identity
   */
  async attestWorkload(spiffeId: SpiffeId): Promise<WorkloadIdentity> {
    return withSpan('workload-identity.attest', async () => {
      try {
        logWithSpan('info', 'Attesting workload identity', {
          spiffeId,
        });

        // Check cache first
        const cached = this.attestationCache.get(spiffeId);
        if (cached && cached.expiresAt > Date.now()) {
          logWithSpan('debug', 'Using cached workload identity', {
            spiffeId,
            cacheExpiresAt: new Date(cached.expiresAt).toISOString(),
          });
          return cached.identity;
        }

        const trustDomain = extractTrustDomain(spiffeId);
        const workloadPath = extractWorkloadPath(spiffeId);
        if (!trustDomain || !workloadPath) {
          throw new WorkloadIdentityError(`Invalid SPIFFE ID format: ${spiffeId}`);
        }

        // Create workload identity
        const identity: WorkloadIdentity = {
          spiffeId,
          trustDomain,
          workloadPath,
          selectors: {
            spiffe_id: spiffeId,
            trust_domain: trustDomain,
          },
          metadata: {
            attestedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
          },
        };

        // Validate the identity
        const validatedIdentity = WorkloadIdentitySchema.parse(identity);

        // Cache the attested identity
        this.attestationCache.set(spiffeId, {
          identity: validatedIdentity,
          expiresAt: Date.now() + 3600000, // 1 hour
        });

        // Store in identities map
        this.identities.set(spiffeId, validatedIdentity);

        logWithSpan('info', 'Workload identity attested successfully', {
          spiffeId,
          trustDomain,
          workloadPath,
        });

        return await Promise.resolve(validatedIdentity);
      } catch (error) {
        logWithSpan('error', 'Failed to attest workload identity', {
          spiffeId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        throw new WorkloadIdentityError(
          `Failed to attest workload identity: ${error instanceof Error ? error.message : 'Unknown error'}`,
          undefined,
          { spiffeId, originalError: error },
        );
      }
    });
  }

  /**
   * Get a workload identity by SPIFFE ID
   */
  getWorkloadIdentity(spiffeId: SpiffeId): WorkloadIdentity | null {
    return this.identities.get(spiffeId) || null;
  }

  /**
   * List all attested workload identities
   */
  listWorkloadIdentities(): WorkloadIdentity[] {
    return Array.from(this.identities.values());
  }

  /**
   * Revoke a workload identity
   */
  revokeWorkloadIdentity(spiffeId: SpiffeId): boolean {
    const removed = this.identities.delete(spiffeId);
    this.attestationCache.delete(spiffeId);

    if (removed) {
      logWithSpan('info', 'Workload identity revoked', {
        spiffeId,
      });
    }

    return removed;
  }

  /**
   * Validate workload identity selectors
   */
  validateSelectors(spiffeId: SpiffeId, requiredSelectors: Record<string, string>): boolean {
    const identity = this.identities.get(spiffeId);
    if (!identity) {
      return false;
    }

    // Check if all required selectors are present and match
    for (const [key, expectedValue] of Object.entries(requiredSelectors)) {
      const actualValue = identity.selectors[key];
      if (actualValue !== expectedValue) {
        logWithSpan('debug', 'Selector validation failed', {
          spiffeId,
          selector: key,
          expected: expectedValue,
          actual: actualValue,
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Clear all cached attestations
   */
  clearCache(): void {
    this.attestationCache.clear();
    logWithSpan('info', 'Workload identity cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalIdentities: number;
    cachedAttestations: number;
    cacheSize: number;
  } {
    return {
      totalIdentities: this.identities.size,
      cachedAttestations: this.attestationCache.size,
      cacheSize: this.attestationCache.size,
    };
  }
}

/**
 * Workload Identity Attestor
 * Handles the attestation process for workloads
 */
export interface WorkloadAPIClient {
  attestWorkload(spiffeId: SpiffeId): Promise<WorkloadIdentity>;
}

export class WorkloadIdentityAttestor {
  private readonly manager: WorkloadIdentityManager;
  private readonly apiClient?: WorkloadAPIClient;

  constructor(manager: WorkloadIdentityManager, apiClient?: WorkloadAPIClient) {
    this.manager = manager;
    this.apiClient = apiClient;
  }

  /**
   * Attest workload using SPIFFE Workload API
   */
  async attestWithWorkloadAPI(spiffeId: SpiffeId): Promise<WorkloadIdentity> {
    return withSpan('workload-attestor.attest-api', async () => {
      try {
        logWithSpan('info', 'Attesting workload via Workload API', {
          spiffeId,
        });

        if (!this.apiClient) {
          throw new WorkloadIdentityError('Workload API client not configured', spiffeId);
        }

        return await this.apiClient.attestWorkload(spiffeId);
      } catch (error) {
        logWithSpan('error', 'Workload API attestation failed', {
          spiffeId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        throw new WorkloadIdentityError(
          `Workload API attestation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          undefined,
          { spiffeId, originalError: error },
        );
      }
    });
  }

  /**
   * Batch attest multiple workloads
   */
  async batchAttest(spiffeIds: SpiffeId[]): Promise<Map<SpiffeId, WorkloadIdentity>> {
    return withSpan('workload-attestor.batch-attest', async () => {
      const results = new Map<SpiffeId, WorkloadIdentity>();

      logWithSpan('info', 'Starting batch workload attestation', {
        count: spiffeIds.length,
      });

      for (const spiffeId of spiffeIds) {
        try {
          const identity = await this.manager.attestWorkload(spiffeId);
          results.set(spiffeId, identity);
        } catch (error) {
          logWithSpan('error', 'Failed to attest workload in batch', {
            spiffeId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue with other workloads even if one fails
        }
      }

      logWithSpan('info', 'Batch workload attestation completed', {
        requested: spiffeIds.length,
        successful: results.size,
      });

      return results;
    });
  }
}
