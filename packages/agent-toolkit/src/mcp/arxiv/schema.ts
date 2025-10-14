/**
 * @fileoverview arXiv MCP Tool Schema Validation
 * 
 * Phase A.1: GREEN Implementation - ArXiv Search Input/Output Schemas
 * 
 * This module provides Zod schemas for validating arXiv MCP tool inputs and outputs
 * following brAInwav production standards and agent-first architecture principles.
 * 
 * All validation messages include brAInwav branding for observability and governance compliance.
 * 
 * @see tasks/arxiv-mcp-tool-integration/tdd-plan.md - Phase A.1
 * @see .cortex/rules/RULES_OF_AI.md - brAInwav production standards
 * @see .cortex/rules/CODESTYLE.md - Coding conventions
 */

import { z } from 'zod';

/**
 * arXiv Search Input Schema
 * 
 * Validates input parameters for arXiv academic paper search.
 * Enforces query length limits, numeric ranges, and enum values
 * according to arXiv API requirements and brAInwav standards.
 */
export const ArxivSearchInput = z.object({
  query: z
    .string()
    .min(2, 'brAInwav: Query must be at least 2 characters long')
    .max(512, 'brAInwav: Query cannot exceed 512 characters'),
  
  start: z
    .number()
    .int()
    .min(0, 'brAInwav: Start index must be non-negative')
    .default(0),
  
  maxResults: z
    .number()
    .int()
    .min(1, 'brAInwav: Must request at least 1 result')
    .max(50, 'brAInwav: Cannot request more than 50 results')
    .default(10),
  
  sortBy: z
    .enum(['relevance', 'submittedDate', 'lastUpdatedDate'])
    .default('submittedDate'),
  
  sortOrder: z
    .enum(['ascending', 'descending'])
    .default('descending'),
});

/**
 * arXiv Paper Item Schema
 * 
 * Represents a single academic paper from arXiv search results.
 * All URL fields are validated for security and format compliance.
 */
export const ArxivPaperItem = z.object({
  id: z.string().min(1, 'brAInwav: Paper ID cannot be empty'),
  
  title: z.string().min(1, 'brAInwav: Paper title cannot be empty'),
  
  summary: z.string().min(1, 'brAInwav: Paper summary cannot be empty'),
  
  published: z
    .string()
    .refine(
      (date) => !isNaN(Date.parse(date)),
      'brAInwav: Published date must be valid ISO8601 format'
    ),
  
  updated: z
    .string()
    .refine(
      (date) => !isNaN(Date.parse(date)),
      'brAInwav: Updated date must be valid ISO8601 format'
    ),
  
  authors: z
    .array(z.string().min(1))
    .min(1, 'brAInwav: Paper must have at least one author'),
  
  url: z
    .string()
    .url('brAInwav: Paper URL must be valid'),
  
  pdfUrl: z
    .string()
    .url('brAInwav: PDF URL must be valid')
    .optional(),
  
  categories: z
    .array(z.string().min(1))
    .default([]),
  
  doi: z
    .string()
    .min(1)
    .optional(),
});

/**
 * arXiv Search Output Schema
 * 
 * Validates complete search response with brAInwav branding requirement.
 * Ensures all responses include proper source attribution and branding.
 */
export const ArxivSearchOutput = z.object({
  items: z
    .array(ArxivPaperItem)
    .default([]),
  
  source: z
    .literal('arxiv'),
  
  brand: z
    .literal('brAInwav'),
});

/**
 * Type inference for TypeScript usage
 */
export type ArxivSearchInputType = z.infer<typeof ArxivSearchInput>;
export type ArxivPaperItemType = z.infer<typeof ArxivPaperItem>;
export type ArxivSearchOutputType = z.infer<typeof ArxivSearchOutput>;

/**
 * Validation result type for better error handling
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; details?: unknown } };

/**
 * Validate arXiv search input with brAInwav error formatting
 * 
 * @param input - The input object to validate
 * @returns ValidationResult with success/error and data/error details
 */
export const validateArxivSearchInput = (
  input: unknown
): ValidationResult<ArxivSearchInputType> => {
  const result = ArxivSearchInput.safeParse(input);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errorMessage = `brAInwav arXiv Input Validation Failed: ${result.error.message}`;
  
  return {
    success: false,
    error: {
      message: errorMessage,
      details: result.error.format(),
    },
  };
};

/**
 * Validate arXiv search output with brAInwav error formatting
 * 
 * @param output - The output object to validate
 * @returns ValidationResult with success/error and data/error details
 */
export const validateArxivSearchOutput = (
  output: unknown
): ValidationResult<ArxivSearchOutputType> => {
  const result = ArxivSearchOutput.safeParse(output);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errorMessage = `brAInwav arXiv Output Validation Failed: ${result.error.message}`;
  
  return {
    success: false,
    error: {
      message: errorMessage,
      details: result.error.format(),
    },
  };
};

/**
 * All exports are named exports following brAInwav standards
 * Import specific functions: import { ArxivSearchInput } from './schema.js'
 */