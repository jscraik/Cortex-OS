/**
 * @fileoverview Response Normalization for arXiv MCP Tools
 * 
 * Phase C.1: GREEN Implementation - Response Normalization
 * 
 * This module normalizes arXiv MCP server responses to structured format
 * with brAInwav branding and comprehensive error handling.
 * 
 * @see tasks/arxiv-mcp-tool-integration/tdd-plan.md - Phase C.1
 * @see .cortex/rules/RULES_OF_AI.md - brAInwav production standards
 * @see .cortex/rules/agentic-phase-policy.md - Phase policy compliance
 */

import type { ArxivSearchOutputType, ArxivPaperItemType } from './schema.js';
import { ArxivSearchOutput, ArxivPaperItem } from './schema.js';

/**
 * Raw arXiv entry from MCP response (simplified structure)
 */
interface ArxivMcpEntry {
  id?: string;
  title?: string;
  summary?: string;
  published?: string;
  updated?: string;
  authors?: Array<{ name?: string }> | string[];
  links?: Array<{ href?: string; rel?: string; type?: string }>;
  categories?: string[] | string;
  doi?: string;
}

/**
 * Raw MCP response structure
 */
interface ArxivMcpResponse {
  entries?: ArxivMcpEntry[];
  items?: ArxivMcpEntry[];
  results?: ArxivMcpEntry[];
}

/**
 * Normalize author information to string array
 * 
 * @param authors - Authors in various formats
 * @returns Normalized author name array
 */
const normalizeAuthors = (authors: unknown): string[] => {
  if (!authors) return [];
  
  if (Array.isArray(authors)) {
    return authors
      .map(author => {
        if (typeof author === 'string') return author.trim();
        if (author && typeof author === 'object' && 'name' in author) {
          return typeof author.name === 'string' ? author.name.trim() : '';
        }
        return '';
      })
      .filter(name => name.length > 0);
  }
  
  if (typeof authors === 'string') {
    return [authors.trim()].filter(name => name.length > 0);
  }
  
  return [];
};

/**
 * Extract and validate URLs from links array
 * 
 * @param links - Links array from arXiv entry
 * @returns Object with main URL and optional PDF URL
 */
const extractUrls = (
  links: unknown
): { url?: string; pdfUrl?: string } => {
  if (!Array.isArray(links)) return {};
  
  let url: string | undefined;
  let pdfUrl: string | undefined;
  
  for (const link of links) {
    if (!link || typeof link !== 'object') continue;
    
    const href = 'href' in link && typeof link.href === 'string' 
      ? link.href.trim() 
      : '';
    
    if (!href || (!href.startsWith('http://') && !href.startsWith('https://'))) {
      continue;
    }
    
    const rel = 'rel' in link && typeof link.rel === 'string' 
      ? link.rel.toLowerCase() 
      : '';
    const type = 'type' in link && typeof link.type === 'string' 
      ? link.type.toLowerCase() 
      : '';
    
    // Main URL (alternate relation or no relation)
    if (rel === 'alternate' || rel === '') {
      url = href;
    }
    
    // PDF URL (related link with PDF type or PDF in href)
    if (rel === 'related' && type.includes('pdf')) {
      pdfUrl = href;
    } else if (href.includes('pdf') && !pdfUrl) {
      pdfUrl = href;
    }
  }
  
  return { url, pdfUrl };
};

/**
 * Normalize categories to string array
 * 
 * @param categories - Categories in various formats
 * @returns Normalized category array
 */
const normalizeCategories = (categories: unknown): string[] => {
  if (!categories) return [];
  
  if (Array.isArray(categories)) {
    return categories
      .map(cat => typeof cat === 'string' ? cat.trim() : '')
      .filter(cat => cat.length > 0);
  }
  
  if (typeof categories === 'string') {
    return categories
      .split(/[,;]/)
      .map(cat => cat.trim())
      .filter(cat => cat.length > 0);
  }
  
  return [];
};

/**
 * Validate and format date string
 * 
 * @param dateString - Date string to validate
 * @returns ISO8601 formatted date or current date as fallback
 */
