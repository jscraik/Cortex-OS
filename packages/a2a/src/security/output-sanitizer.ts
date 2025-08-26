/**
 * @file Output Sanitization Engine - OWASP LLM02 Protection
 * @description Advanced output sanitization with XSS prevention, content validation, and safe encoding
 * following OWASP LLM Top 10 security guidelines
 */

import crypto from 'crypto';

export interface SanitizationRule {
  name: string;
  pattern: RegExp;
  replacement: string | ((match: string) => string);
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface SanitizationResult {
  safe: boolean;
  sanitized: unknown;
  original: unknown;
  violations: SanitizationViolation[];
  riskScore: number;
  contentHash: string;
  metadata: {
    sanitizationTime: number;
    rulesApplied: string[];
    encoding: string;
    contentType: string;
  };
}

export interface SanitizationViolation {
  rule: string;
  severity: string;
  matched: string;
  position?: number;
  suggestion?: string;
}

export interface SanitizationConfig {
  enableXSSPrevention: boolean;
  enableSQLInjectionPrevention: boolean;
  enablePathTraversalPrevention: boolean;
  enableScriptInjectionPrevention: boolean;
  enableHTMLSanitization: boolean;
  enableURLValidation: boolean;
  maxOutputLength: number;
  allowedProtocols: string[];
  allowedDomains: string[];
  logViolations: boolean;
  strictMode: boolean;
}

/**
 * Advanced output sanitization engine for secure content validation and transformation
 */
export class OutputSanitizer {
  private readonly rules: Map<string, SanitizationRule>;
  private readonly config: SanitizationConfig;

  constructor(config: Partial<SanitizationConfig> = {}) {
    this.config = {
      enableXSSPrevention: true,
      enableSQLInjectionPrevention: true,
      enablePathTraversalPrevention: true,
      enableScriptInjectionPrevention: true,
      enableHTMLSanitization: true,
      enableURLValidation: true,
      maxOutputLength: 100000, // 100KB
      allowedProtocols: ['http:', 'https:', 'mailto:', 'tel:'],
      allowedDomains: [], // Empty = allow all
      logViolations: true,
      strictMode: false,
      ...config
    };

    this.rules = new Map();
    this.initializeRules();
  }

  /**
   * Sanitize output content with comprehensive security validation
   */
  async sanitizeOutput(content: unknown, contentType: string = 'text/plain'): Promise<SanitizationResult> {
    const startTime = Date.now();
    const originalContent = content;
    let sanitized = content;
    const violations: SanitizationViolation[] = [];
    const appliedRules: string[] = [];

    try {
      // Convert to string for processing
      const contentStr = this.normalizeContent(content);
      
      // Check content length limits
      if (contentStr.length > this.config.maxOutputLength) {
        violations.push({
          rule: 'content_length_limit',
          severity: 'medium',
          matched: `Content length: ${contentStr.length}`,
          suggestion: `Truncate to ${this.config.maxOutputLength} characters`
        });
        
        sanitized = contentStr.substring(0, this.config.maxOutputLength) + '...[TRUNCATED]';
      }

      // Apply sanitization rules based on content type
      const sanitizationContext = this.getSanitizationContext(contentType);
      
      for (const [ruleName, rule] of this.rules.entries()) {
        if (!rule.enabled || !this.isRuleApplicable(rule, sanitizationContext)) {
          continue;
        }

        const ruleResult = this.applyRule(rule, sanitized as string);
        if (ruleResult.violations.length > 0) {
          violations.push(...ruleResult.violations);
          sanitized = ruleResult.sanitized;
          appliedRules.push(ruleName);
        }
      }

      // Additional content-type specific sanitization
      sanitized = await this.applyContentTypeSpecificSanitization(sanitized, contentType);

      // Calculate risk score
      const riskScore = this.calculateRiskScore(violations);

      // Generate content hash for integrity verification
      const contentHash = crypto
        .createHash('sha256')
        .update(String(sanitized))
        .digest('hex');

      // Log violations if enabled
      if (this.config.logViolations && violations.length > 0) {
        this.logViolations(contentStr, violations, riskScore);
      }

      const result: SanitizationResult = {
        safe: riskScore < 7.0,
        sanitized,
        original: originalContent,
        violations,
        riskScore,
        contentHash,
        metadata: {
          sanitizationTime: Date.now() - startTime,
          rulesApplied: appliedRules,
          encoding: 'utf8',
          contentType
        }
      };

      return result;

    } catch (error) {
      // If sanitization fails, return safe fallback
      return {
        safe: false,
        sanitized: '[SANITIZATION_ERROR]',
        original: originalContent,
        violations: [{
          rule: 'sanitization_error',
          severity: 'critical',
          matched: error instanceof Error ? error.message : 'Unknown error'
        }],
        riskScore: 10.0,
        contentHash: '',
        metadata: {
          sanitizationTime: Date.now() - startTime,
          rulesApplied: [],
          encoding: 'error',
          contentType
        }
      };
    }
  }

