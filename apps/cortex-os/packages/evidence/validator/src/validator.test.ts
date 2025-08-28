/**
 * @file_path packages/evidence-validator/src/validator.test.ts
 * @description Tests for evidence validator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import path from 'path';
import { EvidenceValidator } from './validator';
import { Finding, ValidatorConfig } from './types';
import { createHash } from 'crypto';

describe('Evidence Validator', () => {
  let validator: EvidenceValidator;
  let testDataDir: string;
  let config: ValidatorConfig;

  beforeEach(() => {
    testDataDir = path.join(__dirname, '../tests/test-data');
    config = {
      repositoryRoot: testDataDir,
      allowMissingFiles: false,
      allowRangeExceeding: false,
      requireHashValidation: true,
      ignorePatterns: [],
    };
    validator = new EvidenceValidator(config);
  });

  describe('Finding Validation', () => {
    it('should validate a correct finding', async () => {
      // Use the actual content that will be in the test file
      const textRange = 'export const exampleString';
      const start = 0; // Start of file
      const end = textRange.length;
      const hash = createHash('sha256').update(textRange).digest('hex');

      const finding: Finding = {
        path: 'sample.ts',
        start,
        end,
        claim: 'This file starts with an export statement',
        hash,
      };

      const result = await validator.validateFinding(finding);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.fileExists).toBe(true);
      expect(result.metadata.rangeValid).toBe(true);
      expect(result.metadata.hashValid).toBe(true);
    });

    it('should detect invalid file path', async () => {
      const finding: Finding = {
        path: 'non-existent-file.ts',
        start: 0,
        end: 10,
        claim: 'This file does not exist',
        hash: 'abcdef123456789abcdef123456789abcdef12',
      };

      const result = await validator.validateFinding(finding);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File does not exist: non-existent-file.ts');
      expect(result.metadata.fileExists).toBe(false);
    });

    it('should detect invalid range', async () => {
      const finding: Finding = {
        path: 'sample.ts',
        start: 1000,
        end: 2000,
        claim: 'This range exceeds file content',
        hash: 'abcdef123456789abcdef123456789abcdef12',
      };

      const result = await validator.validateFinding(finding);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Range exceeds file content length');
      expect(result.metadata.rangeValid).toBe(false);
    });

    it('should detect invalid hash', async () => {
      const finding: Finding = {
        path: 'sample.ts',
        start: 0,
        end: 6,
        claim: 'This has the wrong hash',
        hash: 'abcdef123456789abcdef123456789abcdef123456',
      };

      const result = await validator.validateFinding(finding);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Hash mismatch');
      expect(result.metadata.hashValid).toBe(false);
    });

    it('should handle range where start > end', async () => {
      const finding: Finding = {
        path: 'sample.ts',
        start: 10,
        end: 5,
        claim: 'Invalid range',
        hash: 'abcdef123456789abcdef123456789abcdef12',
      };

      const result = await validator.validateFinding(finding);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Invalid range: start position cannot be greater than end position',
      );
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple findings', async () => {
      // Let's use the validator's own generateFinding method to create findings with correct hashes
      const sampleFinding = await validator.generateFinding('sample.ts', 0, 26, 'Export statement');
      const readmeFinding = await validator.generateFinding('readme.md', 0, 14, 'Heading');

      const findings: Finding[] = [sampleFinding, readmeFinding];

      const results = await validator.validateFindings(findings);

      console.log(
        'Batch validation results:',
        results.map((r) => ({
          path: r.finding.path,
          isValid: r.isValid,
          errors: r.errors,
          actualHash: r.metadata.actualHash,
          expectedHash: r.finding.hash,
        })),
      );

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result.isValid).toBe(true);
      });
    });

    it('should provide collection summary', async () => {
      const findings: Finding[] = [
        {
          path: 'sample.ts',
          start: 0,
          end: 6,
          claim: 'Export statement',
          hash: createHash('sha256').update('export').digest('hex'),
        },
        {
          path: 'non-existent.ts',
          start: 0,
          end: 5,
          claim: 'Missing file',
          hash: 'invalidhash123456789abcdef123456789abcdef',
        },
      ];

      const collection = await validator.validateCollection(findings);

      console.log('Collection summary:', {
        totalFindings: collection.metadata.totalFindings,
        validFindings: collection.metadata.validFindings,
        invalidFindings: collection.metadata.invalidFindings,
      });

      expect(collection.metadata.totalFindings).toBe(2);
      expect(collection.metadata.validFindings).toBe(1);
      expect(collection.metadata.invalidFindings).toBe(1);
    });
  });

  describe('Configuration Options', () => {
    it('should allow missing files when configured', async () => {
      const permissiveConfig: ValidatorConfig = {
        ...config,
        allowMissingFiles: true,
      };

      const permissiveValidator = new EvidenceValidator(permissiveConfig);

      const finding: Finding = {
        path: 'missing-file.ts',
        start: 0,
        end: 5,
        claim: 'Missing file test',
        hash: 'abcdef123456789abcdef123456789abcdef12',
      };

      const result = await permissiveValidator.validateFinding(finding);

      expect(result.warnings).toContain('File does not exist but is allowed by configuration');
    });
  });
});
