import type { Memory, MemoryPolicy } from '../domain/types.js';
import { MemoryValidationError } from '../errors.js';

export interface SecurityIssue {
  type: 'suspicious-link' | 'xss-risk' | 'sensitive-data' | 'size-limit' | 'malformed-content';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location: 'text' | 'metadata' | 'tags';
}

export interface SecurityScan {
  memoryId: string;
  issues: SecurityIssue[];
  score: number; // 0.0 to 1.0, where 1.0 is completely secure
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

/**
 * ASBR (Autonomous Software Behavior Reasoning) Security Policies
 *
 * Implements security policies for memory operations including:
 * - Content validation and sanitization
 * - Access control
 * - Sensitive data detection
 * - Security scanning
 */
export class ASBRSecurityPolicy {
  private readonly maxMemorySize = 10 * 1024; // 10KB
  private readonly sensitivePatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card
    /\b(?:sk_|pk_|live_|test_)[a-zA-Z0-9_]{10,}\b/g, // API keys
    /\bpassword[s]?\s*[:=]\s*\S+/gi, // Passwords
    /\bsecret[s]?\s*[:=]\s*\S+/gi, // Secrets
    /\btoken[s]?\s*[:=]\s*\S+/gi, // Tokens
  ];

  private readonly suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // XSS
    /javascript:\s*[^\s]*/gi, // JS URLs
    /data:\s*text\/html/gi, // Data URIs
    /on\w+\s*=/gi, // Event handlers
    /(?:https?:\/\/|www\.)\S+\.(?:tk|ml|ga|cf|gq|top)/gi, // Suspicious TLDs
    /https?:\/\/\S+/gi, // All HTTP/HTTPS links (conservative approach)
  ];

  /**
   * Validate a memory object against security policies
   */
  validateMemory(memory: Memory): void {
    // Validate text content
    if (memory.text) {
      if (memory.text.length > this.maxMemorySize) {
        throw new MemoryValidationError(
          `Memory text exceeds maximum size of ${this.maxMemorySize} bytes`
        );
      }

      // Check for suspicious content
      if (this.hasSuspiciousContent(memory.text)) {
        throw new MemoryValidationError(
          'Memory contains suspicious or potentially harmful content'
        );
      }
    }

    // Validate metadata
    if (memory.metadata) {
      this.validateMetadata(memory.metadata);
    }

    // Validate policy if present
    if (memory.policy) {
      this.validatePolicy(memory.policy);
    }
  }

  /**
   * Check if a memory contains sensitive data
   */
  containsSensitiveData(text: string): boolean {
    return this.sensitivePatterns.some(pattern => pattern.test(text));
  }

  /**
   * Sanitize memory content by removing or escaping harmful elements
   */
  sanitizeMemory(memory: Memory): Memory {
    const sanitized = { ...memory };

    // Sanitize text content
    if (sanitized.text) {
      sanitized.text = this.sanitizeText(sanitized.text);
    }

    // Sanitize metadata
    if (sanitized.metadata) {
      sanitized.metadata = this.sanitizeMetadata(sanitized.metadata);
    }

    // Sanitize tags
    if (sanitized.tags) {
      sanitized.tags = sanitized.tags.map(tag =>
        tag.replace(/[<>"']/g, '')
      );
    }

    return sanitized;
  }

  /**
   * Check if a subject can read the memory
   */
  canRead(memory: Memory, subject: string): boolean {
    if (!memory.policy || !memory.policy.read) {
      return true; // Default allow
    }
    return memory.policy.read.includes(subject) ||
      memory.policy.read.includes('*');
  }

  /**
   * Check if a subject can write to the memory
   */
  canWrite(memory: Memory, subject: string): boolean {
    if (!memory.policy || !memory.policy.write) {
      return true; // Default allow
    }
    return memory.policy.write.includes(subject) ||
      memory.policy.write.includes('*');
  }

  /**
   * Apply content filtering to memory
   */
  applyContentFilter(memory: Memory): Memory {
    const filtered = { ...memory };

    // Redact sensitive data in text
    if (filtered.text) {
      filtered.text = this.redactSensitiveData(filtered.text);
    }

    // Redact sensitive data in metadata
    if (filtered.metadata) {
      filtered.metadata = this.redactMetadataSensitiveData(filtered.metadata);
    }

    return filtered;
  }

  /**
   * Validate policy structure
   */
  validatePolicy(policy: Partial<MemoryPolicy>): void {
    if (policy.read && !Array.isArray(policy.read)) {
      throw new MemoryValidationError('Policy read field must be an array');
    }

    if (policy.write && !Array.isArray(policy.write)) {
      throw new MemoryValidationError('Policy write field must be an array');
    }

    if (policy.encrypt !== undefined && typeof policy.encrypt !== 'boolean') {
      throw new MemoryValidationError('Policy encrypt field must be a boolean');
    }

    if (policy.ttl !== undefined && typeof policy.ttl !== 'number') {
      throw new MemoryValidationError('Policy ttl field must be a number');
    }
  }

  /**
   * Perform security scan on memory
   */
  scanMemory(memory: Memory): SecurityScan {
    const issues: SecurityIssue[] = [];
    let score = 1.0;

    // Check for suspicious links
    if (memory.text && this.hasSuspiciousLinks(memory.text)) {
      issues.push({
        type: 'suspicious-link',
        severity: 'medium',
        message: 'Memory contains potentially suspicious links',
        location: 'text',
      });
      score -= 0.3;
    }

    // Check for XSS risks
    if (memory.text && this.hasXSSRisk(memory.text)) {
      issues.push({
        type: 'xss-risk',
        severity: 'high',
        message: 'Memory contains potential XSS vectors',
        location: 'text',
      });
      score -= 0.5;
    }

    // Check for sensitive data
    if (memory.text && this.containsSensitiveData(memory.text)) {
      issues.push({
        type: 'sensitive-data',
        severity: 'high',
        message: 'Memory contains sensitive information patterns',
        location: 'text',
      });
      score -= 0.4;
    }

    // Check size limits
    if (memory.text && memory.text.length > this.maxMemorySize) {
      issues.push({
        type: 'size-limit',
        severity: 'medium',
        message: `Memory text exceeds size limit`,
        location: 'text',
      });
      score -= 0.2;
    }

    // Check metadata for issues
    if (memory.metadata) {
      const metadataIssues = this.scanMetadata(memory.metadata);
      issues.push(...metadataIssues);
      score -= metadataIssues.length * 0.1;
    }

    // Determine overall severity
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (issues.some(issue => issue.severity === 'critical')) severity = 'critical';
    else if (issues.some(issue => issue.severity === 'high')) severity = 'high';
    else if (issues.some(issue => issue.severity === 'medium')) severity = 'medium';

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    return {
      memoryId: memory.id,
      issues,
      score,
      severity,
      timestamp: new Date().toISOString(),
    };
  }

  // Private helper methods

  private hasSuspiciousContent(text: string): boolean {
    return this.suspiciousPatterns.some(pattern => pattern.test(text));
  }

  private hasSuspiciousLinks(text: string): boolean {
    // Check for any HTTP/HTTPS link (conservative approach)
    const linkPattern = /https?:\/\/[^\s]+/gi;
    return linkPattern.test(text);
  }

  private hasXSSRisk(text: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:\s*[^\s]*/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(text));
  }

  private validateMetadata(metadata: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(metadata)) {
      // Check for dangerous keys
      if (['__proto__', 'constructor', 'prototype'].includes(key)) {
        throw new MemoryValidationError(
          `Unsafe metadata key "${key}" detected`
        );
      }

      // Check for dangerous values
      if (typeof value === 'string' && this.hasSuspiciousContent(value)) {
        throw new MemoryValidationError(
          `Metadata value for key "${key}" contains suspicious content`
        );
      }
    }
  }

  private sanitizeText(text: string): string {
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[SCRIPT REMOVED]')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '[IFRAME REMOVED]')
      .replace(/javascript:[^\s>]*/gi, '[JS URL REMOVED]')
      .replace(/on\w+\s*=/gi, '[EVENT HANDLER REMOVED]')
      .replace(/<[^>]+>/g, ''); // Remove all HTML tags, but preserve content
  }

  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      // Skip dangerous keys
      if (['__proto__', 'constructor', 'prototype'].includes(key)) {
        continue;
      }

      if (typeof value === 'string') {
        // For metadata, perform safe text sanitization
        sanitized[key] = this.sanitizeText(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private redactSensitiveData(text: string): string {
    let redacted = text;

    this.sensitivePatterns.forEach(pattern => {
      redacted = redacted.replace(pattern, '[REDACTED]');
    });

    return redacted;
  }

  private redactMetadataSensitiveData(metadata: Record<string, unknown>): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string') {
        redacted[key] = this.redactSensitiveData(value);
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactMetadataSensitiveData(value as Record<string, unknown>);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  private scanMetadata(metadata: Record<string, unknown>): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string') {
        // Check for XSS specifically in metadata
        if (this.hasXSSRisk(value)) {
          issues.push({
            type: 'xss-risk',
            severity: 'high',
            message: `Metadata key "${key}" contains potential XSS vectors`,
            location: 'metadata',
          });
        }
        // Check for other suspicious content
        if (this.hasSuspiciousContent(value)) {
          issues.push({
            type: 'malformed-content',
            severity: 'medium',
            message: `Metadata key "${key}" contains suspicious content`,
            location: 'metadata',
          });
        }
        if (this.containsSensitiveData(value)) {
          issues.push({
            type: 'sensitive-data',
            severity: 'high',
            message: `Metadata key "${key}" contains sensitive information`,
            location: 'metadata',
          });
        }
      }
    }

    return issues;
  }
}
