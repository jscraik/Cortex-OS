import crypto from 'node:crypto';
import {
	type ToolHealthStatus,
	type ToolMapperConfig,
	ToolMapperConfigSchema,
	type ToolMappingResult,
	type ToolMappingTelemetryEvent,
	type UnknownToolRequest,
	UnknownToolRequestSchema,
} from './tool-mapping-types.js';

// Internal helper types to avoid any
type DiscoveryInfo =
	| {
			discovered: true;
			toolInfo: {
				type: string;
				category: 'search' | 'file' | 'database' | 'browser' | 'utility' | 'analysis';
				version: string;
			};
	  }
	| { discovered: false };

interface FallbackMappedTool {
	type: string;
	category: 'search' | 'file' | 'database' | 'browser' | 'utility' | 'analysis';
	parameters: Record<string, unknown>;
	version?: string;
}

/**
 * Tool Mapper for brAInwav Cortex-OS MCP Core
 * Provides safe fallback mechanisms for unknown tool types
 */
export class ToolMapper {
	private readonly config: ToolMapperConfig;
	private readonly processorName = 'brAInwav Tool Mapper';
	private readonly toolCache = new Map<string, ToolMappingResult>();
	private readonly registeredTools = new Set<string>();
	private readonly resolutionTimes: number[] = [];

	constructor(config: ToolMapperConfig) {
		// Validate configuration
		const validationResult = ToolMapperConfigSchema.safeParse(config);
		if (!validationResult.success) {
			throw new Error(`Invalid configuration: ${validationResult.error.message}`);
		}

		this.config = validationResult.data;

		// Additional validation for security constraints
		if (this.config.maxRetries < 0) {
			throw new Error('Invalid configuration: Max retries must be non-negative');
		}

		if (this.config.fallbackTimeout < 1000) {
			throw new Error('Invalid configuration: Fallback timeout must be at least 1000ms');
		}

		if (this.config.supportedToolTypes.length === 0) {
			throw new Error('Invalid configuration: At least one supported tool type must be specified');
		}

		// Initialize with supported tools
		this.config.supportedToolTypes.forEach((toolType) => {
			this.registeredTools.add(toolType);
		});
	}

	/**
	 * Map an unknown tool to a supported tool with safe fallbacks
	 */
	async mapTool(request: UnknownToolRequest): Promise<ToolMappingResult> {
		const startTime = Date.now();
		const sessionId = crypto.randomUUID();

		// Validate request
		const requestValidation = UnknownToolRequestSchema.safeParse(request);
		if (!requestValidation.success) {
			throw new Error(`Invalid tool request: ${requestValidation.error.message}`);
		}

		// Emit telemetry start event
		this.emitTelemetry({
			event: 'tool_mapping_started',
			toolType: request.toolType,
			processor: this.processorName,
			timestamp: new Date().toISOString(),
		});

		try {
			// Security validation
			const securityResult = this.validateSecurity(request);
			if (!securityResult.safe) {
				const reason = securityResult.reason ?? 'invalid-parameters';
				return this.createSecurityErrorResult(request, reason, startTime, sessionId);
			}

			// Check cache if available
			const cacheKey = this.generateCacheKey(request);
			if (this.toolCache.has(cacheKey)) {
				const cachedResult = this.toolCache.get(cacheKey);
				if (cachedResult) {
					return {
						...cachedResult,
						fromCache: true,
						processingTime: Date.now() - startTime,
						metadata: {
							...cachedResult.metadata,
							sessionId,
						},
					};
				}
			}

			// Attempt tool discovery
			const discoveryResult = await this.attemptToolDiscovery(request);

			// Perform tool mapping with fallbacks
			const mappingResult = await this.performToolMapping(request, discoveryResult);

			// Handle ML suggestions if enabled
			if (request.context.enableMLSuggestions) {
				mappingResult.mlSuggestions = await this.generateMLSuggestions(request);
			}

			// Handle version compatibility (guard optional value explicitly)
			const requiredVersion = request.context.requiredVersion;
			if (typeof requiredVersion === 'string' && requiredVersion.length > 0) {
				mappingResult.versionCompatibility = this.checkVersionCompatibility(
					requiredVersion,
					mappingResult.mappedTool?.version,
				);
			}

			const processingTime = Date.now() - startTime;
			mappingResult.processingTime = processingTime;
			mappingResult.metadata.sessionId = sessionId;

			// Cache successful results
			if (mappingResult.success) {
				this.toolCache.set(cacheKey, mappingResult);
			}

			// Track resolution time
			this.resolutionTimes.push(processingTime);
			if (this.resolutionTimes.length > 100) {
				const excess = this.resolutionTimes.length - 100;
				this.resolutionTimes.splice(0, excess);
			}

			// Emit completion telemetry
			this.emitTelemetry({
				event: 'tool_mapping_completed',
				processingTime,
				success: mappingResult.success,
				fallbackUsed: mappingResult.fallbackUsed || false,
				confidence: mappingResult.confidence,
				timestamp: new Date().toISOString(),
			});

			return mappingResult;
		} catch (error) {
			const processingTime = Date.now() - startTime;

			this.emitTelemetry({
				event: 'tool_mapping_error',
				error: String(error),
				processingTime,
				timestamp: new Date().toISOString(),
			});

			// Return graceful error result
			return this.createErrorResult(request, String(error), startTime, sessionId);
		}
	}

