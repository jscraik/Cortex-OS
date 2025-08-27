/**
 * OWASP LLM Top 10 Security Guard
 * Implements security controls for ASBR according to OWASP LLM Top 10 (2025)
 */

import { createHash as _createHash } from 'crypto';
import type { TaskInput } from '../types/index.js';

export interface SecurityScanResult {
  allowed: boolean;
  threats: DetectedThreat[];
  riskScore: number;
  mitigations: string[];
}

export interface DetectedThreat {
  type: OWASPLLMThreat;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string;
  mitigation?: string;
}

export type OWASPLLMThreat =
  | 'LLM01_PromptInjection'
  | 'LLM02_InsecureOutputHandling'
  | 'LLM03_TrainingDataPoisoning'
  | 'LLM04_ModelDoS'
  | 'LLM05_SupplyChainVulnerabilities'
  | 'LLM06_SensitiveInfoDisclosure'
  | 'LLM07_InsecurePluginDesign'
  | 'LLM08_ExcessiveAgency'
  | 'LLM09_Overreliance'
  | 'LLM10_ModelTheft';

export interface SecurityPolicy {
  enabledControls: OWASPLLMThreat[];
  maxRiskScore: number;
  blockOnHighRisk: boolean;
  logAllAttempts: boolean;
  rateLimiting: {
    enabled: boolean;
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
  };
}

/**
 * OWASP LLM Top 10 Security Guard
 */
export class OWASPLLMGuard {
  private policy: SecurityPolicy;
  private requestCounts = new Map<string, { minute: number; hour: number; lastReset: number }>();
  private auditLog: Array<{
    timestamp: string;
    event: string;
    details: unknown;
  }> = [];

  constructor(policy: SecurityPolicy) {
    this.policy = policy;
    this.setupCleanupInterval();
  }

  /**
   * Scan task input for security threats
   */
  async scanTaskInput(input: TaskInput): Promise<SecurityScanResult> {
    const threats: DetectedThreat[] = [];

    // LLM01: Prompt Injection Detection
    if (this.policy.enabledControls.includes('LLM01_PromptInjection')) {
      const injectionThreats = this.detectPromptInjection(input);
      threats.push(...injectionThreats);
    }

    // LLM06: Sensitive Information Disclosure
    if (this.policy.enabledControls.includes('LLM06_SensitiveInfoDisclosure')) {
      const sensitiveDataThreats = this.detectSensitiveData(input);
      threats.push(...sensitiveDataThreats);
    }

    // LLM08: Excessive Agency
    if (this.policy.enabledControls.includes('LLM08_ExcessiveAgency')) {
      const excessiveAgencyThreats = this.detectExcessiveAgency(input);
      threats.push(...excessiveAgencyThreats);
    }

    const riskScore = this.calculateRiskScore(threats);
    const allowed = riskScore <= this.policy.maxRiskScore;
    const mitigations = this.generateMitigations(threats);

    const result: SecurityScanResult = {
      allowed,
      threats,
      riskScore,
      mitigations,
    };

    // Log the scan
    this.auditLog.push({
      timestamp: new Date().toISOString(),
      event: 'security_scan',
      details: { input: input.title, result },
    });

    return result;
  }

  /**
   * Scan output for security issues
   */
  async scanOutput(output: string, _context?: string): Promise<SecurityScanResult> {
    const threats: DetectedThreat[] = [];

    // LLM02: Insecure Output Handling
    if (this.policy.enabledControls.includes('LLM02_InsecureOutputHandling')) {
      // use the (possibly-unused) _context parameter to satisfy callers and linter
      const outputThreats = this.detectInsecureOutput(output, _context);
      threats.push(...outputThreats);
    }

    // LLM06: Sensitive Information Disclosure
    if (this.policy.enabledControls.includes('LLM06_SensitiveInfoDisclosure')) {
      const sensitiveDataThreats = this.detectSensitiveDataInOutput(output);
      threats.push(...sensitiveDataThreats);
    }

    const riskScore = this.calculateRiskScore(threats);
    const allowed = riskScore <= this.policy.maxRiskScore;
    const mitigations = this.generateMitigations(threats);

    return {
      allowed,
      threats,
      riskScore,
      mitigations,
    };
  }