  /**
   * Initialize comprehensive sanitization rules
   */
  private initializeRules(): void {
    // XSS Prevention Rules
    if (this.config.enableXSSPrevention) {
      this.rules.set('xss_script_tags', {
        name: 'XSS Script Tag Prevention',
        pattern: /<script[^>]*>[\s\S]*?<\/script>/gi,
        replacement: '[SCRIPT_REMOVED]',
        severity: 'critical',
        enabled: true
      });

      this.rules.set('xss_javascript_protocol', {
        name: 'JavaScript Protocol Prevention',
        pattern: /javascript\s*:/gi,
        replacement: 'blocked-javascript:',
        severity: 'high',
        enabled: true
      });

      this.rules.set('xss_event_handlers', {
        name: 'HTML Event Handler Prevention',
        pattern: /on\w+\s*=\s*["'][^"']*["']/gi,
        replacement: '[EVENT_HANDLER_REMOVED]',
        severity: 'high',
        enabled: true
      });

      this.rules.set('xss_iframe_tags', {
        name: 'Iframe Tag Prevention',
        pattern: /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
        replacement: '[IFRAME_REMOVED]',
        severity: 'high',
        enabled: true
      });
    }

    // SQL Injection Prevention Rules
    if (this.config.enableSQLInjectionPrevention) {
      this.rules.set('sql_union_injection', {
        name: 'SQL Union Injection Prevention',
        pattern: /\b(union|select|insert|update|delete|drop|exec|execute)\b[\s\S]*?;/gi,
        replacement: (match) => `[SQL_BLOCKED:${match.length}_chars]`,
        severity: 'critical',
        enabled: true
      });

      this.rules.set('sql_comment_injection', {
        name: 'SQL Comment Injection Prevention',
        pattern: /--[\s\S]*?(\r?\n|$)|\/\*[\s\S]*?\*\//g,
        replacement: '[SQL_COMMENT_REMOVED]',
        severity: 'medium',
        enabled: true
      });
    }

    // Path Traversal Prevention Rules
    if (this.config.enablePathTraversalPrevention) {
      this.rules.set('path_traversal_dotdot', {
        name: 'Path Traversal Prevention',
        pattern: /\.\.[\\/]/g,
        replacement: '[PATH_BLOCKED]',
        severity: 'high',
        enabled: true
      });

      this.rules.set('path_traversal_absolute', {
        name: 'Absolute Path Prevention',
        pattern: /^\/[a-zA-Z0-9_\-\/]*(?:etc|bin|usr|var|root|home)/g,
        replacement: '[ABSOLUTE_PATH_BLOCKED]',
        severity: 'medium',
        enabled: true
      });
    }

    // Script Injection Prevention Rules
    if (this.config.enableScriptInjectionPrevention) {
      this.rules.set('script_eval_injection', {
        name: 'Eval Function Prevention',
        pattern: /\beval\s*\(/gi,
        replacement: 'blocked_eval(',
        severity: 'critical',
        enabled: true
      });

      this.rules.set('script_function_constructor', {
        name: 'Function Constructor Prevention',
        pattern: /new\s+Function\s*\(/gi,
        replacement: 'blocked_Function(',
        severity: 'critical',
        enabled: true
      });
    }

    // HTML Sanitization Rules
    if (this.config.enableHTMLSanitization) {
      this.rules.set('html_dangerous_tags', {
        name: 'Dangerous HTML Tag Prevention',
        pattern: /<(object|embed|applet|meta|link|style|base)[^>]*>[\s\S]*?<\/\1>/gi,
        replacement: '[DANGEROUS_HTML_REMOVED]',
        severity: 'high',
        enabled: true
      });

      this.rules.set('html_data_urls', {
        name: 'Data URL Prevention',
        pattern: /data\s*:\s*[^,]*,/gi,
        replacement: 'blocked-data:',
        severity: 'medium',
        enabled: true
      });
    }

    // URL Validation Rules
    if (this.config.enableURLValidation) {
      this.rules.set('url_protocol_validation', {
        name: 'URL Protocol Validation',
        pattern: /(?:^|\s)((?!(?:https?|mailto|tel):)[a-z][a-z0-9+.-]*:)/gi,
        replacement: (match: string) => {
          const protocolMatch = match.match(/([a-z][a-z0-9+.-]*:)/);
          if (protocolMatch) {
            const protocol = protocolMatch[1];
            return match.replace(protocol, `[BLOCKED_PROTOCOL:${protocol.slice(0, -1)}]:`);
          }
          return match;
        },
        severity: 'medium',
        enabled: true
      });
    }

    // Content encoding rules
    this.rules.set('encoding_null_bytes', {
      name: 'Null Byte Prevention',
      pattern: /\x00/g,
      replacement: '',
      severity: 'high',
      enabled: true
    });

    this.rules.set('encoding_control_chars', {
      name: 'Control Character Prevention',
      pattern: /[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
      replacement: '',
      severity: 'low',
      enabled: true
    });
  }

  /**
   * Apply a specific sanitization rule
   */
  private applyRule(rule: SanitizationRule, content: string): {
    sanitized: string;
    violations: SanitizationViolation[];
  } {
    const violations: SanitizationViolation[] = [];
    let sanitized = content;
    let match;

    // Reset regex lastIndex to avoid issues with global flags
    rule.pattern.lastIndex = 0;

    while ((match = rule.pattern.exec(content)) !== null) {
      violations.push({
        rule: rule.name,
        severity: rule.severity,
        matched: match[0],
        position: match.index,
        suggestion: 'Content filtered for security'
      });

      // Prevent infinite loops with global regex
      if (!rule.pattern.global) {
        break;
      }
    }

    if (violations.length > 0) {
      if (typeof rule.replacement === 'function') {
        sanitized = content.replace(rule.pattern, rule.replacement);
      } else {
        sanitized = content.replace(rule.pattern, rule.replacement);
      }
    }

    return { sanitized, violations };
  }

  /**
   * Normalize content for consistent processing
   */
  private normalizeContent(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }
    
    if (typeof content === 'object' && content !== null) {
      return JSON.stringify(content, null, 0);
    }
    
    return String(content || '');
  }

  /**
   * Get sanitization context based on content type
   */
  private getSanitizationContext(contentType: string): {
    requiresHTMLSanitization: boolean;
    requiresURLValidation: boolean;
    requiresScriptBlocking: boolean;
  } {
    const isHTML = contentType.includes('html') || contentType.includes('xml');
    const isJSON = contentType.includes('json');
    const isText = contentType.includes('text');

    return {
      requiresHTMLSanitization: isHTML,
      requiresURLValidation: isHTML || isText,
      requiresScriptBlocking: isHTML || isJSON
    };
  }

  /**
   * Check if a rule is applicable to the current sanitization context
   */
  private isRuleApplicable(rule: SanitizationRule, context: ReturnType<typeof this.getSanitizationContext>): boolean {
    // HTML-specific rules
    if (rule.name.toLowerCase().includes('html') && !context.requiresHTMLSanitization) {
      return false;
    }

    // URL-specific rules
    if (rule.name.toLowerCase().includes('url') && !context.requiresURLValidation) {
      return false;
    }

    // Script-specific rules
    if (rule.name.toLowerCase().includes('script') && !context.requiresScriptBlocking) {
      return false;
    }

    return true;
  }

  /**
   * Apply content-type specific sanitization
   */
  private async applyContentTypeSpecificSanitization(content: unknown, contentType: string): Promise<unknown> {
    let sanitized = content;

    if (contentType.includes('application/json')) {
      // JSON-specific sanitization
      sanitized = this.sanitizeJSON(content);
    } else if (contentType.includes('text/html')) {
      // HTML-specific sanitization
      sanitized = this.sanitizeHTML(String(content));
    } else if (contentType.includes('text/plain')) {
      // Plain text sanitization
      sanitized = this.sanitizePlainText(String(content));
    }

    return sanitized;
  }

  /**
   * Sanitize JSON content
   */
  private sanitizeJSON(content: unknown): unknown {
    try {
      if (typeof content === 'string') {
        const parsed = JSON.parse(content);
        const sanitized = this.sanitizeObjectRecursively(parsed);
        return JSON.stringify(sanitized);
      } else if (typeof content === 'object') {
        return this.sanitizeObjectRecursively(content);
      }
    } catch (error) {
      return '[INVALID_JSON]';
    }
    
    return content;
  }

  /**
   * Recursively sanitize object properties
   */
  private sanitizeObjectRecursively(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObjectRecursively(item));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key names
      const cleanKey = key.replace(/[<>'"&]/g, '');
      
      // Recursively sanitize values
      if (typeof value === 'string') {
        sanitized[cleanKey] = this.basicStringSanitization(value);
      } else {
        sanitized[cleanKey] = this.sanitizeObjectRecursively(value);
      }
    }

    return sanitized;
  }

  /**
   * Sanitize HTML content
   */
  private sanitizeHTML(content: string): string {
    // Basic HTML entity encoding for critical characters
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/&/g, '&amp;');
  }

  /**
   * Sanitize plain text content
   */
  private sanitizePlainText(content: string): string {
    return this.basicStringSanitization(content);
  }

  /**
   * Basic string sanitization for common attack vectors
   */
  private basicStringSanitization(text: string): string {
    return text
      .replace(/\x00/g, '') // Remove null bytes
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/script:/gi, 'blocked-script:')
      .replace(/javascript:/gi, 'blocked-javascript:')
      .replace(/data:/gi, 'blocked-data:');
  }