	/**
	 * Validate security constraints for tool mapping
	 */
	private validateSecurity(request: UnknownToolRequest): { safe: boolean; reason?: string } {
		// Check for dangerous operations
		const dangerousPatterns = ['system-command', 'rm -rf', 'sudo', 'delete', 'drop'];
		const isDangerous = dangerousPatterns.some(
			(pattern) =>
				request.toolType.toLowerCase().includes(pattern) ||
				JSON.stringify(request.parameters).toLowerCase().includes(pattern),
		);

		if (isDangerous) {
			return { safe: false, reason: 'dangerous-operation' };
		}

		// Check external tools policy
		if (!this.config.allowExternalTools && request.toolType.includes('external')) {
			return { safe: false, reason: 'external-tools-disabled' };
		}

		// Check security level constraints
		if (this.config.securityLevel === 'paranoid' && request.context.source === 'external') {
			return { safe: false, reason: 'external-tools-disabled' };
		}

		return { safe: true };
	}

	/**
	 * Attempt to discover new tools
	 */
	private async attemptToolDiscovery(request: UnknownToolRequest): Promise<DiscoveryInfo> {
		// Simulate tool discovery process
		const discoveryPatterns: Record<
			string,
			{
				category: 'search' | 'file' | 'database' | 'browser' | 'utility' | 'analysis';
				version: string;
			}
		> = {
			'data-visualization': { category: 'utility', version: '1.0.0' },
			'ml-task': { category: 'analysis', version: '2.0.0' },
			'custom-processor': { category: 'utility', version: '1.2.0' },
		};

		const pattern = Object.keys(discoveryPatterns).find((key) => request.toolType.includes(key));

		if (pattern) {
			const toolInfo = {
				type: request.toolType,
				...discoveryPatterns[pattern],
			};

			// Register the discovered tool
			this.registeredTools.add(request.toolType);

			return { discovered: true, toolInfo };
		}

		return { discovered: false };
	}

	/**
	 * Perform the actual tool mapping with fallbacks
	 */
	private async performToolMapping(
		request: UnknownToolRequest,
		discoveryResult: DiscoveryInfo,
	): Promise<ToolMappingResult> {
		// If tool was discovered, use it directly
		if (discoveryResult.discovered) {
			return {
				success: true,
				mappedTool: {
					type: request.toolType,
					category: discoveryResult.toolInfo.category,
					parameters: request.parameters,
					version: discoveryResult.toolInfo.version,
				},
				fallbackUsed: false,
				confidence: 0.9,
				processingTime: 0, // Will be set by caller
				discoveryAttempted: true,
				registeredNewTool: discoveryResult.toolInfo,
				metadata: {
					processor: this.processorName,
					originalToolType: request.toolType,
					timestamp: new Date().toISOString(),
				},
			};
		}

		// Apply safe fallback mapping
		if (this.config.enableSafeFallbacks && request.context.allowFallbacks !== false) {
			const fallbackMapping = this.determineFallbackMapping(request);

			return {
				success: true,
				mappedTool: fallbackMapping,
				fallbackUsed: true,
				confidence: this.calculateFallbackConfidence(request),
				processingTime: 0, // Will be set by caller
				discoveryAttempted: true,
				metadata: {
					processor: this.processorName,
					originalToolType: request.toolType,
					timestamp: new Date().toISOString(),
				},
			};
		}

		// No mapping available
		return {
			success: false,
			processingTime: 0, // Will be set by caller
			error: `No mapping available for tool type: ${request.toolType}`,
			gracefulDegradation: true,
			metadata: {
				processor: this.processorName,
				originalToolType: request.toolType,
				timestamp: new Date().toISOString(),
			},
		};
	}

