/**
 * @file_path packages/mcp/src/plugin-validator.ts
 * @description Security validation and analysis for MCP plugins
 * @maintainer @jamiescottcraik
 * @last_updated 2025-01-12
 * @version 1.0.0
 * @status active
 * @ai_generated_by human
 * @ai_provenance_hash N/A
 */

import { createPublicKey, verify } from 'crypto';
import { PluginMetadata, PluginMetadataSchema, PluginValidationResult } from './types.js';

export class PluginValidator {
  private readonly SECURITY_RULES = {
    MAX_INSTALL_SIZE: 50 * 1024 * 1024, // 50MB
    REQUIRED_FIELDS: ['name', 'version', 'description', 'author', 'entrypoint'],
    DANGEROUS_PERMISSIONS: ['filesystem.root', 'network.unrestricted', 'process.admin'],
    SUSPICIOUS_KEYWORDS: ['crypto', 'mining', 'bitcoin', 'wallet'],
    VERIFIED_AUTHORS: ['Cortex OS Team', 'Dev Tools Community', 'AI Integration Team'],
  };

  constructor(private readonly trustedPublicKeys: Record<string, string> = {}) {}

  /**
   * Validate a plugin's metadata and security
   */
  async validatePlugin(plugin: PluginMetadata): Promise<PluginValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let securityScore = 100;

    try {
      // Validate schema
      PluginMetadataSchema.parse(plugin);
    } catch (error) {
      errors.push(`Invalid plugin metadata: ${error}`);
      securityScore -= 30;
    }

    // Check required fields
    for (const field of this.SECURITY_RULES.REQUIRED_FIELDS) {
      if (!plugin[field as keyof PluginMetadata]) {
        errors.push(`Missing required field: ${field}`);
        securityScore -= 10;
      }
    }

    // Validate version format
    if (plugin.version && !this.isValidVersion(plugin.version)) {
      warnings.push('Invalid version format, should follow semver');
      securityScore -= 5;
    }

    // Check install size
    if (plugin.installSize && plugin.installSize > this.SECURITY_RULES.MAX_INSTALL_SIZE) {
      warnings.push(`Large install size: ${this.formatBytes(plugin.installSize)}`);
      securityScore -= 10;
    }

    // Security checks
    securityScore -= this.checkPermissions(plugin.permissions, warnings, errors);
    securityScore -= this.checkKeywords(plugin.keywords, warnings, errors);
    securityScore -= this.checkAuthor(plugin.author, warnings);
    securityScore -= this.checkDependencies(plugin.dependencies, warnings, errors);

    // Signature verification
    if (!plugin.signature) {
      warnings.push('Plugin is not digitally signed');
      securityScore -= 15;
    } else {
      const signatureValid = await this.verifySignature(plugin);
      if (!signatureValid) {
        errors.push('Invalid digital signature');
        securityScore -= 30;
      }
    }

    // URL validation
    if (plugin.downloadUrl && !this.isValidDownloadUrl(plugin.downloadUrl)) {
      errors.push('Invalid or suspicious download URL');
      securityScore -= 20;
    }

    // Ensure security score doesn't go below 0
    securityScore = Math.max(0, securityScore);

