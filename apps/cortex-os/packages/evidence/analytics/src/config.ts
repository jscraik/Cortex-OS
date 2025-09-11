/**
 * @file_path packages/orchestration-analytics/src/config.ts
 * @description Configuration management for orchestration analytics
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-04
 * @version 1.0.0
 * @status active
 * @ai_generated_by human
 * @ai_provenance_hash N/A
 */

import type { AnalyticsConfig } from './types.js';

/**
 * Default analytics configuration
 */
export const defaultAnalyticsConfig: AnalyticsConfig = {
	collection: {
		enabled: true,
		interval: 5000, // 5 seconds
		batchSize: 100,
		retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
	},
	analysis: {
		patternDetection: true,
		anomalyDetection: true,
		predictiveModeling: true,
		optimizationRecommendations: true,
	},
	visualization: {
		realTimeUpdates: true,
		maxDataPoints: 1000,
		refreshInterval: 2000, // 2 seconds
	},
	alerts: {
		enabled: true,
		thresholds: {
			cpu_utilization: 80,
			memory_utilization: 85,
			error_rate: 0.05,
			response_time: 2000,
			throughput_drop: 0.3,
		},
		notificationChannels: ['console', 'websocket'],
	},
	storage: {
		backend: 'memory',
		compressionEnabled: false,
		encryptionEnabled: false,
	},
};

/**
 * Create analytics configuration with overrides
 */
export function createAnalyticsConfig(
	overrides: Partial<AnalyticsConfig> = {},
): AnalyticsConfig {
	return {
		collection: {
			...defaultAnalyticsConfig.collection,
			...overrides.collection,
		},
		analysis: { ...defaultAnalyticsConfig.analysis, ...overrides.analysis },
		visualization: {
			...defaultAnalyticsConfig.visualization,
			...overrides.visualization,
		},
		alerts: {
			...defaultAnalyticsConfig.alerts,
			...overrides.alerts,
			thresholds: {
				...defaultAnalyticsConfig.alerts.thresholds,
				...overrides.alerts?.thresholds,
			},
		},
		storage: { ...defaultAnalyticsConfig.storage, ...overrides.storage },
	};
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
