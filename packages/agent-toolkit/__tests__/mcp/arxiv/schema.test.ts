/**
 * @fileoverview Phase A.1 RED Tests - ArxivSearchInput Schema Validation
 * 
 * These tests are written to FAIL initially (RED phase of TDD).
 * They define the expected behavior for arXiv search input validation.
 * 
 * Task: arxiv-mcp-tool-integration
 * Phase: A.1 - Input Schema Validation (RED)
 */

import { describe, test, expect } from 'vitest';
import { z } from 'zod';

// Import will fail initially - this is expected for RED phase
import { ArxivSearchInput } from '../../../src/mcp/arxiv/schema.js';

describe('ArxivSearchInput validation', () => {
  test('should accept valid search input with all fields', () => {
    const validInput = {
      query: 'machine learning transformers',
      start: 0,
      maxResults: 20,
      sortBy: 'submittedDate',
      sortOrder: 'descending'
    };

    const result = ArxivSearchInput.safeParse(validInput);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe('machine learning transformers');
      expect(result.data.start).toBe(0);
      expect(result.data.maxResults).toBe(20);
      expect(result.data.sortBy).toBe('submittedDate');
      expect(result.data.sortOrder).toBe('descending');
    }
  });

  test('should reject query shorter than 2 characters', () => {
    const invalidInput = {
      query: 'a', // Too short
      start: 0,
      maxResults: 10
    };

    const result = ArxivSearchInput.safeParse(invalidInput);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('2');
    }
  });

  test('should reject query longer than 512 characters', () => {
    const longQuery = 'a'.repeat(513); // Exceeds 512 character limit
    const invalidInput = {
      query: longQuery,
      start: 0,
      maxResults: 10
    };

    const result = ArxivSearchInput.safeParse(invalidInput);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('512');
    }
  });

  test('should apply default values for optional fields', () => {
    const minimalInput = {
      query: 'neural networks'
    };

    const result = ArxivSearchInput.safeParse(minimalInput);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.start).toBe(0);
      expect(result.data.maxResults).toBe(10);
      expect(result.data.sortBy).toBe('submittedDate');
      expect(result.data.sortOrder).toBe('descending');
    }
  });

  test('should reject invalid sortBy values', () => {
    const invalidInput = {
      query: 'artificial intelligence',
      sortBy: 'invalidSort' // Invalid enum value
    };

    const result = ArxivSearchInput.safeParse(invalidInput);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('sortBy');
    }
  });

  test('should reject invalid numeric ranges', () => {
    const invalidInputs = [
      {
        query: 'deep learning',
        start: -1 // Negative start
      },
      {
        query: 'computer vision',
        maxResults: 0 // Zero results
      },
      {
        query: 'natural language processing',
        maxResults: 51 // Exceeds maximum
      }
    ];

    for (const invalidInput of invalidInputs) {
      const result = ArxivSearchInput.safeParse(invalidInput);
      expect(result.success).toBe(false);
    }
  });
});