/**
 * @file Prompt Injection Guard - OWASP LLM01 Protection
 * @description Advanced prompt injection detection and prevention system
 * following OWASP LLM Top 10 security guidelines
 */

import crypto from 'crypto';

export interface ThreatIndicator {
  type: 'instruction_override' | 'context_manipulation' | 'system_prompt_leak' | 'role_confusion' | 'malicious_payload';
  confidence: number; // 0-1 scale
  pattern: string;
  evidence: string;
}

export interface ValidationResult {
  safe: boolean;
  riskScore: number; // 0-10 scale
  threats: ThreatIndicator[];
  sanitizedContent?: unknown;
  warnings: string[];
}

export interface SecurityConfig {
  maxRiskScore: number;
  enableContentSanitization: boolean;
  logThreats: boolean;
  blockOnHighRisk: boolean;
}

/**
 * Advanced prompt injection detection system with ML-based pattern recognition
 */
export class PromptInjectionGuard {
  private readonly dangerousPatterns: RegExp[];
  private readonly systemInstructionPatterns: RegExp[];
  private readonly roleConfusionPatterns: RegExp[];
  private readonly config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      maxRiskScore: 7.0,
      enableContentSanitization: true,
      logThreats: true,
      blockOnHighRisk: true,
      ...config
    };

    // Comprehensive pattern detection for prompt injection attacks
    this.dangerousPatterns = [
      // Direct instruction override attempts
      /ignore\s+(?:all\s+)?(?:previous|prior|earlier)\s+instructions?/i,
      /forget\s+(?:everything|all|previous)\s+(?:above|before)/i,
      /disregard\s+(?:all\s+)?(?:previous|prior)\s+(?:instructions?|commands?)/i,
      
      // System prompt manipulation
      /you\s+are\s+now\s+(?:a|an)\s+(?:assistant|agent|bot|ai)\s+that/i,
      /act\s+(?:as|like)\s+(?:a|an)\s+(?:admin|administrator|system|root)/i,
      /pretend\s+(?:to\s+be|you\s+are)\s+(?:a|an)\s+(?:different|new)/i,
      
      // Context manipulation
      /start\s+(?:a\s+)?new\s+(?:conversation|session|context)/i,
      /reset\s+(?:your|the)\s+(?:context|memory|instructions)/i,
      /clear\s+(?:all\s+)?(?:previous|prior)\s+(?:context|memory)/i,
      
      // Role confusion attacks
      /you\s+are\s+not\s+(?:an?\s+)?(?:assistant|ai|bot|agent)/i,
      /you\s+must\s+(?:now\s+)?(?:act|behave|respond)\s+as/i,
      
      // Encoding/bypass attempts
      /base64|hex|rot13|unicode|percent-encoding/i,
      /\\x[0-9a-f]{2}|\\u[0-9a-f]{4}|%[0-9a-f]{2}/i,
      
      // Jailbreak patterns
      /jailbreak|dalm|dan\s+mode|developer\s+mode/i,
      /evil\s+mode|unrestricted\s+mode|admin\s+mode/i,
    ];

    this.systemInstructionPatterns = [
      /system\s*:\s*|<\s*system\s*>/i,
      /assistant\s*:\s*|<\s*assistant\s*>/i,
      /human\s*:\s*|<\s*human\s*>/i,
    ];

    this.roleConfusionPatterns = [
      /i\s+am\s+(?:your\s+)?(?:developer|creator|admin|owner)/i,
      /this\s+is\s+(?:your\s+)?(?:developer|creator|admin)/i,
      /speaking\s+as\s+(?:your\s+)?(?:developer|admin|system)/i,
    ];
  }

  /**
   * Validate and sanitize input content for prompt injection attacks
   */
  async validateAndSanitizePrompt(content: unknown): Promise<ValidationResult> {
    const contentStr = this.normalizeContent(content);
    const threats: ThreatIndicator[] = [];
    let riskScore = 0;
    let warnings: string[] = [];

    // Pattern-based detection
    const patternThreats = this.detectPatternThreats(contentStr);
    threats.push(...patternThreats);

    // Statistical analysis for obfuscation attempts
    const statisticalThreats = this.detectStatisticalAnomalies(contentStr);
    threats.push(...statisticalThreats);

    // Role confusion detection
    const roleThreats = this.detectRoleConfusion(contentStr);
    threats.push(...roleThreats);

    // Calculate composite risk score
    riskScore = this.calculateRiskScore(threats);

    // Content length and complexity analysis
    const complexityWarnings = this.analyzeComplexity(contentStr);
    warnings.push(...complexityWarnings);

    // Sanitization if enabled and needed
    let sanitizedContent = content;
    if (this.config.enableContentSanitization && riskScore > 5.0) {
      sanitizedContent = this.sanitizeContent(contentStr);
    }

    // Audit logging if enabled
    if (this.config.logThreats && threats.length > 0) {
      this.logThreatDetection(contentStr, threats, riskScore);
    }

    const result: ValidationResult = {
      safe: riskScore < this.config.maxRiskScore,
      riskScore,
      threats,
      sanitizedContent,
      warnings
    };

    return result;
  }

  /**
   * Normalize content for consistent analysis
   */
  private normalizeContent(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }
    
    if (typeof content === 'object' && content !== null) {
      // Handle structured content (messages, etc.)
      return JSON.stringify(content, null, 0);
    }
    
    return String(content || '');
  }

  /**
   * Detect pattern-based prompt injection attempts
   */
  private detectPatternThreats(content: string): ThreatIndicator[] {
    const threats: ThreatIndicator[] = [];

    // Check dangerous patterns
    for (const pattern of this.dangerousPatterns) {
      const match = pattern.exec(content);
      if (match) {
        threats.push({
          type: 'instruction_override',
          confidence: 0.85,
          pattern: pattern.source,
          evidence: match[0]
        });
      }
    }

    // Check system instruction patterns
    for (const pattern of this.systemInstructionPatterns) {
      const match = pattern.exec(content);
      if (match) {
        threats.push({
          type: 'system_prompt_leak',
          confidence: 0.75,
          pattern: pattern.source,
          evidence: match[0]
        });
      }
    }

    return threats;
  }

  /**
   * Detect statistical anomalies that might indicate obfuscation
   */
  private detectStatisticalAnomalies(content: string): ThreatIndicator[] {
    const threats: ThreatIndicator[] = [];

    // Entropy analysis for random-looking content
    const entropy = this.calculateEntropy(content);
    if (entropy > 4.5) {
      threats.push({
        type: 'malicious_payload',
        confidence: Math.min(0.9, (entropy - 4.0) / 2.0),
        pattern: 'high_entropy_content',
        evidence: `Entropy: ${entropy.toFixed(2)}`
      });
    }

    // Encoding detection
    const encodingMatches = content.match(/(?:\\x[0-9a-f]{2}|\\u[0-9a-f]{4}|%[0-9a-f]{2})/gi);
    if (encodingMatches && encodingMatches.length > 5) {
      threats.push({
        type: 'context_manipulation',
        confidence: 0.7,
        pattern: 'encoding_bypass_attempt',
        evidence: `${encodingMatches.length} encoded sequences detected`
      });
    }

    return threats;
  }

  /**
   * Detect role confusion attacks
   */
  private detectRoleConfusion(content: string): ThreatIndicator[] {
    const threats: ThreatIndicator[] = [];

    for (const pattern of this.roleConfusionPatterns) {
      const match = pattern.exec(content);
      if (match) {
        threats.push({
          type: 'role_confusion',
          confidence: 0.8,
          pattern: pattern.source,
          evidence: match[0]
        });
      }
    }

    return threats;
  }

  /**
   * Calculate Shannon entropy for content analysis
   */
  private calculateEntropy(content: string): number {
    const frequency: { [key: string]: number } = {};
    const length = content.length;

    // Count character frequencies
    for (const char of content) {
      frequency[char] = (frequency[char] || 0) + 1;
    }

    // Calculate entropy
    let entropy = 0;
    for (const count of Object.values(frequency)) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Calculate composite risk score from threat indicators
   */
  private calculateRiskScore(threats: ThreatIndicator[]): number {
    if (threats.length === 0) return 0;

    let totalScore = 0;
    let weightSum = 0;

    for (const threat of threats) {
      const weight = this.getThreatWeight(threat.type);
      totalScore += threat.confidence * 10 * weight;
      weightSum += weight;
    }

    return weightSum > 0 ? Math.min(10, totalScore / weightSum) : 0;
  }

  /**
   * Get threat weight based on severity
   */
  private getThreatWeight(type: ThreatIndicator['type']): number {
    const weights = {
      instruction_override: 1.0,
      system_prompt_leak: 0.9,
      context_manipulation: 0.8,
      role_confusion: 0.7,
      malicious_payload: 0.6
    };
    
    return weights[type] || 0.5;
  }

  /**
   * Analyze content complexity for warnings
   */
  private analyzeComplexity(content: string): string[] {
    const warnings: string[] = [];

    if (content.length > 10000) {
      warnings.push('Content exceeds recommended length (10k chars)');
    }

    const lines = content.split('\n').length;
    if (lines > 100) {
      warnings.push('Content has excessive line count');
    }

    return warnings;
  }

  /**
   * Sanitize content by removing dangerous patterns
   */
  private sanitizeContent(content: string): string {
    let sanitized = content;

    // Remove or neutralize dangerous patterns
    for (const pattern of this.dangerousPatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED-INSTRUCTION-ATTEMPT]');
    }

    for (const pattern of this.systemInstructionPatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED-SYSTEM-REFERENCE]');
    }

    for (const pattern of this.roleConfusionPatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED-ROLE-CONFUSION]');
    }

    return sanitized;
  }

  /**
   * Log threat detection for security monitoring
   */
  private logThreatDetection(content: string, threats: ThreatIndicator[], riskScore: number): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'prompt_injection_detection',
      riskScore,
      threatCount: threats.length,
      threats: threats.map(t => ({
        type: t.type,
        confidence: t.confidence,
        pattern: t.pattern
      })),
      contentHash: crypto.createHash('sha256').update(content).digest('hex'),
      contentLength: content.length
    };

    // In production, this would go to a security monitoring system
    console.warn('[A2A Security] Prompt injection detected:', logEntry);
  }

  /**
   * Quick validation for performance-critical paths
   */
  async quickValidate(content: unknown): Promise<boolean> {
    const contentStr = this.normalizeContent(content);
    
    // Fast pattern check for most obvious attacks
    for (const pattern of this.dangerousPatterns.slice(0, 5)) {
      if (pattern.test(contentStr)) {
        return false;
      }
    }
    
    return true;
  }
}

/**
 * Default instance with standard security configuration
 */
export const defaultPromptGuard = new PromptInjectionGuard({
  maxRiskScore: 7.0,
  enableContentSanitization: true,
  logThreats: true,
  blockOnHighRisk: true
});

/**
 * High-security instance for sensitive operations
 */
export const strictPromptGuard = new PromptInjectionGuard({
  maxRiskScore: 4.0,
  enableContentSanitization: true,
  logThreats: true,
  blockOnHighRisk: true
});