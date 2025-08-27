/**
 * @file_path packages/evidence-validator/src/types.ts
 * @description Type definitions for evidence validation system
 */

import { z } from "zod";

// Finding schema based on the specification
export const FindingSchema = z.object({
  path: z.string().min(1),
  start: z.number().min(0),
  end: z.number().min(0),
  claim: z.string().min(1),
  hash: z.string().regex(/^[a-f0-9]{12,64}$/),
});

export type Finding = z.infer<typeof FindingSchema>;

// Validation result schema
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  finding: FindingSchema,
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  metadata: z.object({
    fileExists: z.boolean(),
    rangeValid: z.boolean(),
    hashValid: z.boolean(),
    contentLength: z.number().optional(),
    actualHash: z.string().optional(),
  }),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// Evidence collection schema
export const EvidenceCollectionSchema = z.object({
  findings: z.array(FindingSchema),
  metadata: z.object({
    totalFindings: z.number(),
    validFindings: z.number(),
    invalidFindings: z.number(),
    repositoryRoot: z.string(),
    validatedAt: z.date().optional(),
  }),
});

export type EvidenceCollection = z.infer<typeof EvidenceCollectionSchema>;

// Validator configuration
export const ValidatorConfigSchema = z.object({
  repositoryRoot: z.string(),
  allowMissingFiles: z.boolean().default(false),
  allowRangeExceeding: z.boolean().default(false),
  requireHashValidation: z.boolean().default(true),
  ignorePatterns: z.array(z.string()).default([]),
});

export type ValidatorConfig = z.infer<typeof ValidatorConfigSchema>;

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
