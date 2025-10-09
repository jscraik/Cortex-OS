/**
 * Thermal-Aware Context Service for brAInwav Cortex-OS
 *
 * Implements thermal monitoring and constraint enforcement for context operations.
 * Prevents system overload by monitoring temperature and applying throttling.
 *
 * Key Features:
 * - Real-time temperature monitoring during operations
 * - Dynamic throttling based on thermal state
 * - Predictive thermal analysis and constraint adjustment
 * - Emergency shutdown protection
 * - Performance optimization under thermal stress
 * - Thermal analytics and recommendations
 */

import { randomUUID } from 'node:crypto';
import type { ContextPackService, PackedContext, PackOptions } from '../ContextPackService.js';
import type {
	ContextSliceRecipe,
	ContextSliceResult,
	ContextSliceService,
} from '../ContextSliceService.js';
import type { ThermalMonitor, ThermalState } from './ThermalMonitor.js';

export interface ThermalContextSliceRecipe extends ContextSliceRecipe {
	thermalConstraints?: boolean;
}

export interface ThermalContextSliceResult extends ContextSliceResult {
	thermalStatus: {
		currentTemp: number;
		trend: string;
		zone: string;
		critical: boolean;
		throttlingActive: boolean;
		throttlingLevel?: string;
		monitored: boolean;
		temperatureReadings?: Array<{
			temp: number;
			timestamp: number;
		}>;
		predictedTemp?: number;
		rapidIncreaseDetected?: boolean;
		temperatureIncrease?: number;
		emergencyTriggered?: boolean;
		thermalEmergency?: boolean;
		operationAborted?: boolean;
		recoveryMode?: boolean;
		cooldownRequired?: boolean;
		cooldownDuration?: number;
	};
	thermalAnalytics?: {
		operationTempStart: number;
		operationTempEnd: number;
		tempDelta: number;
		thermalEfficiency: number;
		brainwavThermalMetrics: boolean;
	};
	thermalRecommendations?: string[];
}

export interface ThermalContextPackOptions extends PackOptions {
	thermalConstraints?: boolean;
}

export interface ThermalContextPackResult extends PackedContext {
	thermalStatus: {
		currentTemp: number;
		trend: string;
		zone: string;
		critical: boolean;
		throttlingActive: boolean;
		monitored: boolean;
	};
	thermalAnalytics?: {
		operationTempStart: number;
		operationTempEnd: number;
		tempDelta: number;
		thermalEfficiency: number;
		brainwavThermalMetrics: boolean;
	};
}

export class ThermalAwareContextService {
	private readonly thermalMonitor: ThermalMonitor;
	private readonly contextSliceService: ContextSliceService;
	private readonly contextPackService: ContextPackService;
	private readonly temperatureReadings: Array<{ temp: number; timestamp: number }> = [];
	private isMonitoring = false;

	constructor(
		thermalMonitor: ThermalMonitor,
		contextSliceService: ContextSliceService,
		contextPackService: ContextPackService,
	) {
		this.thermalMonitor = thermalMonitor;
		this.contextSliceService = contextSliceService;
		this.contextPackService = contextPackService;
	}

