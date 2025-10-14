/**
 * @fileoverview Phase A.2 RED Tests - ArxivSearchOutput Schema Validation
 * 
 * These tests define expected behavior for arXiv search output validation.
 * Written to FAIL initially (RED phase of TDD).
 * 
 * Task: arxiv-mcp-tool-integration
 * Phase: A.2 - Output Schema Validation (RED)
 */

import { describe, test, expect } from 'vitest';
import { ArxivSearchOutput, ArxivPaperItem } from '../../../src/mcp/arxiv/schema.js';

describe('ArxivSearchOutput validation', () => {
  test('should accept valid arXiv paper item', () => {
    const validPaper = {
      id: 'arXiv:2301.12345',
      title: 'Deep Learning for Natural Language Processing',
      summary: 'This paper presents a comprehensive survey of deep learning methods for NLP tasks.',
      published: '2023-01-15T10:30:00Z',
      updated: '2023-01-20T15:45:00Z',
      authors: ['John Smith', 'Jane Doe'],
      url: 'https://arxiv.org/abs/2301.12345',
      pdfUrl: 'https://arxiv.org/pdf/2301.12345.pdf',
      categories: ['cs.CL', 'cs.LG'],
      doi: '10.1234/example.doi'
    };

    const result = ArxivPaperItem.safeParse(validPaper);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('arXiv:2301.12345');
      expect(result.data.title).toBe('Deep Learning for Natural Language Processing');
      expect(result.data.authors).toHaveLength(2);
      expect(result.data.categories).toContain('cs.CL');
    }
  });

  test('should require brAInwav brand in output', () => {
    const outputWithBranding = {
      items: [{
        id: 'arXiv:2301.12345',
        title: 'Test Paper',
        summary: 'Test summary',
        published: '2023-01-15T10:30:00Z',
        updated: '2023-01-20T15:45:00Z',
        authors: ['Test Author'],
        url: 'https://arxiv.org/abs/2301.12345'
      }],
      source: 'arxiv',
      brand: 'brAInwav'
    };

    const outputWithoutBranding = {
      items: [{
        id: 'arXiv:2301.12345',
        title: 'Test Paper',
        summary: 'Test summary',
        published: '2023-01-15T10:30:00Z',
        updated: '2023-01-20T15:45:00Z',
        authors: ['Test Author'],
        url: 'https://arxiv.org/abs/2301.12345'
      }],
      source: 'arxiv',
      brand: 'WrongBrand' // Wrong brand
    };

    const resultWithBranding = ArxivSearchOutput.safeParse(outputWithBranding);
    const resultWithoutBranding = ArxivSearchOutput.safeParse(outputWithoutBranding);
    
    expect(resultWithBranding.success).toBe(true);
    expect(resultWithoutBranding.success).toBe(false);
  });

  test('should validate URL formats for paper links', () => {
    const paperWithInvalidUrls = {
      id: 'arXiv:2301.12345',
      title: 'Test Paper',
      summary: 'Test summary',
      published: '2023-01-15T10:30:00Z',
      updated: '2023-01-20T15:45:00Z',
      authors: ['Test Author'],
      url: 'not-a-valid-url', // Invalid URL
      pdfUrl: 'also-not-valid' // Invalid PDF URL
    };

    const result = ArxivPaperItem.safeParse(paperWithInvalidUrls);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('URL');
    }
  });

  test('should handle optional fields correctly', () => {
    const paperWithoutOptionals = {
      id: 'arXiv:2301.12345',
      title: 'Test Paper',
      summary: 'Test summary',
      published: '2023-01-15T10:30:00Z',
      updated: '2023-01-20T15:45:00Z',
      authors: ['Test Author'],
      url: 'https://arxiv.org/abs/2301.12345'
      // pdfUrl and doi are optional
    };

    const paperWithOptionals = {
      ...paperWithoutOptionals,
      pdfUrl: 'https://arxiv.org/pdf/2301.12345.pdf',
      doi: '10.1234/example.doi'
    };

    const resultWithout = ArxivPaperItem.safeParse(paperWithoutOptionals);
    const resultWith = ArxivPaperItem.safeParse(paperWithOptionals);
    
    expect(resultWithout.success).toBe(true);
    expect(resultWith.success).toBe(true);
    
    if (resultWithout.success) {
      expect(resultWithout.data.pdfUrl).toBeUndefined();
      expect(resultWithout.data.doi).toBeUndefined();
      expect(resultWithout.data.categories).toEqual([]); // Default empty array
    }
    
    if (resultWith.success) {
      expect(resultWith.data.pdfUrl).toBe('https://arxiv.org/pdf/2301.12345.pdf');
      expect(resultWith.data.doi).toBe('10.1234/example.doi');
    }
  });
});