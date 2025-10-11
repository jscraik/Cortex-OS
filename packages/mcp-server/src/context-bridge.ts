/**
 * brAInwav Context Bridge for Pieces Integration
 *
 * Handles event capture and context aggregation for the Pieces integration.
 * brAInwav: Provides telemetry and context bridging between local memory and Pieces services.
 */

import type { Logger } from 'pino';
import type { PiecesCopilotMCPProxy } from '../pieces-copilot-proxy.js';
import type { PiecesDriveMCPProxy } from '../pieces-drive-proxy.js';
import type { PiecesMCPProxy } from '../pieces-proxy.js';
import { createBrandedLog } from '../utils/brand.js';

export interface ContextBridgeConfig {
	logger: Logger;
	enableEventCapture: boolean;
	enableTelemetry: boolean;
}

export interface HybridSearchEvent {
	timestamp: string;
	query: string;
	sources: {
		local: boolean;
		pieces: boolean;
		drive: boolean;
		copilot: boolean;
	};
	results: {
		local: number;
		pieces: number;
		drive: number;
		copilot: number;
		total: number;
	};
	duration: number;
	errors?: string[];
}

export interface PiecesServiceStatus {
	pieces: {
		connected: boolean;
		lastError?: string;
		lastChecked: string;
	};
	drive: {
		connected: boolean;
		lastError?: string;
		lastChecked: string;
	};
	copilot: {
		connected: boolean;
		lastError?: string;
		lastChecked: string;
	};
}

/**
 * Context Bridge class for managing Pieces integration events and context
 */
export class PiecesContextBridge {
	private readonly config: ContextBridgeConfig;
	private readonly eventHistory: HybridSearchEvent[] = [];
	private maxEventHistory = 100;
	private serviceStatus: PiecesServiceStatus = {
		pieces: { connected: false, lastChecked: new Date().toISOString() },
		drive: { connected: false, lastChecked: new Date().toISOString() },
		copilot: { connected: false, lastChecked: new Date().toISOString() },
	};

	constructor(config: ContextBridgeConfig) {
		this.config = config;
	}

	/**
	 * Capture hybrid search event with full context
	 */
	captureHybridSearchEvent(event: HybridSearchEvent): void {
		if (!this.config.enableEventCapture) return;

		// Add to event history (circular buffer)
		this.eventHistory.push(event);
		if (this.eventHistory.length > this.maxEventHistory) {
			this.eventHistory.shift();
		}

		// Log event with structured data
		this.config.logger.info(
			createBrandedLog('hybrid_search_event', {
				query: event.query,
				sources: event.sources,
				results: event.results,
				duration: event.duration,
				errorCount: event.errors?.length || 0,
			}),
			`Hybrid search completed: ${event.results.total} results in ${event.duration.toFixed(2)}ms`,
		);

		// Update service status based on event
		this.updateServiceStatusFromEvent(event);
	}

	/**
	 * Update service connectivity status
	 */
	updateServiceStatus(
		service: 'pieces' | 'drive' | 'copilot',
		connected: boolean,
		error?: string,
	): void {
		const now = new Date().toISOString();

		this.serviceStatus[service] = {
			connected,
			lastError: error,
			lastChecked: now,
		};

		if (this.config.enableTelemetry) {
			this.config.logger.info(
				createBrandedLog('service_status_update', {
					service,
					connected,
					hasError: !!error,
				}),
				`Pieces ${service} service status: ${connected ? 'connected' : 'disconnected'}`,
			);
		}
	}

	/**
	 * Get current service status
	 */
	getServiceStatus(): PiecesServiceStatus {
		return { ...this.serviceStatus };
	}

	/**
	 * Get recent event history
	 */
	getRecentEvents(limit: number = 10): HybridSearchEvent[] {
		return this.eventHistory.slice(-limit);
	}

