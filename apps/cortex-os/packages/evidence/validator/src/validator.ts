/**
 * @file_path packages/evidence-validator/src/validator.ts
 * @description Evidence validation implementation following the specification
 */

import { createHash } from 'crypto';
import { constants } from 'fs';
import { access, readFile } from 'fs/promises';
import * as path from 'path';
import {
  type EvidenceCollection,
  type Finding,
  FindingSchema,
  type ValidationResult,
  ValidationResultSchema,
  type ValidatorConfig,
} from './types.js';

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export class EvidenceValidator {
  private config: ValidatorConfig;

  constructor(config: ValidatorConfig) {
    this.config = config;
  }

  /**
   * Validate a single finding against its file content
   */
  async validateFinding(finding: Finding): Promise<ValidationResult> {
    // Validate schema first
    try {
      FindingSchema.parse(finding);
    } catch (error) {
      return {
        isValid: false,
        finding,
        errors: [
          `Invalid finding schema: ${error instanceof Error ? error.message : String(error)}`,
        ],
        warnings: [],
        metadata: {
          fileExists: false,
          rangeValid: false,
          hashValid: false,
        },
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let fileExists = false;
    let rangeValid = false;
    let hashValid = false;
    let contentLength: number | undefined;
    let actualHash: string | undefined;

    // Validate range
    if (finding.start > finding.end) {
      errors.push('Invalid range: start position cannot be greater than end position');
    }

    // Check file existence
    const filePath = path.resolve(this.config.repositoryRoot, finding.path);
    fileExists = await pathExists(filePath);

    if (fileExists) {
      try {
        // Read file content
        const content = await readFile(filePath, 'utf-8');
        contentLength = content.length;

        // Validate range against content
        if (finding.end > content.length) {
          if (this.config.allowRangeExceeding) {
            warnings.push('Range exceeds file content but is allowed by configuration');
            rangeValid = true;
          } else {
            errors.push('Range exceeds file content length');
            rangeValid = false;
          }
        } else {
          rangeValid = true;

          // Extract text and validate hash
          if (this.config.requireHashValidation && rangeValid) {
            const extractedText = content.slice(finding.start, finding.end);
            actualHash = createHash('sha256').update(extractedText).digest('hex');

            if (actualHash === finding.hash) {
              hashValid = true;
            } else {
              errors.push('Hash mismatch');
              hashValid = false;
            }
          } else {
            hashValid = !this.config.requireHashValidation;
          }
        }
      } catch (error) {
        errors.push(
          `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else if (this.config.allowMissingFiles) {
      warnings.push('File does not exist but is allowed by configuration');
    } else {
      errors.push(`File does not exist: ${finding.path}`);
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      finding,
      errors,
      warnings,
      metadata: {
        fileExists,
        rangeValid,
        hashValid,
        contentLength,
        actualHash,
      },
    };

    return ValidationResultSchema.parse(result);
  }

  /**
   * Validate multiple findings
   */
  async validateFindings(findings: Finding[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const finding of findings) {
      const result = await this.validateFinding(finding);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate a collection of findings and provide summary
   */
  async validateCollection(findings: Finding[]): Promise<EvidenceCollection> {
    const results = await this.validateFindings(findings);

    const validFindings = results.filter((r) => r.isValid).length;
    const invalidFindings = results.length - validFindings;

    return {
      findings,
      metadata: {
        totalFindings: findings.length,
        validFindings,
        invalidFindings,
        repositoryRoot: this.config.repositoryRoot,
        validatedAt: new Date(),
      },
    };
  }

  /**
   * Generate a finding from file content
   */
  async generateFinding(
    filePath: string,
    start: number,
    end: number,
    claim: string,
  ): Promise<Finding> {
    const fullPath = path.resolve(this.config.repositoryRoot, filePath);
    const content = await readFile(fullPath, 'utf-8');

    if (start > end || end > content.length) {
      throw new Error('Invalid text range for finding generation');
    }

    const extractedText = content.slice(start, end);
    const hash = createHash('sha256').update(extractedText).digest('hex');

    return {
      path: filePath,
      start,
      end,
      claim,
      hash,
    };
  }

  /**
   * Update validator configuration
   */
  updateConfig(config: Partial<ValidatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ValidatorConfig {
    return { ...this.config };
  }
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
