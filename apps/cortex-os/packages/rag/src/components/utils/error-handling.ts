/**
 * @file Error Handling Utilities
 * @description Common error handling utilities for the RAG pipeline
 * @author Cortex OS Team
 * @version 1.0.0
 */

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'Unknown error occurred';
}

/**
 * Normalize error to a consistent Error object
 */
export function normalizeError(error: unknown, fallbackMessage?: string): Error {
  if (error instanceof Error) {
    return error;
  }

  const message = getErrorMessage(error) || fallbackMessage || 'Unknown error occurred';
  return new Error(message);
}

/**
 * RAG-specific error types
 */
export class RagError extends Error {
  constructor(
    message: string,
    public readonly phase?: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'RagError';
  }
}

export class EmbeddingError extends RagError {
  constructor(message: string, cause?: Error) {
    super(message, 'embedding', cause);
    this.name = 'EmbeddingError';
  }
}

export class RetrievalError extends RagError {
  constructor(message: string, cause?: Error) {
    super(message, 'retrieval', cause);
    this.name = 'RetrievalError';
  }
}

export class RerankingError extends RagError {
  constructor(message: string, cause?: Error) {
    super(message, 'reranking', cause);
    this.name = 'RerankingError';
  }
}

export class QualityError extends RagError {
  constructor(
    message: string,
    public readonly qualityScore: number,
    cause?: Error,
  ) {
    super(message, 'quality-check', cause);
    this.name = 'QualityError';
  }
}
