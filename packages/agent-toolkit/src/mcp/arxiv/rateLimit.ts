/**
 * @fileoverview Rate Limiting Implementation for arXiv MCP Tools
 * 
 * Phase B.1: GREEN Implementation - Rate Limiting with Exponential Backoff
 * 
 * This module implements client-side rate limiting for arXiv API compliance,
 * enforcing 1 request per 3 seconds with exponential backoff for errors.
 * All operations include brAInwav branding and structured logging.
 * 
 * @see tasks/arxiv-mcp-tool-integration/tdd-plan.md - Phase B.1
 * @see .cortex/rules/RULES_OF_AI.md - brAInwav production standards
 * @see .cortex/rules/agentic-phase-policy.md - Phase policy compliance
 */

import { randomUUID, randomBytes } from 'node:crypto';

/**
 * Rate limiting configuration interface
 */
export interface RateLimitConfig {
  minIntervalMs: number;
  maxRetries: number;
  backoffFactor: number;
}

/**
 * Request queue entry for tracking pending requests
 */
interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  correlationId: string;
  retries: number;
  config: RateLimitConfig;
}

/**
 * Rate limiter state per client key
 */
interface RateLimiterState {
  lastRequestTime: number;
  queue: QueuedRequest<any>[];
  processing: boolean;
}

// Global rate limiter state
const rateLimiters = new Map<string, RateLimiterState>();

/**
 * Generate correlation ID for request tracking
 * 
 * @returns Correlation ID with brAInwav format
 */
const generateCorrelationId = (): string => {
  const timestamp = Date.now();
  const uuid = randomUUID().substring(0, 8);
  return `cortex_${timestamp}_${uuid}`;
};

/**
 * Calculate backoff delay using exponential backoff with jitter
 * 
 * @param attempt - Current retry attempt number
 * @param backoffFactor - Exponential backoff multiplier
 * @returns Delay in milliseconds
 */
const calculateBackoffDelay = (
  attempt: number, 
  backoffFactor: number
): number => {
  const baseDelay = 1000; // 1 second base
  const exponentialDelay = baseDelay * Math.pow(backoffFactor, attempt);
  // brAInwav: Use crypto-based jitter for deterministic randomness
  const jitterSeed = randomBytes(4).readUInt32BE() / 0xFFFFFFFF;
  const jitter = jitterSeed * 0.1 * exponentialDelay; // 10% jitter
  return Math.floor(exponentialDelay + jitter);
};

/**
 * Log structured message with brAInwav branding
 * 
 * @param level - Log level (info, warn, error)
 * @param message - Log message
 * @param metadata - Additional structured data
 */
const logWithBranding = (
  level: 'info' | 'warn' | 'error',
  message: string,
  metadata: Record<string, unknown>
): void => {
  const logData = {
    brand: 'brAInwav',
    timestamp: new Date().toISOString(),
    ...metadata,
  };
  
  console[level](`[brAInwav] ${message}`, logData);
};

/**
 * Execute a single request from the queue
 * 
 * @param request - Queued request to execute
 * @param clientKey - Client identifier  
 * @param state - Rate limiter state
 */
const executeQueuedRequest = async (
  request: QueuedRequest<any>,
  clientKey: string,
  state: RateLimiterState
): Promise<void> => {
  try {
    logWithBranding('info', 'arXiv rate limiter executing request', {
      correlationId: request.correlationId,
      clientKey,
      queueLength: state.queue.length,
      retryAttempt: request.retries,
    });

    const result = await request.fn();
    state.lastRequestTime = Date.now();
    request.resolve(result);

  } catch (error) {
    await handleRequestError(request, clientKey, state, error);
  }
};

/**
 * Handle request execution error with retry logic
 * 
 * @param request - Failed request
 * @param clientKey - Client identifier
 * @param state - Rate limiter state  
 * @param error - Error that occurred
 */
