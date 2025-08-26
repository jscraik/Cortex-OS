/**
 * @file Capability Validation Service for A2A Agent Protocol & MCP
 * @description Ensures agent compatibility and security through comprehensive capability validation
 * Following OWASP LLM Top 10 security guidelines and TDD Red-Green-Refactor methodology
 */

// Import from existing type definitions in the package
// (AgentCapabilities type available but not directly used in this module)

// Define a single capability interface for validation
export interface AgentCapability {
  id: string;
  description: string;
  permissions?: string[];
  securityLevel?: number;
  rateLimit?: number;
}

/**
 * Agent registration interface for validation
 */
export interface AgentRegistration {
  agentId: string;
  name: string;
  capabilities: AgentCapability[];
  trustLevel: number; // 1-5 scale
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  /** Rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Rule type */
  type: 'security' | 'compatibility' | 'performance' | 'resource';
  /** Rule severity */
  severity: 'error' | 'warning' | 'info';
  /** Validation function */
  validate: (capability: AgentCapability, context: ValidationContext) => ValidationResult;
}

/**
 * Validation context
 */
export interface ValidationContext {
  /** Agent being validated */
  agent: AgentRegistration;
  /** Other agents in the system */
  availableAgents: AgentRegistration[];
  /** System constraints */
  systemConstraints: {
    maxMemoryMB: number;
    maxCpuCores: number;
    maxNetworkMbps: number;
  };
  /** Security policies */
  securityPolicies: SecurityPolicy[];
}

/**
 * Security policy definition
 */
export interface SecurityPolicy {
  /** Policy identifier */
  id: string;
  /** Policy name */
  name: string;
  /** Minimum trust level required */
  minTrustLevel: number;
  /** Allowed capability patterns */
  allowedCapabilities: string[];
  /** Denied capability patterns */
  deniedCapabilities: string[];
  /** Required permissions */
  requiredPermissions: string[];
  /** Rate limit policies */
  rateLimits: {
    capability: string;
    requestsPerMinute: number;
  }[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Validation passed */
  valid: boolean;
  /** Validation message */
  message: string;
  /** Additional details */
  details?: Record<string, unknown>;
  /** Suggested fixes */
  suggestions?: string[];
}

/**
 * Comprehensive validation report
 */
export interface CapabilityValidationReport {
  /** Agent ID */
  agentId: string;
  /** Overall validation status */
  valid: boolean;
  /** Validation timestamp */
  timestamp: number;
  /** Individual capability results */
  capabilityResults: CapabilityValidationResult[];
  /** Summary statistics */
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  /** Recommendations */
  recommendations: ValidationRecommendation[];
}

/**
 * Individual capability validation result
 */
export interface CapabilityValidationResult {
  /** Capability being validated */
  capability: AgentCapability;
  /** Rule results */
  ruleResults: RuleValidationResult[];
  /** Overall capability status */
  status: 'valid' | 'invalid' | 'warning';
}

/**
 * Rule validation result
 */
export interface RuleValidationResult {
  /** Rule that was applied */
  rule: ValidationRule;
  /** Validation result */
  result: ValidationResult;
  /** Execution time in ms */
  executionTime: number;
}

/**
 * Validation recommendation
 */
export interface ValidationRecommendation {
  /** Recommendation type */
  type: 'security' | 'performance' | 'compatibility';
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  /** Recommendation message */
  message: string;
  /** Actionable steps */
  actions: string[];
  /** Affected capabilities */
  affectedCapabilities: string[];
}

/**
 * Capability Validation Service
 * Implements comprehensive security and compatibility validation
 */
export class CapabilityValidationService {
  private validationRules: Map<string, ValidationRule> = new Map();
  private securityPolicies: Map<string, SecurityPolicy> = new Map();

  constructor() {
    this.initializeDefaultRules();
    this.initializeDefaultPolicies();
  }

  /**
   * Validate all capabilities of an agent
   */
  async validateAgent(
    agent: AgentRegistration,
    context: Omit<ValidationContext, 'agent'>
  ): Promise<CapabilityValidationReport> {
    const fullContext: ValidationContext = {
      ...context,
      agent
    };

    const capabilityResults: CapabilityValidationResult[] = [];
    let totalPassed = 0;
    let totalFailed = 0;
    let totalWarnings = 0;

    for (const capability of agent.capabilities) {
      const ruleResults: RuleValidationResult[] = [];

      for (const rule of this.validationRules.values()) {
        const startTime = performance.now();
        const result = rule.validate(capability, fullContext);
        const executionTime = performance.now() - startTime;

        ruleResults.push({
          rule,
          result,
          executionTime
        });

        if (!result.valid) {
          if (rule.severity === 'error') {
            totalFailed++;
          } else {
            totalWarnings++;
          }
        } else {
          totalPassed++;
        }
      }

      const status: 'valid' | 'invalid' | 'warning' = 
        ruleResults.some(r => !r.result.valid && r.rule.severity === 'error') ? 'invalid' :
        ruleResults.some(r => !r.result.valid && r.rule.severity === 'warning') ? 'warning' :
        'valid';

      capabilityResults.push({
        capability,
        ruleResults,
        status
      });
    }

    const recommendations = await this.generateRecommendations(capabilityResults);
    const overallValid = totalFailed === 0;

    return {
      agentId: agent.agentId,
      valid: overallValid,
      timestamp: Date.now(),
      capabilityResults,
      summary: {
        total: totalPassed + totalFailed + totalWarnings,
        passed: totalPassed,
        failed: totalFailed,
        warnings: totalWarnings
      },
      recommendations
    };
  }