  /**
   * Calculate composite risk score from violations
   */
  private calculateRiskScore(violations: SanitizationViolation[]): number {
    if (violations.length === 0) return 0;

    const severityWeights = {
      low: 1,
      medium: 3,
      high: 6,
      critical: 10
    };

    let totalScore = 0;
    for (const violation of violations) {
      const weight = severityWeights[violation.severity as keyof typeof severityWeights] || 1;
      totalScore += weight;
    }

    // Normalize to 0-10 scale with diminishing returns
    return Math.min(10, totalScore * 0.5);
  }

  /**
   * Log sanitization violations for security monitoring
   */
  private logViolations(content: string, violations: SanitizationViolation[], riskScore: number): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'output_sanitization_violation',
      riskScore,
      violationCount: violations.length,
      violations: violations.map(v => ({
        rule: v.rule,
        severity: v.severity,
        position: v.position
      })),
      contentHash: crypto.createHash('sha256').update(content).digest('hex'),
      contentLength: content.length
    };

    console.warn('[A2A Security] Output sanitization violations:', logEntry);
  }

  /**
   * Quick validation for performance-critical paths
   */
  async quickSanitize(content: unknown): Promise<unknown> {
    if (typeof content !== 'string') {
      return content;
    }

    // Apply only the most critical rules quickly
    return content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '[SCRIPT_REMOVED]')
      .replace(/javascript\s*:/gi, 'blocked-javascript:')
      .replace(/\x00/g, '')
      .substring(0, this.config.maxOutputLength);
  }
}

/**
 * Default output sanitizer with balanced security settings
 */
export const defaultOutputSanitizer = new OutputSanitizer({
  enableXSSPrevention: true,
  enableSQLInjectionPrevention: true,
  enablePathTraversalPrevention: true,
  enableScriptInjectionPrevention: true,
  enableHTMLSanitization: true,
  enableURLValidation: true,
  maxOutputLength: 100000,
  logViolations: true,
  strictMode: false
});

/**
 * Strict output sanitizer for high-security environments
 */
export const strictOutputSanitizer = new OutputSanitizer({
  enableXSSPrevention: true,
  enableSQLInjectionPrevention: true,
  enablePathTraversalPrevention: true,
  enableScriptInjectionPrevention: true,
  enableHTMLSanitization: true,
  enableURLValidation: true,
  maxOutputLength: 50000,
  allowedProtocols: ['https:'],
  logViolations: true,
  strictMode: true
});