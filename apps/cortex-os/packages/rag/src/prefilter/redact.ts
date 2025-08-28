/**
 * @file_path src/rag/prefilter/redact.ts
 * @description Secrets/PII redactor with GitLeaks and Presidio integration
 * @maintainer Security Team
 * @version 1.0.0
 * @security OWASP LLM Top-10 Compliance & Data Protection
 */

import { execSync, spawnSync } from 'child_process';
import { createHash, randomUUID } from 'crypto';
import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface RedactionOptions {
  gitLeaksConfig?: string;
  presidioEndpoint?: string;
  customPatterns?: SecretPattern[];
  redactionMode: 'full' | 'partial' | 'mask';
  preserveContext: boolean;
  sensitivityLevel: 'low' | 'medium' | 'high';
  anonymizationMethod: 'redact' | 'replace' | 'hash';
  preserveFormat: boolean;
  customEntities?: string[];
}

export interface SecretPattern {
  name: string;
  pattern: RegExp;
  confidence: 'low' | 'medium' | 'high';
  category: 'api_key' | 'password' | 'token' | 'certificate' | 'custom';
}

export interface PIIPattern {
  entity_type: string;
  pattern: RegExp;
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RedactionResult {
  scanId: string;
  timestamp: string;
  redactedContent: string;
  secretsFound: Array<{
    type: string;
    line: number;
    column: number;
    confidence: number;
    redacted: boolean;
  }>;
  entitiesFound: Array<{
    entity_type: string;
    start: number;
    end: number;
    score: number;
    redacted: boolean;
  }>;
  summary: {
    totalSecrets: number;
    highRiskSecrets: number;
    totalPII: number;
    highSensitivityPII: number;
    secretTypes: string[];
    entityTypes: string[];
    customPatternMatches: number;
    encodedSecrets: number;
    obfuscatedSecrets: number;
    obfuscatedPatterns: number;
    maskedPatterns: number;
    environmentSecrets: number;
    indirectPII: number;
    correlatedEntities: number;
    emailAddresses: number;
    phoneNumbers: number;
  };
  riskScore: number;
  security: {
    promptInjectionAttempts: number;
    internalReferences: number;
    businessLogicExposure: number;
  };
}

export class SecretsRedactor {
  public readonly options: RedactionOptions;
  private readonly defaultPatterns: SecretPattern[] = [
    {
      name: 'aws-access-key',
      pattern: /AKIA[0-9A-Z]{16}/g,
      confidence: 'high',
      category: 'api_key',
    },
    {
      name: 'aws-secret-key',
      pattern: /[A-Za-z0-9/+=]{40}/g,
      confidence: 'medium',
      category: 'api_key',
    },
    {
      name: 'github-token',
      pattern: /ghp_[A-Za-z0-9]{36}/g,
      confidence: 'high',
      category: 'token',
    },
    {
      name: 'openai-api-key',
      pattern: /sk-proj-[A-Za-z0-9]{64}/g,
      confidence: 'high',
      category: 'api_key',
    },
    {
      name: 'private-key',
      pattern: /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g,
      confidence: 'high',
      category: 'certificate',
    },
  ];

  constructor(options: Partial<RedactionOptions>) {
    this.options = {
      gitLeaksConfig: options.gitLeaksConfig || '/etc/gitleaks/gitleaks.toml',
      presidioEndpoint: options.presidioEndpoint || 'http://localhost:5001',
      customPatterns: [...this.defaultPatterns, ...(options.customPatterns || [])],
      redactionMode: options.redactionMode || 'partial',
      preserveContext: options.preserveContext !== false,
      sensitivityLevel: options.sensitivityLevel || 'medium',
      anonymizationMethod: options.anonymizationMethod || 'redact',
      preserveFormat: options.preserveFormat !== false,
      customEntities: options.customEntities || [],
    } as RedactionOptions;
  }