  /**
   * Validate capability compatibility between agents
   */
  async validateCompatibility(
    sourceAgent: AgentRegistration,
    targetAgent: AgentRegistration,
    requestedCapability: string
  ): Promise<ValidationResult> {
    // Check if target agent has the requested capability
    const targetCapability = targetAgent.capabilities.find(cap => cap.id === requestedCapability);
    if (!targetCapability) {
      return {
        valid: false,
        message: `Target agent does not have capability '${requestedCapability}'`,
        suggestions: [`Implement capability '${requestedCapability}' in target agent`]
      };
    }

    // Check trust level compatibility
    if (sourceAgent.trustLevel < (targetCapability.securityLevel || 1)) {
      return {
        valid: false,
        message: `Source agent trust level (${sourceAgent.trustLevel}) below required security level (${targetCapability.securityLevel})`,
        suggestions: [`Increase source agent trust level to ${targetCapability.securityLevel} or higher`]
      };
    }

    // Check permission compatibility
    const sourceCapability = sourceAgent.capabilities.find(cap => cap.id === requestedCapability);
    if (sourceCapability && targetCapability.permissions) {
      const missingPermissions = targetCapability.permissions.filter(
        perm => !sourceCapability.permissions?.includes(perm)
      );
      
      if (missingPermissions.length > 0) {
        return {
          valid: false,
          message: `Source agent missing required permissions: ${missingPermissions.join(', ')}`,
          suggestions: [`Grant permissions: ${missingPermissions.join(', ')}`]
        };
      }
    }

    return {
      valid: true,
      message: `Compatibility validated for capability '${requestedCapability}'`
    };
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.set(rule.id, rule);
  }

  /**
   * Remove validation rule
   */
  removeValidationRule(ruleId: string): boolean {
    return this.validationRules.delete(ruleId);
  }

  /**
   * Get all validation rules
   */
  getValidationRules(): ValidationRule[] {
    return Array.from(this.validationRules.values());
  }

  /**
   * Add security policy
   */
  addSecurityPolicy(policy: SecurityPolicy): void {
    this.securityPolicies.set(policy.id, policy);
  }

  /**
   * Remove security policy
   */
  removeSecurityPolicy(policyId: string): boolean {
    return this.securityPolicies.delete(policyId);
  }

