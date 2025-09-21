/**
 * Production-ready reliability configuration for RAG pipeline.
 *
 * This module provides centralized configuration for timeouts, backpressure,
 * circuit breakers, retry policies, and rate limiting across all RAG components.
 */

import type { BackpressureConfig, ComponentTimeoutConfig } from './backpressure.js';
import {
	DEFAULT_BACKPRESSURE_CONFIG,
	DEFAULT_TIMEOUT_CONFIG,
	DEV_BACKPRESSURE_CONFIG,
	DEV_TIMEOUT_CONFIG,
} from './backpressure.js';
import type { ReliabilityPolicy } from './types.js';

export interface RAGReliabilityConfig {
	/** Component-specific timeout configuration */
	timeouts: ComponentTimeoutConfig;
	/** Backpressure and concurrency limits */
	backpressure: BackpressureConfig;
	/** Component-specific reliability policies */
	policies: {
		embedder: ReliabilityPolicy;
		store: ReliabilityPolicy;
		reranker: ReliabilityPolicy;
	};
	/** Rate limiting configuration */
	rateLimits: {
		embedder: {
			tokensPerSecond: number;
			bucketSize: number;
		};
		store: {
			tokensPerSecond: number;
			bucketSize: number;
		};
		reranker: {
			tokensPerSecond: number;
			bucketSize: number;
		};
	};
}

/** Production reliability configuration */
export const PRODUCTION_RAG_CONFIG: RAGReliabilityConfig = {
	timeouts: DEFAULT_TIMEOUT_CONFIG,
	backpressure: DEFAULT_BACKPRESSURE_CONFIG,
	policies: {
		embedder: {
			retry: {
				maxAttempts: 3,
				baseDelayMs: 1000,
			},
			breaker: {
				failureThreshold: 5,
				resetTimeoutMs: 60000, // 1 minute
			},
		},
		store: {
			retry: {
				maxAttempts: 3,
				baseDelayMs: 500,
			},
			breaker: {
				failureThreshold: 10, // More tolerance for DB operations
				resetTimeoutMs: 30000, // 30 seconds
			},
		},
		reranker: {
			retry: {
				maxAttempts: 2, // Less retries for expensive operations
				baseDelayMs: 2000,
			},
			breaker: {
				failureThreshold: 3,
				resetTimeoutMs: 120000, // 2 minutes
			},
		},
	},
	rateLimits: {
		embedder: {
			tokensPerSecond: 10, // Conservative for model inference
			bucketSize: 20,
		},
		store: {
			tokensPerSecond: 50, // Higher for database operations
			bucketSize: 100,
		},
		reranker: {
			tokensPerSecond: 2, // Very conservative for expensive reranking
			bucketSize: 5,
		},
	},
};

/** Development/testing reliability configuration */
export const DEVELOPMENT_RAG_CONFIG: RAGReliabilityConfig = {
	timeouts: DEV_TIMEOUT_CONFIG,
	backpressure: DEV_BACKPRESSURE_CONFIG,
	policies: {
		embedder: {
			retry: {
				maxAttempts: 2,
				baseDelayMs: 100,
			},
			breaker: {
				failureThreshold: 3,
				resetTimeoutMs: 10000, // 10 seconds
			},
		},
		store: {
			retry: {
				maxAttempts: 2,
				baseDelayMs: 50,
			},
			breaker: {
				failureThreshold: 5,
				resetTimeoutMs: 5000, // 5 seconds
			},
		},
		reranker: {
			retry: {
				maxAttempts: 1, // Minimal retries in development
				baseDelayMs: 200,
			},
			breaker: {
				failureThreshold: 2,
				resetTimeoutMs: 15000, // 15 seconds
			},
		},
	},
	rateLimits: {
		embedder: {
			tokensPerSecond: 5,
			bucketSize: 10,
		},
		store: {
			tokensPerSecond: 20,
			bucketSize: 40,
		},
		reranker: {
			tokensPerSecond: 1,
			bucketSize: 2,
		},
	},
};

/** Testing configuration with fast failures and minimal delays */
export const TEST_RAG_CONFIG: RAGReliabilityConfig = {
	timeouts: {
		embedder: 1000,
		store: 500,
		reranker: 1500,
		healthCheck: 200,
		httpRequest: 1000,
	},
	backpressure: {
		maxConcurrent: {
			embedder: 1,
			store: 2,
			reranker: 1,
		},
		maxQueueSize: {
			embedder: 2,
			store: 5,
			reranker: 2,
		},
		adaptive: false,
		resourceThresholds: {
			memoryPercent: 95,
			cpuPercent: 90,
		},
	},
	policies: {
		embedder: {
			retry: {
				maxAttempts: 1,
				baseDelayMs: 10,
			},
			breaker: {
				failureThreshold: 1,
				resetTimeoutMs: 100,
			},
		},
		store: {
			retry: {
				maxAttempts: 1,
				baseDelayMs: 5,
			},
			breaker: {
				failureThreshold: 2,
				resetTimeoutMs: 50,
			},
		},
		reranker: {
			retry: {
				maxAttempts: 1,
				baseDelayMs: 20,
			},
			breaker: {
				failureThreshold: 1,
				resetTimeoutMs: 200,
			},
		},
	},
	rateLimits: {
		embedder: {
			tokensPerSecond: 100, // No throttling in tests
			bucketSize: 200,
		},
		store: {
			tokensPerSecond: 200,
			bucketSize: 400,
		},
		reranker: {
			tokensPerSecond: 50,
			bucketSize: 100,
		},
	},
};

/**
 * Get reliability configuration based on environment.
 */
export function getRAGReliabilityConfig(
	env: 'production' | 'development' | 'test' = 'development',
): RAGReliabilityConfig {
	switch (env) {
		case 'production':
			return PRODUCTION_RAG_CONFIG;
		case 'test':
			return TEST_RAG_CONFIG;
		default:
			return DEVELOPMENT_RAG_CONFIG;
	}
}

/**
 * Create a merged configuration with custom overrides.
 */
export function createRAGReliabilityConfig(
	base: RAGReliabilityConfig,
	overrides: Partial<RAGReliabilityConfig>,
): RAGReliabilityConfig {
	return {
		timeouts: { ...base.timeouts, ...overrides.timeouts },
		backpressure: {
			...base.backpressure,
			...overrides.backpressure,
			maxConcurrent: {
				...base.backpressure.maxConcurrent,
				...overrides.backpressure?.maxConcurrent,
			},
			maxQueueSize: { ...base.backpressure.maxQueueSize, ...overrides.backpressure?.maxQueueSize },
			resourceThresholds: {
				...base.backpressure.resourceThresholds,
				...overrides.backpressure?.resourceThresholds,
			},
		},
		policies: {
			embedder: { ...base.policies.embedder, ...overrides.policies?.embedder },
			store: { ...base.policies.store, ...overrides.policies?.store },
			reranker: { ...base.policies.reranker, ...overrides.policies?.reranker },
		},
		rateLimits: {
			embedder: { ...base.rateLimits.embedder, ...overrides.rateLimits?.embedder },
			store: { ...base.rateLimits.store, ...overrides.rateLimits?.store },
			reranker: { ...base.rateLimits.reranker, ...overrides.rateLimits?.reranker },
		},
	};
}