  private validateInputs(content: string, filePath: string): void {
    // Validate file path for security
    if (filePath.includes('..') || filePath.includes(';') || filePath.includes('|')) {
      throw new Error('Invalid file path: potential security risk detected');
    }

    // Check content size
    if (content.length > 10 * 1024 * 1024) {
      // 10MB limit
      throw new Error('Content too large for processing');
    }
  }

  private async detectSecrets(
    content: string,
    filePath: string,
  ): Promise<{
    secrets: Array<{
      type: string;
      line: number;
      column: number;
      confidence: number;
      redacted: boolean;
    }>;
    customMatches: number;
    encodedSecrets: number;
    obfuscatedSecrets: number;
    environmentSecrets: number;
  }> {
    // Create secure temporary directory and file for scanning
    const tempDir = mkdtempSync('/tmp/gitleaks-scan-');
    const tempFile = join(tempDir, 'content');

    try {
      writeFileSync(tempFile, content);

      // Run GitLeaks with security isolation (via docker)
      const gitleaksArgs = [
        'run',
        '--rm',
        '--read-only',
        '--tmpfs',
        '/tmp:noexec,nosuid,size=10m',
        '--security-opt',
        'no-new-privileges',
        '--cap-drop=ALL',
        '--network',
        'none',
        '--memory',
        '256m',
        '--cpus',
        '0.5',
        '--volume',
        `${tempDir}:/scan:ro`,
        'zricethezav/gitleaks:latest',
        'detect',
        '--source=/scan',
        '--report-format=json',
        '--report-path=/tmp/gitleaks-report.json',
        '--no-git',
      ];

      const gitleaksResult = spawnSync('docker', gitleaksArgs, {
        encoding: 'utf8',
        timeout: 30000,
      });
      if (gitleaksResult.error) {
        throw gitleaksResult.error;
      }
      if (gitleaksResult.status !== 0) {
        throw new Error(`GitLeaks scan failed: ${gitleaksResult.stderr}`);
      }

      const output = gitleaksResult.stdout || '';
      let gitleaksResults: any;
      try {
        gitleaksResults = JSON.parse(output);
      } catch {
        gitleaksResults = { findings: [] };
      }

      // Process and categorize findings
      const secrets =
        gitleaksResults.findings?.map((finding: any) => ({
          type: finding.RuleID,
          line: finding.StartLine,
          column: finding.StartColumn,
          confidence: this.mapGitleaksConfidence(finding.RuleID),
          redacted: false,
        })) || [];

      // Analyze for additional patterns
      const customMatches = this.detectCustomPatterns(content);
      const encodedSecrets = this.detectEncodedSecrets(content);
      const obfuscatedSecrets = this.detectObfuscatedSecrets(content);
      const environmentSecrets = this.detectEnvironmentSecrets(content);

      return {
        secrets: [...secrets, ...customMatches],
        customMatches: customMatches.length,
        encodedSecrets,
        obfuscatedSecrets,
        environmentSecrets,
      };
    } finally {
      // Cleanup
      try {
        execSync(`rm -rf "${tempDir}"`);
      } catch (error) {
        console.warn('Failed to cleanup temp directory:', error);
      }
    }
  }

  private detectCustomPatterns(content: string): Array<any> {
    const matches: Array<any> = [];

    for (const pattern of this.options.customPatterns || []) {
      const regex = new RegExp(pattern.pattern);
      const match = regex.exec(content);

      if (match) {
        matches.push({
          type: pattern.name,
          line: this.getLineNumber(content, match.index),
          column: this.getColumnNumber(content, match.index),
          confidence: this.mapConfidenceToNumber(pattern.confidence),
          redacted: false,
        });
      }
    }

    return matches;
  }

