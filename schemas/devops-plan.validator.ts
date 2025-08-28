/**
 * DevOps Plan Schema Validator
 * @fileoverview Comprehensive validation system for DevOps planning configurations
 */

import Ajv, { JSONSchemaType, ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  DevOpsPlan,
  ValidationResult,
  ValidationConfig,
  ValidationError,
  ValidationWarning,
} from './devops-plan.types.js';

/**
 * DevOps Plan Validator class with comprehensive validation capabilities
 */
export class DevOpsPlanValidator {
  private ajv: Ajv;
  private validateFunction: ValidateFunction<DevOpsPlan>;
  private schema: JSONSchemaType<DevOpsPlan>;

  constructor(config: ValidationConfig = {}) {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: config.strict ?? true,
      allowUnionTypes: true,
      removeAdditional: config.removeAdditional ?? false,
      useDefaults: config.useDefaults ?? true,
      coerceTypes: config.coerceTypes ?? false,
    });

    // Add format validation
    addFormats(this.ajv);

    // Load and compile schema
    this.loadSchema();
    this.validateFunction = this.ajv.compile(this.schema);
  }

  /**
   * Load the DevOps plan schema from file
   */
  private loadSchema(): void {
    try {
      const schemaPath = resolve(process.cwd(), 'devops.plan.schema.json');
      const schemaContent = readFileSync(schemaPath, 'utf-8');
      this.schema = JSON.parse(schemaContent) as JSONSchemaType<DevOpsPlan>;
    } catch (error) {
      throw new Error(
        `Failed to load DevOps plan schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Validate a DevOps plan configuration
   * @param plan The DevOps plan to validate
   * @returns Validation result with errors and warnings
   */
  validate(plan: unknown): ValidationResult {
    const isValid = this.validateFunction(plan);

    if (isValid) {
      const warnings = this.generateWarnings(plan as DevOpsPlan);
      return {
        valid: true,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    }

    const errors = this.formatErrors(this.validateFunction.errors || []);
    const warnings = this.generateWarnings(plan as DevOpsPlan);

    return {
      valid: false,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate and throw on error
   * @param plan The DevOps plan to validate
   * @throws ValidationError if validation fails
   */
  validateOrThrow(plan: unknown): asserts plan is DevOpsPlan {
    const result = this.validate(plan);
    if (!result.valid) {
      const errorMessages =
        result.errors?.map((e) => `${e.path}: ${e.message}`).join('; ') || 'Validation failed';
      throw new Error(`DevOps plan validation failed: ${errorMessages}`);
    }
  }

  /**
   * Format Ajv errors into structured validation errors
   */
  private formatErrors(ajvErrors: ErrorObject[]): ValidationError[] {
    return ajvErrors.map((error) => ({
      path: error.instancePath || error.schemaPath,
      message: this.getHumanReadableError(error),
      code: error.keyword,
      severity: this.getErrorSeverity(error.keyword) as 'error' | 'warning',
    }));
  }

  /**
   * Generate helpful warnings for common issues
   */
  private generateWarnings(plan: DevOpsPlan): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check for production environment without approval requirements
    if (this.hasProductionEnvironment(plan) && !this.hasApprovalRequired(plan)) {
      warnings.push({
        path: 'security.approvals',
        message: 'Production environments should require approvals for security',
        suggestion: 'Consider adding security.approvals.required: true',
      });
    }

    // Check for missing health checks in production
    if (this.hasProductionEnvironment(plan) && !this.hasHealthChecks(plan)) {
      warnings.push({
        path: 'monitoring.healthChecks',
        message: 'Production environments should include health checks',
        suggestion: 'Add health checks to monitor service availability',
      });
    }

    // Check for missing rollback strategy
    if (!plan.rollback) {
      warnings.push({
        path: 'rollback',
        message: 'No rollback strategy defined',
        suggestion: 'Consider adding a rollback strategy for safer deployments',
      });
    }

    // Check for missing security scanning
    if (!plan.security?.scanners?.length) {
      warnings.push({
        path: 'security.scanners',
        message: 'No security scanners configured',
        suggestion: 'Add security scanners like sast, dast, or dependency-scan',
      });
    }

    // Check for canary deployment without analysis
    if (plan.deploymentStrategy.type === 'canary' && !plan.deploymentStrategy.canary?.analysis) {
      warnings.push({
        path: 'deploymentStrategy.canary.analysis',
        message: 'Canary deployment without analysis configuration',
        suggestion: 'Add analysis templates to monitor canary deployment health',
      });
    }

    return warnings;
  }

  /**
   * Generate human-readable error messages
   */
  private getHumanReadableError(error: ErrorObject): string {
    switch (error.keyword) {
      case 'required':
        return `Missing required property: ${error.params?.missingProperty}`;
      case 'type':
        return `Expected ${error.params?.type} but received ${typeof error.data}`;
      case 'format':
        return `Invalid ${error.params?.format} format`;
      case 'pattern':
        return `Value does not match required pattern: ${error.params?.pattern}`;
      case 'enum':
        return `Value must be one of: ${error.params?.allowedValues?.join(', ')}`;
      case 'minimum':
        return `Value must be >= ${error.params?.limit}`;
      case 'maximum':
        return `Value must be <= ${error.params?.limit}`;
      case 'minLength':
        return `String must have at least ${error.params?.limit} characters`;
      case 'maxLength':
        return `String must have at most ${error.params?.limit} characters`;
      case 'minItems':
        return `Array must have at least ${error.params?.limit} items`;
      case 'uniqueItems':
        return 'Array items must be unique';
      case 'additionalProperties':
        return `Unknown property: ${error.params?.additionalProperty}`;
      default:
        return error.message || 'Validation error';
    }
  }

  /**
   * Determine error severity based on keyword
   */
  private getErrorSeverity(keyword: string): 'error' | 'warning' {
    const warningKeywords = ['format', 'additionalProperties'];
    return warningKeywords.includes(keyword) ? 'warning' : 'error';
  }

  /**
   * Check if plan has production environment
   */
  private hasProductionEnvironment(plan: DevOpsPlan): boolean {
    return Object.values(plan.environments).some((env) => env.type === 'production');
  }

  /**
   * Check if plan has approval requirements
   */
  private hasApprovalRequired(plan: DevOpsPlan): boolean {
    return plan.security?.approvals?.required === true;
  }

  /**
   * Check if plan has health checks configured
   */
  private hasHealthChecks(plan: DevOpsPlan): boolean {
    return Boolean(plan.monitoring?.healthChecks?.length);
  }

  /**
   * Get schema information
   */
  getSchemaInfo(): object {
    return {
      id: this.schema.$id,
      title: this.schema.title,
      description: this.schema.description,
      version: this.schema.version,
    };
  }
}

/**
 * Factory function to create a validator instance
 */
export function createDevOpsPlanValidator(config?: ValidationConfig): DevOpsPlanValidator {
  return new DevOpsPlanValidator(config);
}

/**
 * Quick validation function for simple use cases
 */
export function validateDevOpsPlan(plan: unknown, config?: ValidationConfig): ValidationResult {
  const validator = createDevOpsPlanValidator(config);
  return validator.validate(plan);
}

/**
 * Validation decorator for methods
 */
export function ValidateDevOpsPlan(config?: ValidationConfig) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      if (args.length > 0) {
        const validator = createDevOpsPlanValidator(config);
        validator.validateOrThrow(args[0]);
      }
      return method.apply(this, args);
    };
  };
}

/**
 * Export default validator instance
 */
export const defaultValidator = createDevOpsPlanValidator();