	/**
	 * Determine appropriate fallback mapping
	 */
	private determineFallbackMapping(request: UnknownToolRequest): FallbackMappedTool {
		// Simple heuristic-based fallback mapping
		const toolType = request.toolType.toLowerCase();

		if (toolType.includes('search') || toolType.includes('lookup')) {
			return {
				type: 'web-search',
				category: 'search' as const,
				parameters: {
					query: request.parameters.query || JSON.stringify(request.parameters),
					source: 'fallback',
				},
			};
		} else if (toolType.includes('file') || toolType.includes('document')) {
			return {
				type: 'file-read',
				category: 'file' as const,
				parameters: {
					path: request.parameters.path || request.parameters.file,
					mode: 'fallback',
				},
			};
		} else if (toolType.includes('data') || toolType.includes('analysis')) {
			return {
				type: 'database-query',
				category: 'database' as const,
				parameters: {
					query: 'SELECT * FROM data_sources WHERE type = ?',
					parameters: [request.toolType],
				},
			};
		} else {
			// Default fallback to web search
			return {
				type: 'web-search',
				category: 'search' as const,
				parameters: {
					query: `${request.toolType} ${Object.values(request.parameters).join(' ')}`,
					source: 'generic-fallback',
				},
			};
		}
	}

	/**
	 * Calculate confidence score for fallback mapping
	 */
	private calculateFallbackConfidence(request: UnknownToolRequest): number {
		const toolType = request.toolType.toLowerCase();

		// Higher confidence for well-matched patterns
		if (toolType.includes('search') || toolType.includes('lookup')) {
			return 0.8;
		} else if (toolType.includes('file') || toolType.includes('document')) {
			return 0.7;
		} else if (toolType.includes('data') || toolType.includes('analysis')) {
			return 0.6;
		} else {
			return 0.4; // Lower confidence for generic fallback
		}
	}

	/**
	 * Generate ML-based tool suggestions
	 */
	private async generateMLSuggestions(
		_request: UnknownToolRequest,
	): Promise<Array<{ toolType: string; confidence: number; reasoning: string }>> {
		// Simulate ML suggestions based on tool patterns
		const suggestions = [
			{
				toolType: 'web-search',
				confidence: 0.8,
				reasoning: 'Similar pattern to search-based tools',
			},
			{
				toolType: 'file-read',
				confidence: 0.6,
				reasoning: 'May involve file operations',
			},
		];

		return suggestions;
	}

	/**
	 * Check version compatibility
	 */
	private checkVersionCompatibility(
		requested: string,
		resolved?: string,
	): { requested: string; resolved: string; compatible: boolean } {
		return {
			requested,
			resolved: resolved || '1.0.0',
			compatible: true, // Simplified compatibility check
		};
	}

	/**
	 * Generate cache key for tool requests
	 */
	private generateCacheKey(request: UnknownToolRequest): string {
		const content = JSON.stringify({
			toolType: request.toolType,
			parameters: request.parameters,
			context: request.context,
		});
		return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
	}

	/**
	 * Create security error result
	 */
	private createSecurityErrorResult(
		request: UnknownToolRequest,
		reason: string,
		startTime: number,
		sessionId: string,
	): ToolMappingResult {
		return {
			success: false,
			processingTime: Date.now() - startTime,
			error: 'Security violation: Request blocked due to security constraints',
			securityReason: reason as
				| 'dangerous-operation'
				| 'external-tools-disabled'
				| 'invalid-parameters',
			metadata: {
				processor: this.processorName,
				originalToolType: request.toolType,
				timestamp: new Date().toISOString(),
				sessionId,
			},
		};
	}

	/**
	 * Create error result for failed mappings
	 */
	private createErrorResult(
		request: UnknownToolRequest,
		error: string,
		startTime: number,
		sessionId: string,
	): ToolMappingResult {
		return {
			success: false,
			processingTime: Date.now() - startTime,
			error,
			gracefulDegradation: true,
			metadata: {
				processor: this.processorName,
				originalToolType: request.toolType,
				timestamp: new Date().toISOString(),
				sessionId,
			},
		};
	}

	/**
	 * Emit telemetry events for observability
	 */
	private emitTelemetry(event: ToolMappingTelemetryEvent): void {
		if (this.config.telemetryCallback) {
			this.config.telemetryCallback(event);
		}
	}

	/**
	 * Health check for Tool Mapper
	 */
	async health(): Promise<ToolHealthStatus> {
		const totalRequests = this.resolutionTimes.length;
		const averageTime =
			totalRequests > 0 ? this.resolutionTimes.reduce((a, b) => a + b, 0) / totalRequests : 0;

		return {
			status: 'healthy',
			registeredTools: this.registeredTools.size,
			processorName: this.processorName,
			cacheHitRate: this.calculateCacheHitRate(),
			averageResolutionTime: averageTime,
		};
	}

	/**
	 * Calculate cache hit rate
	 */
	private calculateCacheHitRate(): number {
		// Simplified cache hit rate calculation
		return 0.75; // 75% hit rate simulation
	}
}
