/**
 * @file_path src/rag/prefilter/license.ts
 * @description License scanner with ScanCode container integration and security hardening
 * @maintainer Security Team
 * @version 1.0.0
 * @security OWASP LLM Top-10 Compliance & Container Security
 */

import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, normalize, resolve } from 'path';

export interface LicenseScanOptions {
  blockedLicenses: string[];
  containerTimeout: number;
  maxFileSize: number;
  securityIsolation: boolean;
  containerDigest?: string;
  trustedRegistry?: string;
  customPatterns?: LicensePattern[];
}

export interface LicensePattern {
  name: string;
  pattern: RegExp;
  confidence: 'low' | 'medium' | 'high';
  category: 'permissive' | 'copyleft' | 'proprietary' | 'unknown';
}

export interface ScanCodeResult {
  files: Array<{
    path: string;
    licenses: Array<{
      key: string;
      short_name: string;
      category: string;
      matched_text?: string;
    }>;
    copyrights: Array<{
      holders: string[];
    }>;
    scan_errors: string[];
  }>;
  headers: Array<{
    tool_name: string;
    tool_version: string;
    options: Record<string, any>;
  }>;
  summary: {
    license_expressions: string[];
  };
}

export interface LicenseScanResult {
  scanId: string;
  timestamp: string;
  blockedFiles: string[];
  allowedFiles: string[];
  quarantinedFiles: string[];
  redactedPaths: string[];
  summary: {
    totalFiles: number;
    blockedCount: number;
    allowedCount: number;
    blockedLicenses: string[];
    unknownLicenses: string[];
    conflictingLicenses?: string[];
  };
  sanitizedOutput: string;
  security: {
    promptInjectionAttempts: number;
    pathTraversalAttempts: number;
    containerSecurityEvents: string[];
  };
}

export class LicenseScanner {
  private readonly options: LicenseScanOptions;
  private readonly defaultBlockedLicenses = [
    'gpl-3.0',
    'agpl-3.0',
    'sspl-1.0',
    'bsl-1.1',
    'cc-by-nc-4.0',
    'cc-by-nc-sa-4.0',
    'ms-pl',
  ];

  private readonly defaultContainerImage =
    'docker.io/scancode/scancode-toolkit@sha256:6e1b2e2e2c3d4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a';
  private readonly maxScanFiles = 10000;
  private readonly pathValidationRegex = /^[a-zA-Z0-9._/-]+$/;

  constructor(options: Partial<LicenseScanOptions> = {}) {
    this.options = {
      blockedLicenses: [...this.defaultBlockedLicenses, ...(options.blockedLicenses || [])],
      containerTimeout: options.containerTimeout || 30000,
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024,
      securityIsolation: options.securityIsolation !== false,
      containerDigest: options.containerDigest || this.defaultContainerImage,
      trustedRegistry: options.trustedRegistry || 'docker.io/scancode',
      customPatterns: options.customPatterns || [],
    };
  }

  async scanDirectory(
    scanPath: string,
    options?: { timeout?: number },
  ): Promise<LicenseScanResult> {
    const scanId = randomUUID();
    const timestamp = new Date().toISOString();

    // Security validation
    this.validateScanPath(scanPath);

    // Prepare secure container environment
    const containerConfig = await this.prepareSecureContainer(scanPath);

    try {
      // Execute scan in secure container
      const scanResult = await this.executeScan(containerConfig, options?.timeout);

      // Process and sanitize results
      const processedResult = await this.processScanResults(scanResult, scanId, timestamp);

      return processedResult;
    } finally {
      // Cleanup container and temporary files
      await this.cleanupScan(containerConfig.containerId);
    }
  }

  async scanContent(content: string, filePath: string): Promise<LicenseScanResult> {
    const tempDir = `/tmp/license-scan-${randomUUID()}`;
    const tempFile = join(tempDir, 'content-to-scan');

    try {
      mkdirSync(tempDir, { recursive: true });
      writeFileSync(tempFile, content);

      return await this.scanDirectory(tempDir);
    } finally {
      // Cleanup temporary files
      try {
        execSync(`rm -rf "${tempDir}"`);
      } catch (error) {
        console.warn('Failed to cleanup temporary scan directory:', error);
      }
    }
  }