	async thermalAwareSlice(recipe: ThermalContextSliceRecipe): Promise<ThermalContextSliceResult> {
		const startTime = Date.now();
		const operationId = `thermal-slice-${randomUUID()}`;

		try {
			// Get initial thermal state
			const initialThermalState = await this.thermalMonitor.getCurrentTemperature();

			// Check for thermal shutdown condition
			if (initialThermalState.zone === 'shutdown') {
				return {
					...this.createThermalErrorResult(
						'Thermal shutdown threshold exceeded',
						operationId,
						startTime,
						initialThermalState,
					),
					rejected: true,
					reason: 'Thermal shutdown threshold exceeded',
					thermalStatus: this.createThermalStatus(initialThermalState, true),
				};
			}

			// Start temperature monitoring
			this.startThermalMonitoring();

			// Check if emergency mode is active
			if (await this.thermalMonitor.isEmergencyMode()) {
				const emergencyLimits = await this.thermalMonitor.getConstraints();
				if (emergencyLimits.emergencyMode) {
					// Apply emergency constraints
					recipe = {
						...recipe,
						maxDepth: Math.min(recipe.maxDepth, emergencyLimits.maxDepth),
						maxNodes: Math.min(recipe.maxNodes, emergencyLimits.maxNodes),
					};
				}
			}

			// Apply thermal constraints if enabled
			let effectiveRecipe = recipe;
			if (recipe.thermalConstraints !== false) {
				const thermalLimits = await this.thermalMonitor.getConstraints();
				if (thermalLimits.throttlingActive) {
					effectiveRecipe = {
						...recipe,
						maxDepth: Math.min(recipe.maxDepth, thermalLimits.maxDepth),
						maxNodes: Math.min(recipe.maxNodes, thermalLimits.maxNodes),
					};
				}
			}

			// Perform context slice with thermal constraints
			const sliceResult = await this.contextSliceService.slice(effectiveRecipe);

			// Stop thermal monitoring
			this.stopThermalMonitoring();

			// Get final thermal state
			const finalThermalState = await this.thermalMonitor.getCurrentTemperature();

			// Create thermal analytics
			const thermalAnalytics = this.createThermalAnalytics(initialThermalState, finalThermalState);

			// Generate thermal recommendations
			const thermalRecommendations = await this.generateThermalRecommendations(finalThermalState);

			// Detect rapid temperature increase
			const rapidIncrease = this.detectRapidIncrease();

			// Check for cooldown requirements
			const cooldownRequired = finalThermalState.cooldownRequired || false;

			const thermalStatus = this.createThermalStatus(finalThermalState, false, {
				rapidIncreaseDetected: rapidIncrease.detected,
				temperatureIncrease: rapidIncrease.increase,
				emergencyTriggered: finalThermalState.emergencyMode || false,
				thermalEmergency: finalThermalState.zone === 'critical',
				operationAborted: false,
				recoveryMode: finalThermalState.recoveryMode || false,
				cooldownRequired,
				cooldownDuration: finalThermalState.cooldownDuration,
			});

			return {
				...sliceResult,
				thermalStatus,
				thermalAnalytics,
				thermalRecommendations,
				metadata: {
					...sliceResult.metadata,
					thermalConstrained: recipe.thermalConstraints !== false && thermalLimits.throttlingActive,
					depthReduced: effectiveRecipe.maxDepth < recipe.maxDepth,
					nodesReduced: effectiveRecipe.maxNodes < recipe.maxNodes,
					emergencyThrottling: finalThermalState.emergencyMode || false,
					proactiveThrottling: thermalLimits.throttlingLevel === 'proactive',
					brainwavThermalManaged: true,
				},
			};
		} catch (error) {
			this.stopThermalMonitoring();
			const thermalState = await this.thermalMonitor.getCurrentTemperature();
			return {
				...this.createThermalErrorResult(
					`Thermal-aware slice error: ${error instanceof Error ? error.message : String(error)}`,
					operationId,
					startTime,
					thermalState,
				),
				thermalStatus: this.createThermalStatus(thermalState, false),
			};
		}
	}

	async thermalAwarePack(
		subgraph: any,
		options: ThermalContextPackOptions,
	): Promise<ThermalContextPackResult> {
		const startTime = Date.now();

		try {
			// Get thermal state
			const thermalState = await this.thermalMonitor.getCurrentTemperature();

			// Check if operation should be throttled or blocked
			if (thermalState.zone === 'shutdown' || thermalState.critical) {
				return {
					subgraph: { nodes: [], edges: [] },
					packedContext: '',
					metadata: {
						totalNodes: 0,
						totalEdges: 0,
						totalTokens: 0,
						packDuration: Date.now() - startTime,
						brainwavBranded: true,
						thermalShutdown: thermalState.zone === 'shutdown',
						thermalEmergency: thermalState.critical,
					},
					thermalStatus: this.createThermalStatus(thermalState, false),
				};
			}

			// Perform context pack
			const packResult = await this.contextPackService.pack(subgraph, options);

			// Get final thermal state
			const finalThermalState = await this.thermalMonitor.getCurrentTemperature();

			// Create thermal analytics
			const thermalAnalytics = this.createThermalAnalytics(thermalState, finalThermalState);

			return {
				...packResult,
				thermalStatus: this.createThermalStatus(finalThermalState, false),
				thermalAnalytics,
				metadata: {
					...packResult.metadata,
					brainwavThermalManaged: true,
				},
			};
		} catch (error) {
			const thermalState = await this.thermalMonitor.getCurrentTemperature();
			return {
				subgraph: { nodes: [], edges: [] },
				packedContext: '',
				metadata: {
					totalNodes: 0,
					totalEdges: 0,
					totalTokens: 0,
					packDuration: Date.now() - startTime,
					brainwavBranded: true,
					error: `Thermal-aware pack error: ${error instanceof Error ? error.message : String(error)}`,
				},
				thermalStatus: this.createThermalStatus(thermalState, false),
			};
		}
	}

