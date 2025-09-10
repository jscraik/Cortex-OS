/**
 * MLX Provider Types
 *
 * Type definitions for MLX model provider
 */

export interface ThermalStatus {
	temperature: number;
	level: 'normal' | 'warm' | 'hot' | 'critical';
	throttled: boolean;
	timestamp: number;
}

export interface MemoryStatus {
	used: number;
	available: number;
	pressure: 'normal' | 'warning' | 'critical';
	swapUsed: number;
}

export interface MLXProviderConfig {
	modelPath: string;
	maxTokens?: number;
	temperature?: number;
	thermalThreshold?: number;
	memoryThreshold?: number;
	enableThermalMonitoring?: boolean;
	gatewayUrl?: string; // Model Gateway base URL
	timeout?: number;
	maxConcurrency?: number;
	circuitBreakerThreshold?: number;
	circuitBreakerResetMs?: number;
	httpRetries?: number;
	httpBackoffMs?: number;
}

export const DEFAULT_CONFIG = {
	modelPath: '',
	maxTokens: 2048,
	temperature: 0.7,
	thermalThreshold: 85,
	memoryThreshold: 0.8,
	enableThermalMonitoring: true,
	gatewayUrl: process.env.MODEL_GATEWAY_URL || 'http://localhost:8081',
	timeout: 30000,
	maxConcurrency: 2,
	circuitBreakerThreshold: 5,
	circuitBreakerResetMs: 30000,
	httpRetries: 2,
	httpBackoffMs: 300,
};

export interface MLXState {
	config: typeof DEFAULT_CONFIG & MLXProviderConfig;
	isInitialized: boolean;
	lastThermalCheck: number;
	thermalStatus: ThermalStatus;
	memoryStatus: MemoryStatus;
	requestCount: number;
	active: number;
	queue: Array<() => void>;
	failures: number;
	cbOpenUntil?: number;
}