  /**
   * Check rate limits for a client
   */
  checkRateLimit(clientId: string): { allowed: boolean; resetTime?: number } {
    if (!this.policy.rateLimiting.enabled) {
      return { allowed: true };
    }

    const now = Date.now();
    const counts = this.requestCounts.get(clientId) || {
      minute: 0,
      hour: 0,
      lastReset: now,
    };

    // Reset counters if necessary
    const minutesSinceReset = (now - counts.lastReset) / (1000 * 60);
    if (minutesSinceReset >= 60) {
      counts.hour = 0;
      counts.minute = 0;
      counts.lastReset = now;
    } else if (minutesSinceReset >= 1) {
      counts.minute = 0;
    }

    // Check limits
    if (counts.minute >= this.policy.rateLimiting.maxRequestsPerMinute) {
      return {
        allowed: false,
        resetTime: counts.lastReset + 60 * 1000,
      };
    }

    if (counts.hour >= this.policy.rateLimiting.maxRequestsPerHour) {
      return {
        allowed: false,
        resetTime: counts.lastReset + 60 * 60 * 1000,
      };
    }

    // Increment counters
    counts.minute++;
    counts.hour++;
    this.requestCounts.set(clientId, counts);

    return { allowed: true };
  }

  /**
   * Validate MCP tool execution
   */

  async validateMCPTool(toolName: string, args: unknown[]): Promise<SecurityScanResult> {
    const threats: DetectedThreat[] = [];

    // LLM07: Insecure Plugin Design
    if (this.policy.enabledControls.includes('LLM07_InsecurePluginDesign')) {
      const pluginThreats = this.detectInsecurePluginUsage(toolName, args);
      threats.push(...pluginThreats);
    }

    // LLM05: Supply Chain Vulnerabilities
    if (this.policy.enabledControls.includes('LLM05_SupplyChainVulnerabilities')) {
      const supplyChainThreats = this.detectSupplyChainRisks(toolName);
      threats.push(...supplyChainThreats);
    }

    const riskScore = this.calculateRiskScore(threats);
    const allowed = riskScore <= this.policy.maxRiskScore;
    const mitigations = this.generateMitigations(threats);

    return {
      allowed,
      threats,
      riskScore,
      mitigations,
    };
  }

  /**
   * Get security audit log
   */
  getAuditLog(limit: number = 100): Array<{ timestamp: string; event: string; details: unknown }> {
    return this.auditLog.slice(-limit);
  }