  /**
   * Get all security policies
   */
  getSecurityPolicies(): SecurityPolicy[] {
    return Array.from(this.securityPolicies.values());
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // Security level validation
    this.addValidationRule({
      id: 'security-level-check',
      name: 'Security Level Validation',
      description: 'Validates capability security levels are within acceptable range',
      type: 'security',
      severity: 'error',
      validate: (capability, _context) => {
        const securityLevel = capability.securityLevel !== undefined ? capability.securityLevel : 1;
        
        if (securityLevel < 1 || securityLevel > 5) {
          return {
            valid: false,
            message: `Security level ${securityLevel} outside valid range (1-5)`,
            suggestions: ['Set security level between 1 and 5']
          };
        }

        // System capabilities require higher security level
        if (capability.id.startsWith('system.') && securityLevel < 4) {
          return {
            valid: false,
            message: `System capability '${capability.id}' requires security level >= 4`,
            suggestions: [`Increase security level to 4 or higher for '${capability.id}'`]
          };
        }

        return {
          valid: true,
          message: 'Security level validation passed'
        };
      }
    });

    // Permission validation
    this.addValidationRule({
      id: 'permission-validation',
      name: 'Permission Validation',
      description: 'Validates capability permissions are properly defined',
      type: 'security',
      severity: 'warning',
      validate: (capability, _context) => {
        if (!capability.permissions || capability.permissions.length === 0) {
          return {
            valid: false,
            message: `Capability '${capability.id}' has no permissions defined`,
            suggestions: ['Define specific permissions for this capability']
          };
        }

        // Check for wildcard permissions
        if (capability.permissions.includes('*')) {
          return {
            valid: false,
            message: `Capability '${capability.id}' uses wildcard permission`,
            suggestions: ['Replace wildcard with specific permissions']
          };
        }

        return {
          valid: true,
          message: 'Permission validation passed'
        };
      }
    });

    // Rate limit validation
    this.addValidationRule({
      id: 'rate-limit-check',
      name: 'Rate Limit Validation',
      description: 'Validates capability rate limits are reasonable',
      type: 'performance',
      severity: 'warning',
      validate: (capability, _context) => {
        if (capability.rateLimit && capability.rateLimit > 1000) {
          return {
            valid: false,
            message: `Rate limit ${capability.rateLimit} exceeds recommended maximum (1000)`,
            suggestions: ['Reduce rate limit to <= 1000 requests per minute']
          };
        }

        return {
          valid: true,
          message: 'Rate limit validation passed'
        };
      }
    });

    // Capability naming validation
    this.addValidationRule({
      id: 'capability-naming',
      name: 'Capability Naming Convention',
      description: 'Validates capability IDs follow naming conventions',
      type: 'compatibility',
      severity: 'warning',
      validate: (capability, _context) => {
        // Must be lowercase with dots as separators
        const namingPattern = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/;
        
        if (!namingPattern.test(capability.id)) {
          return {
            valid: false,
            message: `Capability ID '${capability.id}' violates naming convention`,
            suggestions: ['Use lowercase letters, numbers, and dots only (e.g., "file.read", "system.shutdown")']
          };
        }

        return {
          valid: true,
          message: 'Capability naming validation passed'
        };
      }
    });

    // Documentation quality validation
    this.addValidationRule({
      id: 'documentation-quality',
      name: 'Documentation Quality',
      description: 'Validates capability descriptions are comprehensive',
      type: 'compatibility',
      severity: 'info',
      validate: (capability, _context) => {
        if (!capability.description || capability.description.length < 10) {
          return {
            valid: false,
            message: `Capability '${capability.id}' has insufficient description`,
            suggestions: ['Provide a detailed description (at least 10 characters)']
          };
        }

        return {
          valid: true,
          message: 'Documentation quality validation passed'
        };
      }
    });
  }

  /**
   * Initialize default security policies
   */
  private initializeDefaultPolicies(): void {
    this.addSecurityPolicy({
      id: 'default-security-policy',
      name: 'Default Security Policy',
      minTrustLevel: 1,
      allowedCapabilities: ['*'],
      deniedCapabilities: [],
      requiredPermissions: [],
      rateLimits: []
    });

    this.addSecurityPolicy({
      id: 'system-security-policy',
      name: 'System Operations Security Policy',
      minTrustLevel: 4,
      allowedCapabilities: ['system.*'],
      deniedCapabilities: [],
      requiredPermissions: ['admin'],
      rateLimits: [
        { capability: 'system.*', requestsPerMinute: 10 }
      ]
    });
  }

  /**
   * Generate recommendations based on validation results
   */
  private async generateRecommendations(
    capabilityResults: CapabilityValidationResult[]
  ): Promise<ValidationRecommendation[]> {
    const recommendations: ValidationRecommendation[] = [];
    const securityIssues: string[] = [];
    const performanceIssues: string[] = [];
    const compatibilityIssues: string[] = [];

    for (const result of capabilityResults) {
      for (const ruleResult of result.ruleResults) {
        if (!ruleResult.result.valid) {
          const capabilityId = result.capability.id;
          
          switch (ruleResult.rule.type) {
            case 'security':
              securityIssues.push(capabilityId);
              break;
            case 'performance':
              performanceIssues.push(capabilityId);
              break;
            case 'compatibility':
              compatibilityIssues.push(capabilityId);
              break;
          }
        }
      }
    }

    if (securityIssues.length > 0) {
      recommendations.push({
        type: 'security',
        priority: 'high',
        message: 'Security validation failures detected',
        actions: [
          'Review security levels and permissions',
          'Ensure system capabilities have appropriate security levels',
          'Remove wildcard permissions'
        ],
        affectedCapabilities: securityIssues
      });
    }

    if (performanceIssues.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Performance optimization opportunities identified',
        actions: [
          'Review and optimize rate limits',
          'Consider capability resource requirements'
        ],
        affectedCapabilities: performanceIssues
      });
    }

    if (compatibilityIssues.length > 0) {
      recommendations.push({
        type: 'compatibility',
        priority: 'low',
        message: 'Compatibility improvements recommended',
        actions: [
          'Follow capability naming conventions',
          'Improve capability documentation',
          'Ensure consistent capability definitions'
        ],
        affectedCapabilities: compatibilityIssues
      });
    }

    return recommendations;
  }
}

/**
 * Create a new capability validation service
 */
export function createValidationService(): CapabilityValidationService {
  return new CapabilityValidationService();
}