const normalizeDate = (dateString: unknown): string => {
  if (typeof dateString !== 'string') {
    return new Date().toISOString();
  }
  
  const date = new Date(dateString.trim());
  if (isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  
  return date.toISOString();
};

/**
 * Validate required fields for arXiv entry
 * 
 * @param entry - Raw arXiv entry
 * @returns True if all required fields present
 */
const validateRequiredFields = (entry: ArxivMcpEntry): boolean => {
  if (!entry.id || typeof entry.id !== 'string' || entry.id.trim().length === 0) {
    return false;
  }
  
  if (!entry.title || typeof entry.title !== 'string' || entry.title.trim().length === 0) {
    return false;
  }
  
  if (!entry.summary || typeof entry.summary !== 'string' || entry.summary.trim().length === 0) {
    return false;
  }
  
  return true;
};

/**
 * Build normalized arXiv paper item
 * 
 * @param entry - Raw arXiv entry
 * @param url - Main paper URL  
 * @param pdfUrl - Optional PDF URL
 * @param authors - Normalized authors array
 * @returns Normalized paper item
 */
const buildNormalizedEntry = (
  entry: ArxivMcpEntry,
  url: string,
  pdfUrl: string | undefined,
  authors: string[]
): ArxivPaperItemType => {
  const normalized: ArxivPaperItemType = {
    id: entry.id!.trim(),
    title: entry.title!.trim(),
    summary: entry.summary!.trim(),
    published: normalizeDate(entry.published),
    updated: normalizeDate(entry.updated),
    authors,
    url,
    categories: normalizeCategories(entry.categories),
  };
  
  if (pdfUrl) {
    normalized.pdfUrl = pdfUrl;
  }
  
  if (entry.doi && typeof entry.doi === 'string' && entry.doi.trim().length > 0) {
    normalized.doi = entry.doi.trim();
  }
  
  return normalized;
};

/**
 * Normalize a single arXiv entry from MCP response
 * 
 * @param entry - Raw arXiv entry from MCP
 * @returns Normalized paper item or null if invalid
 */
const normalizeArxivEntry = (
  entry: ArxivMcpEntry
): ArxivPaperItemType | null => {
  try {
    if (!validateRequiredFields(entry)) {
      return null;
    }
    
    const { url, pdfUrl } = extractUrls(entry.links);
    if (!url) {
      return null; // Main URL is required
    }
    
    const authors = normalizeAuthors(entry.authors);
    if (authors.length === 0) {
      return null;
    }
    
    const normalized = buildNormalizedEntry(entry, url, pdfUrl, authors);
    
    // Validate using schema
    const validation = ArxivPaperItem.safeParse(normalized);
    return validation.success ? validation.data : null;
    
  } catch (error) {
    console.warn('[brAInwav] arXiv entry normalization failed', {
      brand: 'brAInwav',
      entryId: entry.id || 'unknown',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    return null;
  }
};

/**
 * Validate MCP response structure
 * 
 * @param mcpResponse - Raw MCP response
 * @returns Validation result with error response if invalid
 */
const validateMcpResponse = (
  mcpResponse: unknown
): { valid: boolean; fallback?: ArxivSearchOutputType } => {
  if (!mcpResponse || typeof mcpResponse !== 'object') {
    console.warn('[brAInwav] arXiv MCP response is null or invalid', {
      brand: 'brAInwav',
      responseType: typeof mcpResponse,
      timestamp: new Date().toISOString(),
    });
    
    return {
      valid: false,
      fallback: {
        items: [],
        source: 'arxiv',
        brand: 'brAInwav',
      },
    };
  }
  
  return { valid: true };
};

/**
 * Extract and validate entries from MCP response
 * 
 * @param response - Typed MCP response
 * @returns Entries array or fallback response
 */
const extractRawEntries = (
  response: ArxivMcpResponse
): { entries?: unknown[]; fallback?: ArxivSearchOutputType } => {
  const rawEntries = response.entries || response.items || response.results || [];
  
  if (!Array.isArray(rawEntries)) {
    console.warn('[brAInwav] arXiv MCP response entries not an array', {
      brand: 'brAInwav',
      entriesType: typeof rawEntries,
      timestamp: new Date().toISOString(),
    });
    
    return {
      fallback: {
        items: [],
        source: 'arxiv',
        brand: 'brAInwav',
      },
    };
  }
  
  return { entries: rawEntries };
};

/**
 * Process entries and build final output
 * 
 * @param rawEntries - Raw entries to process
 * @returns Final normalized output
 */
const processEntriesAndBuildOutput = (
  rawEntries: unknown[]
): ArxivSearchOutputType => {
  const normalizedItems: ArxivPaperItemType[] = [];
  
  for (const entry of rawEntries) {
    if (!entry || typeof entry !== 'object') continue;
    
    const normalized = normalizeArxivEntry(entry as ArxivMcpEntry);
    if (normalized) {
      normalizedItems.push(normalized);
    }
  }
  
  console.info('[brAInwav] arXiv response normalized successfully', {
    brand: 'brAInwav',
    totalEntries: rawEntries.length,
    validEntries: normalizedItems.length,
    timestamp: new Date().toISOString(),
  });
  
  const output: ArxivSearchOutputType = {
    items: normalizedItems,
    source: 'arxiv',
    brand: 'brAInwav',
  };
  
  // Final validation
  const validation = ArxivSearchOutput.safeParse(output);
  if (!validation.success) {
    console.error('[brAInwav] arXiv output validation failed', {
      brand: 'brAInwav',
      error: validation.error.message,
      timestamp: new Date().toISOString(),
    });
    
    return {
      items: [],
      source: 'arxiv',
      brand: 'brAInwav',
    };
  }
  
  return validation.data;
};

/**
 * Normalize arXiv MCP response to structured format
 * 
 * Transforms raw MCP server response into validated ArxivSearchOutput
 * with proper brAInwav branding and error handling.
 * 
 * @param mcpResponse - Raw response from arXiv MCP server
 * @returns Normalized search output with brAInwav branding
 */
export const normalizeArxivResponse = (
  mcpResponse: unknown
): ArxivSearchOutputType => {
  try {
    const validation = validateMcpResponse(mcpResponse);
    if (!validation.valid) {
      return validation.fallback!;
    }
    
    const response = mcpResponse as ArxivMcpResponse;
    const extraction = extractRawEntries(response);
    if (extraction.fallback) {
      return extraction.fallback;
    }
    
    return processEntriesAndBuildOutput(extraction.entries!);
    
  } catch (error) {
    console.error('[brAInwav] arXiv response normalization error', {
      brand: 'brAInwav',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    
    return {
      items: [],
      source: 'arxiv',
      brand: 'brAInwav',
    };
  }
};