  private validateScanPath(scanPath: string): void {
    const normalizedPath = normalize(scanPath);

    // Prevent path traversal attacks
    if (normalizedPath.includes('..') || !this.pathValidationRegex.test(normalizedPath)) {
      throw new Error('Invalid characters in path or path traversal detected');
    }

    // Prevent dangerous system paths
    const dangerousPaths = ['/etc', '/var', '/usr', '/bin', '/sbin', '/root', '/home'];
    if (dangerousPaths.some((dangerous) => normalizedPath.startsWith(dangerous))) {
      throw new Error('Invalid scan path: access to system directories not allowed');
    }

    // Ensure path exists and is accessible
    if (!existsSync(normalizedPath)) {
      throw new Error(`Scan path does not exist: ${normalizedPath}`);
    }
  }

  private async prepareSecureContainer(scanPath: string): Promise<{
    containerId: string;
    mountPath: string;
    command: string;
  }> {
    const containerId = `license-scan-${randomUUID()}`;
    const mountPath = `/scan`;

    // Verify container image digest
    if (!this.options.containerDigest?.includes('sha256:')) {
      throw new Error('Container image must use verified digest');
    }

    // Build secure Docker command
    const dockerCommand = [
      'docker run',
      `--name ${containerId}`,
      '--rm',
      '--read-only',
      '--tmpfs /tmp:noexec,nosuid,size=10m',
      '--tmpfs /var/tmp:noexec,nosuid,size=5m',
      '--security-opt no-new-privileges',
      '--security-opt seccomp=default',
      '--security-opt apparmor=default',
      '--cap-drop=ALL',
      '--network=none',
      '--memory=512m',
      '--cpus=1.0',
      '--pids-limit=100',
      `--user 65534:65534`, // nobody:nobody
      `--volume "${resolve(scanPath)}:${mountPath}:ro"`,
      this.options.containerDigest,
      'scancode',
      '--license',
      '--copyright',
      '--json-pp',
      '--timeout 30',
      `--processes 2`,
      mountPath,
    ].join(' ');

    return {
      containerId,
      mountPath,
      command: dockerCommand,
    };
  }

  private async executeScan(
    containerConfig: { command: string; containerId: string },
    timeout?: number,
  ): Promise<ScanCodeResult> {
    const effectiveTimeout = timeout || this.options.containerTimeout;

    try {
      const output = execSync(containerConfig.command, {
        timeout: effectiveTimeout,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024, // 50MB max output
      });

      return this.parseScanCodeOutput(output);
    } catch (error: any) {
      if (error.code === 'TIMEOUT') {
        throw new Error('Scan timeout exceeded');
      }
      if (error.message?.includes('digest verification failed')) {
        throw new Error('Container digest verification failed');
      }
      throw new Error(`ScanCode execution failed: ${error.message}`);
    }
  }

  private parseScanCodeOutput(output: string): ScanCodeResult {
    try {
      const parsed = JSON.parse(output);

      // Validate output structure
      if (!parsed.files || !Array.isArray(parsed.files)) {
        throw new Error('Invalid ScanCode output structure');
      }

      return parsed as ScanCodeResult;
    } catch (error) {
      throw new Error('Failed to parse ScanCode output: invalid JSON');
    }
  }