	private startThermalMonitoring(): void {
		this.isMonitoring = true;
		this.temperatureReadings.length = 0;

		// Start monitoring with callback
		this.thermalMonitor.startMonitoring((reading) => {
			this.temperatureReadings.push(reading);
		});
	}

	private stopThermalMonitoring(): void {
		this.isMonitoring = false;
		this.thermalMonitor.stopMonitoring();
	}

	private createThermalStatus(
		thermalState: ThermalState,
		_isShutdown: boolean,
		additional?: any,
	): ThermalContextSliceResult['thermalStatus'] {
		return {
			currentTemp: thermalState.currentTemp,
			trend: thermalState.trend,
			zone: thermalState.zone,
			critical: thermalState.critical,
			throttlingActive: thermalState.zone !== 'optimal' && thermalState.zone !== 'normal',
			throttlingLevel: this.getThrottlingLevel(thermalState.zone),
			monitored: this.isMonitoring || this.temperatureReadings.length > 0,
			temperatureReadings:
				this.temperatureReadings.length > 0 ? [...this.temperatureReadings] : undefined,
			predictedTemp: thermalState.predictedTemp,
			...additional,
		};
	}

	private createThermalAnalytics(
		initialState: ThermalState,
		finalState: ThermalState,
	): ThermalContextSliceResult['thermalAnalytics'] {
		return {
			operationTempStart: initialState.currentTemp,
			operationTempEnd: finalState.currentTemp,
			tempDelta: finalState.currentTemp - initialState.currentTemp,
			thermalEfficiency: Math.max(
				0,
				1 - Math.abs(finalState.currentTemp - initialState.currentTemp) / 50,
			),
			brainwavThermalMetrics: true,
		};
	}

	private async generateThermalRecommendations(thermalState: ThermalState): Promise<string[]> {
		const recommendations: string[] = [];

		if (thermalState.zone === 'elevated') {
			recommendations.push('Reduce concurrent operations');
			recommendations.push('Increase cooldown periods');
		}

		if (thermalState.zone === 'critical') {
			recommendations.push('Immediate cooldown required');
			recommendations.push('Consider workload distribution');
		}

		if (thermalState.trend === 'rising') {
			recommendations.push('Monitor temperature trend closely');
		}

		if (thermalState.recoveryMode) {
			recommendations.push('System recovering - maintain reduced load');
		}

		return recommendations;
	}

	private detectRapidIncrease(): { detected: boolean; increase: number } {
		if (this.temperatureReadings.length < 2) {
			return { detected: false, increase: 0 };
		}

		const first = this.temperatureReadings[0];
		const last = this.temperatureReadings[this.temperatureReadings.length - 1];
		const increase = last.temp - first.temp;

		// Consider rapid increase if temperature rose more than 15°C
		const detected = increase > 15;

		return { detected, increase };
	}

	private getThrottlingLevel(zone: ThermalState['zone']): string {
		switch (zone) {
			case 'optimal':
				return 'none';
			case 'normal':
				return 'light';
			case 'elevated':
				return 'moderate';
			case 'critical':
				return 'aggressive';
			case 'shutdown':
				return 'emergency';
			default:
				return 'unknown';
		}
	}

	private createThermalErrorResult(
		error: string,
		operationId: string,
		startTime: number,
		thermalState: ThermalState,
	): Omit<ThermalContextSliceResult, 'thermalStatus'> {
		return {
			subgraph: {
				nodes: [],
				edges: [],
				metadata: {
					focusNodes: 0,
					expandedNodes: 0,
					totalChunks: 0,
					edgesTraversed: 0,
					depthUsed: 0,
					nodesExplored: 0,
					sliceDuration: 0,
					brainwavGenerated: false,
					brainwavBranded: true,
				},
			},
			metadata: {
				sliceDuration: Date.now() - startTime,
				brainwavBranded: true,
				brainwavOperationId: operationId,
				error,
				thermalShutdown: thermalState.zone === 'shutdown',
			},
		};
	}
}