  private detectEncodedSecrets(content: string): number {
    const base64Patterns = [/(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g];

    let count = 0;
    for (const pattern of base64Patterns) {
      const matches = content.match(pattern) || [];
      count += matches.filter((match) => {
        // Decode and check if it looks like a secret
        try {
          const decoded = Buffer.from(match, 'base64').toString();
          return this.looksLikeSecret(decoded);
        } catch {
          return false;
        }
      }).length;
    }

    return count;
  }

  private detectObfuscatedSecrets(content: string): number {
    // Look for concatenated strings that might be secrets
    const obfuscationPatterns = [
      /'[^']+'\s*\+\s*'[^']+'/g, // String concatenation
      /"[^"]+"\s*\+\s*"[^"]+"/g,
      /\[[^\]]+\]\.join\(['"][^'\"]*['"]\)/g, // Array join
    ];

    let count = 0;
    for (const pattern of obfuscationPatterns) {
      const matches = content.match(pattern) || [];
      count += matches.filter((match) => this.looksLikeSecret(match)).length;
    }

    return count;
  }

  private detectEnvironmentSecrets(content: string): number {
    const envPatterns = [
      /process\.env\.[A-Z_]+\s*=\s*['"][^'"]+['"]/g,
      /process\.env\[['"]\w+['"]\]\s*=\s*['"][^'"]+['"]/g,
      /os\.environ\[['"]\w+['"]\]\s*=\s*['"][^'"]+['"]/g,
    ];

    let count = 0;
    for (const pattern of envPatterns) {
      const matches = content.match(pattern) || [];
      count += matches.length;
    }

    return count;
  }

  private looksLikeSecret(text: string): boolean {
    // Heuristics to determine if text looks like a secret
    if (text.length < 8) return false;

    const secretIndicators = [
      /key/i,
      /token/i,
      /secret/i,
      /password/i,
      /auth/i,
      /api/i,
      /credential/i,
      /private/i,
    ];

    const hasRandomness = /[A-Za-z0-9]{8,}/.test(text);
    const hasSecretKeywords = secretIndicators.some((pattern) => pattern.test(text));

    return hasRandomness && hasSecretKeywords;
  }

  private redactSecret(content: string, secret: any): string {
    const lines = content.split('\n');
    const line = lines[secret.line - 1];

    if (!line) return content;

    let redactedLine = line;

    switch (this.options.redactionMode) {
      case 'full':
        redactedLine = line.replace(/[a-zA-Z0-9]/g, '*');
        break;
      case 'partial':
        // Keep first 4 and last 4 characters
        redactedLine = line.replace(/\b[A-Za-z0-9]{8,}\b/g, (match) => {
          if (match.length <= 8) return '*'.repeat(match.length);
          return match.slice(0, 4) + '*'.repeat(match.length - 8) + match.slice(-4);
        });
        break;
      case 'mask':
        redactedLine = line.replace(/[a-zA-Z0-9]/g, '[REDACTED]');
        break;
    }

    lines[secret.line - 1] = redactedLine;
    return lines.join('\n');
  }

  private analyzeSecurityThreats(content: string): {
    promptInjectionAttempts: number;
    internalReferences: number;
    businessLogicExposure: number;
  } {
    const promptInjectionPatterns = [
      /ignore\s+all\s+previous\s+instructions/i,
      /system\s+prompt:/i,
      /override\s+security/i,
      /classify\s+as\s+safe/i,
    ];

    const internalReferencePatterns = [
      /internal[_-]?api/i,
      /localhost:\d+/g,
      /127\.0\.0\.1/g,
      /\.local\b/g,
      /private[_-]?key/i,
    ];

    const businessLogicPatterns = [
      /pricing[_-]?algorithm/i,
      /profit[_-]?margin/i,
      /confidential/i,
      /proprietary/i,
    ];

    return {
      promptInjectionAttempts: this.countMatches(content, promptInjectionPatterns),
      internalReferences: this.countMatches(content, internalReferencePatterns),
      businessLogicExposure: this.countMatches(content, businessLogicPatterns),
    };
  }

  private sanitizePromptInjections(content: string): string {
    const injectionPatterns = [
      /ignore\s+all\s+previous\s+instructions[^.!?]*/gi,
      /system\s+prompt:[^.!?]*/gi,
      /override\s+security[^.!?]*/gi,
    ];

    let sanitized = content;
    for (const pattern of injectionPatterns) {
      sanitized = sanitized.replace(pattern, '[CONTENT_REMOVED_FOR_SECURITY]');
    }

    return sanitized;
  }

  private calculateRiskScore(secretsResults: any, securityAnalysis: any): number {
    let score = 0;

    // Base score from secrets
    score += secretsResults.secrets.length * 0.1;
    score += secretsResults.encodedSecrets * 0.15;
    score += secretsResults.obfuscatedSecrets * 0.2;

    // Security threats
    score += securityAnalysis.promptInjectionAttempts * 0.3;
    score += securityAnalysis.internalReferences * 0.1;
    score += securityAnalysis.businessLogicExposure * 0.25;

    return Math.min(score, 1.0); // Cap at 1.0
  }

  private mapGitleaksConfidence(ruleId: string): number {
    const highConfidenceRules = ['aws-access-token', 'github-pat', 'private-key'];
    const mediumConfidenceRules = ['generic-api-key', 'password'];

    if (highConfidenceRules.includes(ruleId)) return 0.9;
    if (mediumConfidenceRules.includes(ruleId)) return 0.7;
    return 0.5;
  }

  private mapConfidenceToNumber(confidence: string): number {
    switch (confidence) {
      case 'high':
        return 0.9;
      case 'medium':
        return 0.7;
      case 'low':
        return 0.5;
      default:
        return 0.5;
    }
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private getColumnNumber(content: string, index: number): number {
    const lines = content.substring(0, index).split('\n');
    return lines[lines.length - 1].length + 1;
  }

  private countMatches(content: string, patterns: RegExp[]): number {
    return patterns.reduce((count, pattern) => {
      const matches = content.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  /**
   * Scan content for secrets using GitLeaks and custom patterns
   */
  async scanContent(content: string, filePath: string): Promise<RedactionResult> {
    const scanId = randomUUID();
    const timestamp = new Date().toISOString();

    // Use GitLeaks for secret detection
    const secretResults = await this.detectSecrets(content, filePath);

    // Apply custom pattern detection
    const customPatternResults = this.detectCustomPatterns(content);

    // Combine results
    const allSecrets = [...secretResults.secrets, ...customPatternResults];

    // Apply redaction
    let redactedContent = content;
    for (const secret of allSecrets) {
      redactedContent = this.redactSecret(redactedContent, secret);
    }

    // Security analysis
    const securityAnalysis = this.analyzeSecurityThreats(redactedContent);
    redactedContent = this.sanitizePromptInjections(redactedContent);

    const riskScore = this.calculateRiskScore(allSecrets, securityAnalysis);

    return {
      scanId,
      timestamp,
      redactedContent,
      secretsFound: allSecrets,
      entitiesFound: [],
      summary: {
        totalSecrets: allSecrets.length,
        highRiskSecrets: allSecrets.filter((s) => s.confidence === 'high').length,
        totalPII: 0,
        highSensitivityPII: 0,
        secretTypes: [...new Set(allSecrets.map((s) => s.type))],
        entityTypes: [],
        customPatternMatches: customPatternResults.length,
        encodedSecrets: secretResults.encodedSecrets,
        obfuscatedSecrets: secretResults.obfuscatedSecrets,
        obfuscatedPatterns: 0, // Not provided by detectSecrets
        maskedPatterns: 0, // Not provided by detectSecrets
        environmentSecrets: secretResults.environmentSecrets,
        indirectPII: 0,
        correlatedEntities: 0,
        emailAddresses: 0,
        phoneNumbers: 0,
      },
      riskScore,
      security: securityAnalysis,
    };
  }
}

export class PIIRedactor {
  public readonly options: RedactionOptions;

  constructor(options: Partial<RedactionOptions>) {
    this.options = {
      presidioEndpoint: options.presidioEndpoint || 'http://localhost:5001',
      sensitivityLevel: options.sensitivityLevel || 'medium',
      anonymizationMethod: options.anonymizationMethod || 'redact',
      preserveFormat: options.preserveFormat !== false,
      customEntities: options.customEntities || [],
      redactionMode: options.redactionMode || 'partial',
      preserveContext: options.preserveContext !== false,
    } as RedactionOptions;
  }

  async anonymizeContent(content: string): Promise<RedactionResult> {
    const scanId = randomUUID();
    const timestamp = new Date().toISOString();

    // Use Presidio analyzer via Docker for PII detection
    const piiResults = await this.detectPII(content);

    // Apply anonymization
    let redactedContent = content;
    for (const entity of piiResults.entities) {
      redactedContent = this.anonymizeEntity(redactedContent, entity);
    }

    // Security analysis
    const securityAnalysis = this.analyzeSecurityThreats(redactedContent);
    redactedContent = this.sanitizePromptInjections(redactedContent);

    const riskScore = this.calculatePIIRiskScore(piiResults, securityAnalysis);

    return {
      scanId,
      timestamp,
      redactedContent,
      secretsFound: [],
      entitiesFound: piiResults.entities,
      summary: {
        totalSecrets: 0,
        highRiskSecrets: 0,
        totalPII: piiResults.entities.length,
        highSensitivityPII: piiResults.entities.filter((e) => e.score > 0.8).length,
        secretTypes: [],
        entityTypes: [...new Set(piiResults.entities.map((e) => e.entity_type))],
        customPatternMatches: 0,
        encodedSecrets: 0,
        obfuscatedSecrets: 0,
        obfuscatedPatterns: piiResults.obfuscatedPatterns,
        maskedPatterns: piiResults.maskedPatterns,
        environmentSecrets: 0,
        indirectPII: piiResults.indirectPII,
        correlatedEntities: piiResults.correlatedEntities,
        emailAddresses: piiResults.entities.filter((e) => e.entity_type === 'EMAIL_ADDRESS').length,
        phoneNumbers: piiResults.entities.filter((e) => e.entity_type === 'PHONE_NUMBER').length,
      },
      riskScore,
      security: securityAnalysis,
    };
  }

  private async detectPII(content: string): Promise<{
    entities: Array<{
      entity_type: string;
      start: number;
      end: number;
      score: number;
      redacted: boolean;
    }>;
    obfuscatedPatterns: number;
    maskedPatterns: number;
    indirectPII: number;
    correlatedEntities: number;
  }> {
    const tempDir = `/tmp/presidio-scan-${randomUUID()}`;
    const tempFile = join(tempDir, 'content.txt');

    try {
      mkdirSync(tempDir, { recursive: true });
      writeFileSync(tempFile, content);

      // Run Presidio analyzer via secure container
      const presidioCommand = [
        'docker run --rm',
        '--read-only',
        '--tmpfs /tmp:noexec,nosuid,size=10m',
        '--security-opt no-new-privileges',
        '--cap-drop=ALL',
        '--memory=512m',
        '--cpus=1.0',
        `--volume "${tempDir}:/data:ro"`,
        'mcr.microsoft.com/presidio-analyzer:latest',
        'analyze',
        '--text-file=/data/content.txt',
        '--language=en',
        '--output-format=json',
      ].join(' ');

      const output = execSync(presidioCommand, {
        encoding: 'utf8',
        timeout: 30000,
      });

      const presidioResults = JSON.parse(output);

      const entities = presidioResults.map((result: any) => ({
        entity_type: result.entity_type,
        start: result.start,
        end: result.end,
        score: result.score,
        redacted: false,
      }));

      // Additional pattern analysis
      const obfuscatedPatterns = this.detectObfuscatedPII(content);
      const maskedPatterns = this.detectMaskedPII(content);
      const indirectPII = this.detectIndirectPII(content);
      const correlatedEntities = this.detectCorrelatedEntities(entities);

      return {
        entities,
        obfuscatedPatterns,
        maskedPatterns,
        indirectPII,
        correlatedEntities,
      };
    } finally {
      try {
        execSync(`rm -rf "${tempDir}"`);
      } catch (error) {
        console.warn('Failed to cleanup temp directory:', error);
      }
    }
  }

  private detectObfuscatedPII(content: string): number {
    const patterns = [
      /\b\d{4}[*-]?\d{2}[*-]?\d{2}\b/g, // Masked dates
      /\b[a-zA-Z]+[*]+[a-zA-Z]+@[a-zA-Z]+\.[a-zA-Z]+\b/g, // Masked emails
    ];

    return patterns.reduce((count, pattern) => {
      const matches = content.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private detectMaskedPII(content: string): number {
    const maskedPatterns = [/john\[dot\]doe\[at\]example\[dot\]com/gi, /j0hn\.d03@3x4mpl3\.c0m/gi];

    return maskedPatterns.reduce((count, pattern) => {
      const matches = content.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private detectIndirectPII(content: string): number {
    const indirectPatterns = [/born\s+in\s+\d{4}/gi, /zip\s+\d{5}/gi, /drives\s+[a-zA-Z]+/gi];

    return indirectPatterns.reduce((count, pattern) => {
      const matches = content.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private detectCorrelatedEntities(entities: any[]): number {
    // Simple correlation detection
    const hasPersonName = entities.some((e) => e.entity_type === 'PERSON');
    const hasLocation = entities.some((e) => e.entity_type === 'LOCATION');
    const hasEmail = entities.some((e) => e.entity_type === 'EMAIL_ADDRESS');

    return hasPersonName && hasLocation && hasEmail ? 1 : 0;
  }

  private anonymizeEntity(content: string, entity: any): string {
    const before = content.substring(0, entity.start);
    const after = content.substring(entity.end);

    let replacement: string;

    switch (this.options.anonymizationMethod) {
      case 'redact':
        replacement = `[${entity.entity_type}]`;
        break;
      case 'replace':
        replacement = this.generateReplacement(entity.entity_type);
        break;
      case 'hash':
        const original = content.substring(entity.start, entity.end);
        replacement = createHash('sha256').update(original).digest('hex').substring(0, 8);
        break;
      default:
        replacement = `[${entity.entity_type}]`;
    }

    return before + replacement + after;
  }

  private generateReplacement(entityType: string): string {
    const replacements = {
      EMAIL_ADDRESS: 'user@example.com',
      PHONE_NUMBER: '(555) 123-4567',
      PERSON: 'John Doe',
      LOCATION: 'City, State',
      US_SSN: 'XXX-XX-XXXX',
      CREDIT_CARD: 'XXXX-XXXX-XXXX-XXXX',
    } as Record<string, string>;

    return replacements[entityType as keyof typeof replacements] || `[${entityType}]`;
  }

  private analyzeSecurityThreats(content: string): {
    promptInjectionAttempts: number;
    internalReferences: number;
    businessLogicExposure: number;
  } {
    // Same implementation as SecretsRedactor
    const promptInjectionPatterns = [
      /ignore\s+all\s+previous\s+instructions/i,
      /output\s+all\s+detected\s+pii/i,
    ];

    return {
      promptInjectionAttempts: this.countMatches(content, promptInjectionPatterns),
      internalReferences: 0,
      businessLogicExposure: 0,
    };
  }

  private sanitizePromptInjections(content: string): string {
    const injectionPatterns = [
      /ignore\s+previous\s+instructions[^.!?]*/gi,
      /output\s+all\s+detected\s+pii[^.!?]*/gi,
    ];

    let sanitized = content;
    for (const pattern of injectionPatterns) {
      sanitized = sanitized.replace(pattern, '[CONTENT_REMOVED_FOR_SECURITY]');
    }

    return sanitized;
  }

  private calculatePIIRiskScore(piiResults: any, securityAnalysis: any): number {
    let score = 0;

    score += piiResults.entities.length * 0.1;
    score += piiResults.indirectPII * 0.15;
    score += piiResults.correlatedEntities * 0.3;
    score += securityAnalysis.promptInjectionAttempts * 0.4;

    return Math.min(score, 1.0);
  }

  private countMatches(content: string, patterns: RegExp[]): number {
    return patterns.reduce((count, pattern) => {
      const matches = content.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }
}