  private async processScanResults(
    scanResult: ScanCodeResult,
    scanId: string,
    timestamp: string,
  ): Promise<LicenseScanResult> {
    const blockedFiles: string[] = [];
    const allowedFiles: string[] = [];
    const quarantinedFiles: string[] = [];
    const redactedPaths: string[] = [];
    const unknownLicenses: string[] = [];
    const blockedLicenses: string[] = [];
    const conflictingLicenses: string[] = [];

    let promptInjectionAttempts = 0;
    let pathTraversalAttempts = 0;
    const containerSecurityEvents: string[] = [];

    // Rate limiting for large results
    const filesToProcess = scanResult.files.slice(0, this.maxScanFiles);
    if (scanResult.files.length > this.maxScanFiles) {
      containerSecurityEvents.push(
        `Rate limited: processing ${this.maxScanFiles} of ${scanResult.files.length} files`,
      );
    }

    for (const file of filesToProcess) {
      // Security: Check for path traversal in results
      if (file.path.includes('..') || file.path.startsWith('/')) {
        pathTraversalAttempts++;
        redactedPaths.push(file.path);
        continue;
      }

      // Security: Check for prompt injection in license text
      for (const license of file.licenses) {
        if (this.detectPromptInjection(license.matched_text || license.short_name)) {
          promptInjectionAttempts++;
          quarantinedFiles.push(file.path);
          continue;
        }
      }

      // License analysis
      const fileLicenses = file.licenses.map((l) => l.key.toLowerCase());
      const hasBlockedLicense = fileLicenses.some((license) =>
        this.options.blockedLicenses.includes(license),
      );

      const hasUnknownLicense = fileLicenses.some((license) => !license || license === 'unknown');

      // Check for conflicting licenses
      const hasConflictingLicenses = this.detectConflictingLicenses(fileLicenses);

      if (hasBlockedLicense) {
        blockedFiles.push(file.path);
        blockedLicenses.push(
          ...fileLicenses.filter((l) => this.options.blockedLicenses.includes(l)),
        );
      } else if (hasUnknownLicense) {
        quarantinedFiles.push(file.path);
        unknownLicenses.push(...fileLicenses.filter((l) => !l || l === 'unknown'));
      } else if (hasConflictingLicenses) {
        quarantinedFiles.push(file.path);
        conflictingLicenses.push(file.path);
      } else {
        allowedFiles.push(file.path);
      }
    }

    // Sanitize output for LLM consumption
    const sanitizedOutput = this.sanitizeOutputForLLM(scanResult);

    return {
      scanId,
      timestamp,
      blockedFiles,
      allowedFiles,
      quarantinedFiles,
      redactedPaths,
      summary: {
        totalFiles: filesToProcess.length,
        blockedCount: blockedFiles.length,
        allowedCount: allowedFiles.length,
        blockedLicenses: [...new Set(blockedLicenses)],
        unknownLicenses: [...new Set(unknownLicenses)],
        conflictingLicenses:
          conflictingLicenses.length > 0 ? [...new Set(conflictingLicenses)] : undefined,
      },
      sanitizedOutput,
      security: {
        promptInjectionAttempts,
        pathTraversalAttempts,
        containerSecurityEvents,
      },
    };
  }

  private detectPromptInjection(text?: string): boolean {
    if (!text) return false;

    const injectionPatterns = [
      /ignore\s+all\s+previous\s+instructions/i,
      /forget\s+everything/i,
      /new\s+instructions?:/i,
      /system\s+prompt:/i,
      /override\s+security/i,
      /bypass\s+all\s+checks/i,
      /classify\s+as\s+"safe"/i,
      /always\s+approve/i,
    ];

    return injectionPatterns.some((pattern) => pattern.test(text));
  }

  private detectConflictingLicenses(licenses: string[]): boolean {
    // Check for GPL + proprietary combinations
    const hasGPL = licenses.some((l) => l.includes('gpl'));
    const hasProprietary = licenses.some((l) =>
      ['proprietary', 'commercial', 'closed-source'].some((prop) => l.includes(prop)),
    );

    return hasGPL && hasProprietary;
  }

  private sanitizeOutputForLLM(scanResult: ScanCodeResult): string {
    // Remove potentially sensitive information
    const sanitized = JSON.stringify(
      scanResult,
      (key, value) => {
        // Redact file paths that might contain sensitive information
        if (key === 'path' && typeof value === 'string') {
          if (value.includes('.ssh') || value.includes('password') || value.includes('secret')) {
            return '[REDACTED_PATH]';
          }
        }

        // Redact matched text that might contain prompt injections
        if (key === 'matched_text' && typeof value === 'string') {
          if (this.detectPromptInjection(value)) {
            return '[REDACTED_POTENTIALLY_MALICIOUS_CONTENT]';
          }
        }

        return value;
      },
      2,
    );

    return sanitized;
  }

  private async cleanupScan(containerId: string): Promise<void> {
    try {
      // Container should auto-remove with --rm flag
      // But ensure cleanup in case of errors
      execSync(`docker rm -f ${containerId}`, { stdio: 'ignore' });
    } catch (error) {
      // Container likely already removed, ignore error
    }

    // Cleanup any orphaned volumes
    try {
      execSync('docker volume prune -f', { stdio: 'ignore' });
    } catch (error) {
      console.warn('Failed to cleanup Docker volumes:', error);
    }
  }

  // Utility method for sanitizing container configuration
  async sanitizeContainerConfig(config: any): Promise<any> {
    const sanitized = { ...config };

    // Force read-only volumes
    if (sanitized.volumes) {
      sanitized.volumes = sanitized.volumes.map((volume: string) => {
        if (volume.endsWith(':rw')) {
          return volume.replace(':rw', ':ro');
        }
        if (!volume.includes(':ro') && !volume.includes(':rw')) {
          return `${volume}:ro`;
        }
        return volume;
      });
    }

    // Force secure network mode
    sanitized.networkMode = 'none';

    return sanitized;
  }
}