const handleRequestError = async (
  request: QueuedRequest<any>,
  clientKey: string,
  state: RateLimiterState,
  error: unknown
): Promise<void> => {
  if (request.retries < request.config.maxRetries) {
    const backoffDelay = calculateBackoffDelay(
      request.retries,
      request.config.backoffFactor
    );

    logWithBranding('warn', 'arXiv request failed, retrying with backoff', {
      correlationId: request.correlationId,
      clientKey,
      retryAttempt: request.retries + 1,
      maxRetries: request.config.maxRetries,
      backoffDelayMs: backoffDelay,
      error: error instanceof Error ? error.message : String(error),
    });

    // Schedule retry after backoff delay
    setTimeout(() => {
      request.retries++;
      state.queue.unshift(request); // Add back to front of queue
      // Don't call processQueue here - it will be called by the main queue processor
    }, backoffDelay);

  } else {
    logWithBranding('error', 'arXiv request failed after max retries', {
      correlationId: request.correlationId,
      clientKey,
      maxRetries: request.config.maxRetries,
      error: error instanceof Error ? error.message : String(error),
    });

    request.reject(
      error instanceof Error 
        ? error 
        : new Error(`brAInwav: arXiv request failed: ${String(error)}`)
    );
  }
};

/**
 * Process the request queue for a specific client
 * 
 * @param clientKey - Client identifier
 * @param state - Rate limiter state
 */
const processQueue = async (
  clientKey: string,
  state: RateLimiterState
): Promise<void> => {
  if (state.processing || state.queue.length === 0) {
    return;
  }

  state.processing = true;

  try {
    while (state.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - state.lastRequestTime;
      const minInterval = 3000; // 3 seconds as per arXiv requirements

      // Wait if not enough time has passed
      if (timeSinceLastRequest < minInterval) {
        const waitTime = minInterval - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const request = state.queue.shift();
      if (!request) break;

      await executeQueuedRequest(request, clientKey, state);
    }
  } finally {
    state.processing = false;
  }
};

/**
 * Execute function with rate limiting
 * 
 * Enforces minimum interval between requests and implements
 * exponential backoff for error recovery.
 * 
 * @param clientKey - Unique identifier for rate limiting scope
 * @param fn - Function to execute with rate limiting
 * @param config - Rate limiting configuration
 * @returns Promise resolving to function result
 */
export const withRateLimit = async <T>(
  clientKey: string,
  fn: () => Promise<T>,
  config: RateLimitConfig
): Promise<T> => {
  // Get or create rate limiter state for this client
  if (!rateLimiters.has(clientKey)) {
    rateLimiters.set(clientKey, {
      lastRequestTime: 0,
      queue: [],
      processing: false,
    });
  }

  const state = rateLimiters.get(clientKey)!;
  const correlationId = generateCorrelationId();

  logWithBranding('info', 'arXiv rate limiter queueing request', {
    correlationId,
    clientKey,
    queueLength: state.queue.length,
    minIntervalMs: config.minIntervalMs,
  });

  // Create promise for the queued request
  return new Promise<T>((resolve, reject) => {
    const request: QueuedRequest<T> = {
      fn,
      resolve,
      reject,
      correlationId,
      retries: 0,
      config,
    };

    state.queue.push(request);
    processQueue(clientKey, state);
  });
};

/**
 * Get rate limiter status for monitoring
 * 
 * @param clientKey - Client identifier
 * @returns Status information or null if no limiter exists
 */
export const getRateLimitStatus = (
  clientKey: string
): { queueLength: number; lastRequestTime: number } | null => {
  const state = rateLimiters.get(clientKey);
  if (!state) return null;

  return {
    queueLength: state.queue.length,
    lastRequestTime: state.lastRequestTime,
  };
};

/**
 * Clear rate limiter state for testing
 * 
 * @param clientKey - Client identifier to clear
 */
export const clearRateLimitState = (clientKey?: string): void => {
  if (clientKey) {
    rateLimiters.delete(clientKey);
  } else {
    rateLimiters.clear();
  }
};