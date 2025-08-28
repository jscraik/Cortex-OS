import { createHash, createVerify } from 'crypto';
import { ServerManifest, RegistryIndex } from '@cortex-os/mcp-registry/types';

export interface SecurityConfig {
  verifySignatures: boolean;
  allowUnverifiedPublishers: boolean;
  maxRiskLevel: 'low' | 'medium' | 'high';
  trustedPublishers: string[];
}

export interface SecurityValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  riskAssessment: 'low' | 'medium' | 'high';
}

export class SecurityValidator {
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  async validateServer(server: ServerManifest): Promise<SecurityValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let valid = true;

    // Check risk level
    const riskLevel = server.security?.riskLevel || 'medium';
    if (this.isRiskLevelTooHigh(riskLevel)) {
      errors.push(`Risk level ${riskLevel} exceeds maximum allowed (${this.config.maxRiskLevel})`);
      valid = false;
    }

    // Check publisher verification
    if (!server.security?.verifiedPublisher && !this.config.allowUnverifiedPublishers) {
      errors.push('Server publisher is not verified');
      valid = false;
    }

    // Check trusted publishers
    if (
      this.config.trustedPublishers.length > 0 &&
      !this.config.trustedPublishers.includes(server.owner)
    ) {
      warnings.push('Publisher is not in trusted list');
    }

    // Validate signature if configured
    if (this.config.verifySignatures && server.security?.sigstoreBundle) {
      try {
        const signatureValid = await this.validateSignature(server);
        if (!signatureValid) {
          errors.push('Server signature validation failed');
          valid = false;
        }
      } catch (error) {
        warnings.push(
          `Signature validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Check for security best practices
    this.checkSecurityBestPractices(server, warnings);

    return {
      valid,
      warnings,
      errors,
      riskAssessment: this.assessOverallRisk(server, warnings, errors),
    };
  }

  async validateRegistry(registry: RegistryIndex): Promise<SecurityValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let valid = true;

    // Check if registry has signing information
    if (!registry.signing) {
      warnings.push('Registry does not provide signature verification');
    }

    // Validate registry signature if present
    if (this.config.verifySignatures && registry.signing) {
      try {
        const signatureValid = await this.validateRegistrySignature(registry);
        if (!signatureValid) {
          errors.push('Registry signature validation failed');
          valid = false;
        }
      } catch (error) {
        warnings.push(
          `Registry signature validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Check server risk distribution
    const riskDistribution = this.analyzeServerRiskDistribution(registry.servers);
    if (riskDistribution.high > riskDistribution.total * 0.2) {
      warnings.push('Registry contains a high percentage of high-risk servers');
    }

    return {
      valid,
      warnings,
      errors,
      riskAssessment: this.assessRegistryRisk(registry),
    };
  }

  private isRiskLevelTooHigh(serverRisk: 'low' | 'medium' | 'high'): boolean {
    const riskLevels = { low: 1, medium: 2, high: 3 };
    return riskLevels[serverRisk] > riskLevels[this.config.maxRiskLevel];
  }

  private async validateSignature(server: ServerManifest): Promise<boolean> {
    // Placeholder for actual Sigstore validation
    // In a real implementation, this would:
    // 1. Fetch the Sigstore bundle from server.security.sigstoreBundle
    // 2. Verify the bundle using the Sigstore client library
    // 3. Check that the signature covers the server manifest

    if (!server.security?.sigstoreBundle) {
      return false;
    }

    try {
      // For now, we'll do a basic URL accessibility check
      const response = await fetch(server.security.sigstoreBundle, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async validateRegistrySignature(registry: RegistryIndex): Promise<boolean> {
    // Placeholder for registry signature validation
    // In a real implementation, this would verify the registry's signature

    if (!registry.signing?.publicKey) {
      return false;
    }

    try {
      // Basic validation that the signing information is present
      return registry.signing.publicKey.length > 0 && registry.signing.sigstoreBundleUrl.length > 0;
    } catch {
      return false;
    }
  }

  private checkSecurityBestPractices(server: ServerManifest, warnings: string[]): void {
    // Check for HTTPS URLs
    if (server.transports.sse?.url && !server.transports.sse.url.startsWith('https://')) {
      warnings.push('SSE transport does not use HTTPS');
    }

    if (
      server.transports.streamableHttp?.url &&
      !server.transports.streamableHttp.url.startsWith('https://')
    ) {
      warnings.push('Streamable HTTP transport does not use HTTPS');
    }

    // Check for excessive permissions
    const highRiskScopes = ['system:exec', 'files:write', 'network:unrestricted'];
    const serverHighRiskScopes = server.scopes.filter((scope) =>
      highRiskScopes.some((riskScope) => scope.includes(riskScope)),
    );

    if (serverHighRiskScopes.length > 0) {
      warnings.push(`Server requests high-risk permissions: ${serverHighRiskScopes.join(', ')}`);
    }

    // Check for recent updates
    if (server.manifest?.updatedAt) {
      const lastUpdate = new Date(server.manifest.updatedAt);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      if (lastUpdate < sixMonthsAgo) {
        warnings.push('Server has not been updated in over 6 months');
      }
    }

    // Check for SBOM availability
    if (!server.security?.sbom) {
      warnings.push('Server does not provide Software Bill of Materials (SBOM)');
    }
  }

  private assessOverallRisk(
    server: ServerManifest,
    warnings: string[],
    errors: string[],
  ): 'low' | 'medium' | 'high' {
    if (errors.length > 0) return 'high';

    const baseRisk = server.security?.riskLevel || 'medium';
    const warningCount = warnings.length;

    if (baseRisk === 'high' || warningCount >= 3) return 'high';
    if (baseRisk === 'medium' || warningCount >= 1) return 'medium';
    return 'low';
  }

  private assessRegistryRisk(registry: RegistryIndex): 'low' | 'medium' | 'high' {
    const riskDistribution = this.analyzeServerRiskDistribution(registry.servers);

    if (riskDistribution.high / riskDistribution.total > 0.3) return 'high';
    if (
      riskDistribution.high / riskDistribution.total > 0.1 ||
      riskDistribution.medium / riskDistribution.total > 0.7
    )
      return 'medium';
    return 'low';
  }

  private analyzeServerRiskDistribution(servers: ServerManifest[]): {
    low: number;
    medium: number;
    high: number;
    total: number;
  } {
    const distribution = { low: 0, medium: 0, high: 0, total: servers.length };

    for (const server of servers) {
      const risk = server.security?.riskLevel || 'medium';
      distribution[risk]++;
    }

    return distribution;
  }
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  verifySignatures: true,
  allowUnverifiedPublishers: false,
  maxRiskLevel: 'medium',
  trustedPublishers: ['anthropic', 'openai', 'microsoft', 'google', 'cortex-os'],
};

export function createSecurityValidator(config?: Partial<SecurityConfig>): SecurityValidator {
  return new SecurityValidator({
    ...DEFAULT_SECURITY_CONFIG,
    ...config,
  });
}

export function generateServerHash(server: ServerManifest): string {
  const content = JSON.stringify({
    id: server.id,
    name: server.name,
    owner: server.owner,
    version: server.version,
    transports: server.transports,
    scopes: server.scopes,
  });

  return createHash('sha256').update(content).digest('hex');
}