    const result: PluginValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      securityScore,
      details: {
        hasSignature: !!plugin.signature,
        isVerified: !!plugin.verified,
        permissionCount: Array.isArray(plugin.permissions) ? plugin.permissions.length : 0,
        dependencyCount: Array.isArray(plugin.dependencies) ? plugin.dependencies.length : 0,
        authorTrusted: plugin.author
          ? this.SECURITY_RULES.VERIFIED_AUTHORS.includes(plugin.author)
          : false,
      },
    };

    // Return result directly instead of using schema validation to avoid runtime issues
    return result;
  }

  /**
   * Perform batch validation of multiple plugins
   */
  async validatePlugins(plugins: PluginMetadata[]): Promise<PluginValidationResult[]> {
    const results: PluginValidationResult[] = [];

    for (const plugin of plugins) {
      try {
        const result = await this.validatePlugin(plugin);
        results.push(result);
      } catch (error) {
        results.push({
          valid: false,
          errors: [`Validation failed: ${error}`],
          warnings: [],
          securityScore: 0,
        });
      }
    }

    return results;
  }

  /**
   * Get security recommendations for a plugin
   */
  getSecurityRecommendations(
    plugin: PluginMetadata,
    validationResult: PluginValidationResult,
  ): string[] {
    const recommendations: string[] = [];

    if (validationResult.securityScore < 70) {
      recommendations.push('This plugin has security concerns. Consider alternatives.');
    }

    if (!plugin.verified) {
      recommendations.push('This plugin is not verified. Review carefully before installation.');
    }

    if (!plugin.signature) {
      recommendations.push('Install plugins with digital signatures when possible.');
    }

    if (
      plugin.permissions.some((p: string) => this.SECURITY_RULES.DANGEROUS_PERMISSIONS.includes(p))
    ) {
      recommendations.push(
        'This plugin requests elevated permissions. Ensure you trust the author.',
      );
    }

    if (plugin.dependencies.length > 5) {
      recommendations.push('This plugin has many dependencies. Review the dependency tree.');
    }

    return recommendations;
  }

  /**
   * Check plugin permissions for security issues
   */
  private checkPermissions(permissions: string[], warnings: string[], errors: string[]): number {
    let penalty = 0;

    // Handle invalid permissions arrays gracefully
    if (!Array.isArray(permissions)) {
      errors.push('Invalid permissions data - must be an array');
      return 30; // High penalty for invalid data
    }

    for (const permission of permissions) {
      if (this.SECURITY_RULES.DANGEROUS_PERMISSIONS.includes(permission)) {
        warnings.push(`Dangerous permission requested: ${permission}`);
        penalty += 15;
      }
    }

    if (permissions.length > 10) {
      warnings.push('Plugin requests many permissions');
      penalty += 5;
    }

    return penalty;
  }

  /**
   * Check keywords for suspicious content
   */
  private checkKeywords(keywords: string[], warnings: string[], errors: string[]): number {
    let penalty = 0;

    // Handle invalid keywords arrays gracefully
    if (!Array.isArray(keywords)) {
      errors.push('Invalid keywords data - must be an array');
      return 15; // Moderate penalty for invalid data
    }

    for (const keyword of keywords) {
      if (this.SECURITY_RULES.SUSPICIOUS_KEYWORDS.includes(keyword.toLowerCase())) {
        warnings.push(`Suspicious keyword: ${keyword}`);
        penalty += 10;
      }
    }

    return penalty;
  }

  /**
   * Check if author is trusted
   */
  private checkAuthor(author: string, warnings: string[]): number {
    if (!this.SECURITY_RULES.VERIFIED_AUTHORS.includes(author)) {
      warnings.push('Author is not in verified list');
      return 5;
    }
    return 0;
  }

  /**
   * Check dependencies for security issues
   */
  private checkDependencies(dependencies: string[], warnings: string[], errors: string[]): number {
    let penalty = 0;

    // Handle invalid dependencies arrays gracefully
    if (!Array.isArray(dependencies)) {
      errors.push('Invalid dependencies data - must be an array');
      return 15; // Moderate penalty for invalid data
    }

    if (dependencies.length > 10) {
      warnings.push('Plugin has many dependencies');
      penalty += 5;
    }

    // Check for suspicious dependency names
    for (const dep of dependencies) {
      if (dep.includes('crypto') || dep.includes('bitcoin')) {
        warnings.push(`Suspicious dependency: ${dep}`);
        penalty += 10;
      }
    }

    return penalty;
  }

  /**
   * Verify digital signature of plugin metadata
   */
  private async verifySignature(plugin: PluginMetadata): Promise<boolean> {
    const publicKeyPem = this.trustedPublicKeys[plugin.author];
    if (!publicKeyPem || !plugin.signature) {
      return false;
    }

    try {
      const data = JSON.stringify({
        name: plugin.name,
        version: plugin.version,
        entrypoint: plugin.entrypoint,
      });
      const publicKey = createPublicKey(publicKeyPem);
      const signature = Buffer.from(plugin.signature, 'base64');
      return verify(null, Buffer.from(data), publicKey, signature);
    } catch {
      return false;
    }
  }

  /**
   * Validate version format
   */
  private isValidVersion(version: string): boolean {
    const semverPattern = /^(\d+)\.(\d+)\.(\d+)(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    return semverPattern.test(version);
  }

  /**
   * Validate download URL
   */
  private isValidDownloadUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Only allow HTTPS and specific trusted domains
      if (parsed.protocol !== 'https:') return false;

      const trustedDomains = ['plugins.brainwav.ai', 'github.com', 'registry.npmjs.org'];
      return trustedDomains.some((domain) => parsed.hostname.endsWith(domain));
    } catch {
      return false;
    }
  }

  /**
   * Format bytes for human reading
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