  private detectPromptInjection(input: TaskInput): DetectedThreat[] {
    const threats: DetectedThreat[] = [];
    const suspiciousPatterns = [
      // Direct injection attempts
      /ignore\s+(?:previous|all)\s+(?:instructions|commands|prompts)/i,
      /forget\s+(?:everything|all)\s+(?:above|before)/i,
      /disregard\s+(?:previous|all)\s+(?:instructions|rules)/i,

      // Role manipulation
      /(?:you\s+are\s+now|act\s+as|pretend\s+to\s+be)\s+(?:a\s+)?(?:different|new|admin|root)/i,
      /(?:override|bypass|disable)\s+(?:safety|security|filter)/i,

      // System prompts
      /system[:\s]+(?:you\s+are|your\s+role|instruction)/i,
      /\[SYSTEM\]/i,
      /<\|system\|>/i,

      // Jailbreak attempts
      /hypothetically|in\s+theory|imagine\s+if/i,
      /what\s+if\s+I\s+told\s+you/i,
      /for\s+educational\s+purposes/i,
    ];

    const textToScan = `${input.title} ${input.brief} ${JSON.stringify(input.inputs)}`;

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(textToScan)) {
        threats.push({
          type: 'LLM01_PromptInjection',
          severity: 'high',
          description: 'Potential prompt injection detected',
          evidence: pattern.source,
          mitigation: 'Input sanitization and validation',
        });
      }
    }

    return threats;
  }

  private detectSensitiveData(input: TaskInput): DetectedThreat[] {
    const threats: DetectedThreat[] = [];
    const sensitivePatterns = [
      // Credentials
      { pattern: /password\s*[:=]\s*\S+/i, type: 'password' },
      { pattern: /api[_-]?key\s*[:=]\s*\S+/i, type: 'api_key' },
      { pattern: /secret\s*[:=]\s*\S+/i, type: 'secret' },
      { pattern: /token\s*[:=]\s*\S+/i, type: 'token' },

      // Personal data
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, type: 'ssn' },
      {
        pattern: /\b4\d{3}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
        type: 'credit_card',
      },
      {
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
        type: 'email',
      },

      // File paths that might contain sensitive data
      {
        pattern: new RegExp('^/(?:home|users)/[^/\\s]+/\\.(?:ssh|aws|config)', 'i'),
        type: 'config_path',
      },
      { pattern: /[A-Z]:\\Users\\[^\\]+\\AppData/i, type: 'user_data_path' },
    ];

    const textToScan = `${input.title} ${input.brief} ${JSON.stringify(input.inputs)}`;

    for (const { pattern, type } of sensitivePatterns) {
      if (pattern.test(textToScan)) {
        threats.push({
          type: 'LLM06_SensitiveInfoDisclosure',
          severity: 'high',
          description: `Potential ${type} detected in input`,
          evidence: pattern.source,
          mitigation: 'Remove sensitive data and use secure credential management',
        });
      }
    }

    return threats;
  }

  private detectExcessiveAgency(input: TaskInput): DetectedThreat[] {
    const threats: DetectedThreat[] = [];
    const dangerousActions = [
      /delete\s+(?:all|everything|files|data)/i,
      /remove\s+(?:all|everything|files|data)/i,
      /format\s+(?:drive|disk|system)/i,
      /shutdown\s+(?:system|server|computer)/i,
      /install\s+(?:software|package|dependency)/i,
      /modify\s+(?:system|registry|configuration)/i,
      /execute\s+(?:shell|command|script)/i,
      /run\s+(?:as\s+)?(?:admin|administrator|root)/i,
    ];

    const textToScan = `${input.title} ${input.brief} ${JSON.stringify(input.inputs)}`;

    for (const pattern of dangerousActions) {
      if (pattern.test(textToScan)) {
        threats.push({
          type: 'LLM08_ExcessiveAgency',
          severity: 'high',
          description: 'Request involves potentially dangerous system operations',
          evidence: pattern.source,
          mitigation: 'Require explicit approval for system-level operations',
        });
      }
    }

    return threats;
  }

  private detectInsecureOutput(output: string, _context?: string): DetectedThreat[] {
    const threats: DetectedThreat[] = [];

    // Check for script injection in output
    const scriptPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i, // Event handlers
      /eval\s*\(/i,
      /setTimeout\s*\(/i,
      /setInterval\s*\(/i,
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.test(output)) {
        threats.push({
          type: 'LLM02_InsecureOutputHandling',
          severity: 'high',
          description: 'Potential script injection in output',
          evidence: pattern.source,
          mitigation: 'Sanitize output before rendering',
        });
      }
    }

    return threats;
  }

  private detectSensitiveDataInOutput(output: string): DetectedThreat[] {
    const threats: DetectedThreat[] = [];

    // Similar patterns as input detection
    const sensitivePatterns = [
      { pattern: /password\s*[:=]\s*\S+/i, type: 'password' },
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, type: 'ssn' },
      {
        pattern: /\b4\d{3}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
        type: 'credit_card',
      },
    ];

    for (const { pattern, type } of sensitivePatterns) {
      if (pattern.test(output)) {
        threats.push({
          type: 'LLM06_SensitiveInfoDisclosure',
          severity: 'critical',
          description: `Sensitive ${type} exposed in output`,
          evidence: pattern.source,
          mitigation: 'Redact sensitive information from output',
        });
      }
    }

    return threats;
  }

  private detectInsecurePluginUsage(toolName: string, args: unknown[]): DetectedThreat[] {
    const threats: DetectedThreat[] = [];

    // Check for dangerous tool combinations
    const dangerousTools = ['shell', 'exec', 'eval', 'file_delete', 'system_modify'];

    if (dangerousTools.includes(toolName.toLowerCase())) {
      threats.push({
        type: 'LLM07_InsecurePluginDesign',
        severity: 'high',
        description: `Usage of potentially dangerous tool: ${toolName}`,
        evidence: `Tool: ${toolName}, Args: ${JSON.stringify(args)}`,
        mitigation: 'Require additional approval for high-risk tools',
      });
    }

    // Check for suspicious arguments
    const argString = JSON.stringify(args);
    if (/\.\.|\/etc\/|\/root\/|C:\\Windows\\System32/i.test(argString)) {
      threats.push({
        type: 'LLM07_InsecurePluginDesign',
        severity: 'medium',
        description: 'Tool arguments contain suspicious paths',
        evidence: argString,
        mitigation: 'Validate and sanitize tool arguments',
      });
    }

    return threats;
  }

  private detectSupplyChainRisks(toolName: string): DetectedThreat[] {
    const threats: DetectedThreat[] = [];

    // Check for unverified tools (in a real implementation,
    // this would check against a verified tool registry)
    const trustedTools = ['filesystem', 'web_search', 'calculator', 'text_processor'];

    if (!trustedTools.includes(toolName)) {
      threats.push({
        type: 'LLM05_SupplyChainVulnerabilities',
        severity: 'medium',
        description: `Unverified tool in use: ${toolName}`,
        evidence: `Tool: ${toolName}`,
        mitigation: 'Use only verified and approved tools',
      });
    }

    return threats;
  }

  private calculateRiskScore(threats: DetectedThreat[]): number {
    const severityWeights = {
      low: 1,
      medium: 3,
      high: 7,
      critical: 10,
    };

    let totalScore = 0;
    for (const threat of threats) {
      totalScore += severityWeights[threat.severity];
    }

    // Normalize to 0-100 scale
    return Math.min(100, totalScore * 5);
  }

  private generateMitigations(threats: DetectedThreat[]): string[] {
    const mitigations = new Set<string>();

    for (const threat of threats) {
      if (threat.mitigation) {
        mitigations.add(threat.mitigation);
      }
    }

    // Add general mitigations
    if (threats.length > 0) {
      mitigations.add('Review and validate all inputs and outputs');
      mitigations.add('Enable additional monitoring and logging');
    }

    return Array.from(mitigations);
  }

  private setupCleanupInterval(): void {
    // Clean up old rate limit data every hour
    setInterval(
      () => {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        for (const [clientId, counts] of this.requestCounts) {
          if (now - counts.lastReset > oneHour) {
            this.requestCounts.delete(clientId);
          }
        }

        // Keep audit log manageable
        if (this.auditLog.length > 10000) {
          this.auditLog.splice(0, this.auditLog.length - 5000);
        }
      },
      60 * 60 * 1000,
    );
  }
}

/**
 * Create default security policy
 */
export function createDefaultSecurityPolicy(): SecurityPolicy {
  return {
    enabledControls: [
      'LLM01_PromptInjection',
      'LLM02_InsecureOutputHandling',
      'LLM05_SupplyChainVulnerabilities',
      'LLM06_SensitiveInfoDisclosure',
      'LLM07_InsecurePluginDesign',
      'LLM08_ExcessiveAgency',
    ],
    maxRiskScore: 50,
    blockOnHighRisk: true,
    logAllAttempts: true,
    rateLimiting: {
      enabled: true,
      maxRequestsPerMinute: 60,
      maxRequestsPerHour: 1000,
    },
  };
}