	/**
	 * Get aggregated statistics from event history
	 */
	getAggregatedStats(): {
		totalSearches: number;
		averageResults: number;
		averageDuration: number;
		sourceUsage: {
			local: number;
			pieces: number;
			drive: number;
			copilot: number;
		};
		errorRate: number;
	} {
		if (this.eventHistory.length === 0) {
			return {
				totalSearches: 0,
				averageResults: 0,
				averageDuration: 0,
				sourceUsage: { local: 0, pieces: 0, drive: 0, copilot: 0 },
				errorRate: 0,
			};
		}

		const totalSearches = this.eventHistory.length;
		const totalResults = this.eventHistory.reduce((sum, event) => sum + event.results.total, 0);
		const totalDuration = this.eventHistory.reduce((sum, event) => sum + event.duration, 0);
		const errorCount = this.eventHistory.filter(
			(event) => event.errors && event.errors.length > 0,
		).length;

		const sourceUsage = this.eventHistory.reduce(
			(acc, event) => ({
				local: acc.local + (event.sources.local ? 1 : 0),
				pieces: acc.pieces + (event.sources.pieces ? 1 : 0),
				drive: acc.drive + (event.sources.drive ? 1 : 0),
				copilot: acc.copilot + (event.sources.copilot ? 1 : 0),
			}),
			{ local: 0, pieces: 0, drive: 0, copilot: 0 },
		);

		return {
			totalSearches,
			averageResults: totalResults / totalSearches,
			averageDuration: totalDuration / totalSearches,
			sourceUsage,
			errorRate: errorCount / totalSearches,
		};
	}

	/**
	 * Build context string for Pieces services based on recent activity
	 */
	buildPiecesContext(searchQuery?: string): string {
		const recentEvents = this.getRecentEvents(5);
		const stats = this.getAggregatedStats();
		const status = this.getServiceStatus();

		const contextParts = [
			`brAInwav Pieces Integration Context`,
			`=====================================`,
			`Service Status:`,
			`- Pieces LTM: ${status.pieces.connected ? 'Connected' : 'Disconnected'}${status.pieces.lastError ? ` (${status.pieces.lastError})` : ''}`,
			`- Pieces Drive: ${status.drive.connected ? 'Connected' : 'Disconnected'}${status.drive.lastError ? ` (${status.drive.lastError})` : ''}`,
			`- Pieces Copilot: ${status.copilot.connected ? 'Connected' : 'Disconnected'}${status.copilot.lastError ? ` (${status.copilot.lastError})` : ''}`,
			``,
			`Recent Activity:`,
			`- Total searches: ${stats.totalSearches}`,
			`- Average results: ${stats.averageResults.toFixed(1)}`,
			`- Average duration: ${stats.averageDuration.toFixed(0)}ms`,
			`- Error rate: ${(stats.errorRate * 100).toFixed(1)}%`,
			``,
		];

		if (searchQuery) {
			contextParts.push(`Current Search: "${searchQuery}"`);
			contextParts.push('');
		}

		if (recentEvents.length > 0) {
			contextParts.push('Recent Searches:');
			recentEvents.slice(-3).forEach((event, index) => {
				contextParts.push(
					`${index + 1}. "${event.query}" - ${event.results.total} results (${event.duration.toFixed(0)}ms)`,
				);
			});
		}

		return contextParts.join('\\n');
	}

	/**
	 * Update service status from hybrid search event
	 */
	private updateServiceStatusFromEvent(event: HybridSearchEvent): void {
		const now = new Date().toISOString();

		// Update Pieces LTM status
		if (event.sources.pieces) {
			const hasError = event.errors?.some((error) => error.includes('Pieces LTM'));
			this.serviceStatus.pieces = {
				connected: !hasError,
				lastError: hasError ? event.errors?.find((e) => e.includes('Pieces LTM')) : undefined,
				lastChecked: now,
			};
		}

		// Update Pieces Drive status
		if (event.sources.drive) {
			const hasError = event.errors?.some((error) => error.includes('Pieces Drive'));
			this.serviceStatus.drive = {
				connected: !hasError,
				lastError: hasError ? event.errors?.find((e) => e.includes('Pieces Drive')) : undefined,
				lastChecked: now,
			};
		}

		// Update Pieces Copilot status
		if (event.sources.copilot) {
			const hasError = event.errors?.some((error) => error.includes('Pieces Copilot'));
			this.serviceStatus.copilot = {
				connected: !hasError,
				lastError: hasError ? event.errors?.find((e) => e.includes('Pieces Copilot')) : undefined,
				lastChecked: now,
			};
		}
	}
}

/**
 * Create context bridge instance with default configuration
 */
export function createPiecesContextBridge(
	logger: Logger,
	options: Partial<ContextBridgeConfig> = {},
): PiecesContextBridge {
	const config: ContextBridgeConfig = {
		logger,
		enableEventCapture: true,
		enableTelemetry: true,
		...options,
	};

	return new PiecesContextBridge(config);
}
