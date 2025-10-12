import { randomUUID } from 'node:crypto';
import type {
        ContextPackService,
        PackedContext,
        PackOptions,
} from '../ContextPackService.js';
import type {
        ContextSliceRecipe,
        ContextSliceResult,
        ContextSliceService,
} from '../ContextSliceService.js';
import type { ThermalPolicy, ThermalPolicyRecommendation } from '../../thermal/ThermalPolicy.js';
import type { ThermalMonitor, ThermalState } from '../../thermal/ThermalMonitor.js';

export type ThermalContextSliceRecipe = Omit<ContextSliceRecipe, 'thermalConstraints'> & {
        thermalConstraints?: boolean;
};

export interface ThermalSliceMetadata {
        depthReduced?: boolean;
        nodesReduced?: boolean;
        emergencyThrottling?: boolean;
        proactiveThrottling?: boolean;
        throttlingReason?: string;
        brainwavThermalManaged: boolean;
        brainwavEmergencyMode?: boolean;
        brainwavThermalProtected?: boolean;
        thermalMonitoringActive?: boolean;
        thermalEmergency?: boolean;
        operationAborted?: boolean;
        thermalRecovery?: boolean;
        capabilitiesRestored?: boolean;
        cooldownEnforced?: boolean;
        operationDelayed?: boolean;
        thermalCooldownActive?: boolean;
        thermalOptimizationProvided?: boolean;
        brainwavThermalOptimized?: boolean;
        emergencyTriggered?: boolean;
        cooldownRequired?: boolean;
        thermalShutdown?: boolean;
}

export interface ThermalStatus {
        currentTemp: number;
        trend: ThermalState['trend'];
        zone: ThermalState['zone'];
        critical: boolean;
        throttlingActive: boolean;
        throttlingLevel?: ThermalPolicyRecommendation['throttlingLevel'];
        monitored: boolean;
        temperatureReadings?: Array<{ temp: number; timestamp: number }>;
        predictedTemp?: number;
        rapidIncreaseDetected?: boolean;
        temperatureIncrease?: number;
        emergencyTriggered?: boolean;
        thermalEmergency?: boolean;
        operationAborted?: boolean;
        recoveryMode?: boolean;
        cooldownRequired?: boolean;
        cooldownDuration?: number;
        emergencyMode?: boolean;
}

export interface ThermalContextSliceResult
        extends Omit<ContextSliceResult, 'metadata' | 'thermalStatus'> {
        metadata: ContextSliceResult['metadata'] & ThermalSliceMetadata;
        thermalStatus: ThermalStatus;
        thermalAnalytics?: {
                operationTempStart: number;
                operationTempEnd: number;
                tempDelta: number;
                thermalEfficiency: number;
                brainwavThermalMetrics: boolean;
        };
        thermalRecommendations?: string[];
        rejected?: boolean;
        reason?: string;
}

export interface ThermalContextPackOptions extends PackOptions {
        thermalConstraints?: boolean;
}

export interface ThermalContextPackResult extends PackedContext {
        thermalStatus: ThermalStatus;
        thermalAnalytics?: ThermalContextSliceResult['thermalAnalytics'];
}

type ContextSliceAdapter = Pick<ContextSliceService, 'slice'>;
type ContextPackAdapter = Pick<ContextPackService, 'pack'>;
type ThermalPackMetadata = PackedContext['metadata'] & {
        brainwavThermalManaged?: boolean;
        thermalOptimizationProvided?: boolean;
        thermalShutdown?: boolean;
        thermalEmergency?: boolean;
};

export interface ThermalAwareContextServiceDeps {
        thermalMonitor: ThermalMonitor;
        thermalPolicy: ThermalPolicy;
        contextSliceService?: ContextSliceAdapter;
        contextPackService?: ContextPackAdapter;
}

const RAPID_INCREASE_THRESHOLD = 12;

export class ThermalAwareContextService {
        private readonly thermalMonitor: ThermalMonitor;
        private readonly thermalPolicy: ThermalPolicy;
        private readonly contextSliceService: ContextSliceAdapter;
        private readonly contextPackService: ContextPackAdapter;
        private temperatureReadings: Array<{ temp: number; timestamp: number }> = [];
        private isMonitoring = false;

        constructor({
                thermalMonitor,
                thermalPolicy,
                contextSliceService,
                contextPackService,
        }: ThermalAwareContextServiceDeps) {
                this.thermalMonitor = thermalMonitor;
                this.thermalPolicy = thermalPolicy;
                this.contextSliceService = contextSliceService ?? this.createDefaultContextSliceService();
                this.contextPackService = contextPackService ?? this.createDefaultContextPackService();
        }

        async thermalAwareSlice(recipe: ThermalContextSliceRecipe): Promise<ThermalContextSliceResult> {
                const startTime = Date.now();
                const operationId = `thermal-slice-${randomUUID()}`;

                const initialState = await this.thermalMonitor.getCurrentTemperature();
                const contextInfo = { maxDepth: recipe.maxDepth, maxNodes: recipe.maxNodes };
                const initialRecommendation = await this.thermalPolicy.getRecommendedLimits(initialState, contextInfo);
                const shouldThrottle =
                        recipe.thermalConstraints !== false &&
                        (await this.thermalPolicy.shouldThrottle(initialState, contextInfo));
                const throttlingLevel =
                        (await this.thermalPolicy.getThrottlingLevel(initialState, contextInfo)) ||
                        initialRecommendation.throttlingLevel;
                const emergencyAtStart = await this.thermalPolicy.isEmergencyMode(initialState);

                if (initialState.zone === 'shutdown' || initialRecommendation.maxDepth === 0 || initialRecommendation.maxNodes === 0) {
                        return this.createThermalRejection(
                                initialState,
                                initialRecommendation,
                                operationId,
                                startTime,
                                throttlingLevel,
                        );
                }

                const effectiveRecipe: ThermalContextSliceRecipe = shouldThrottle
                        ? {
                                  ...recipe,
                                  maxDepth: Math.max(1, Math.min(recipe.maxDepth, initialRecommendation.maxDepth)),
                                  maxNodes: Math.max(1, Math.min(recipe.maxNodes, initialRecommendation.maxNodes)),
                          }
                        : { ...recipe };

                const depthReduced = effectiveRecipe.maxDepth < recipe.maxDepth;
                const nodesReduced = effectiveRecipe.maxNodes < recipe.maxNodes;

                this.startThermalMonitoring();

                try {
                        const sliceStart = Date.now();
                        const sliceInput: ContextSliceRecipe = {
                                ...effectiveRecipe,
                                thermalConstraints: effectiveRecipe.thermalConstraints ?? true,
                        };
                        const sliceResult = await this.contextSliceService.slice(sliceInput);
                        const operationDuration = Date.now() - sliceStart;

                        const finalState = await this.thermalMonitor.getCurrentTemperature();
                        const finalRecommendation = await this.thermalPolicy.getRecommendedLimits(finalState, {
                                maxDepth: effectiveRecipe.maxDepth,
                                maxNodes: effectiveRecipe.maxNodes,
                                operationElapsedMs: operationDuration,
                        });
                        const emergencyAtEnd = (await this.thermalPolicy.isEmergencyMode(finalState)) || emergencyAtStart;
                        const rapidIncrease = this.detectRapidIncrease();
                        const emergencyTriggered = emergencyAtEnd || rapidIncrease.detected;
                        const operationAborted = rapidIncrease.detected && emergencyTriggered;

                        const thermalStatus = this.createThermalStatus({
                                state: finalState,
                                shouldThrottle,
                                throttlingLevel: throttlingLevel ?? finalRecommendation.throttlingLevel,
                                rapidIncrease,
                                emergencyTriggered,
                                operationAborted,
                                recommendation: finalRecommendation,
                                emergencyAtStart,
                        });

                        const metadata = this.createThermalMetadata(sliceResult.metadata, {
                                shouldThrottle,
                                depthReduced,
                                nodesReduced,
                                emergencyTriggered,
                                emergencyAtStart,
                                rapidIncrease,
                                operationAborted,
                                recommendation: finalRecommendation,
                                throttlingReason: finalRecommendation.reason ?? initialRecommendation.reason,
                        });

                        const enrichedSubgraph = this.enrichSubgraph(
                                sliceResult.subgraph,
                                effectiveRecipe,
                                finalRecommendation,
                        );

                        const recommendations = finalRecommendation.recommendations ?? initialRecommendation.recommendations;

                        return {
                                ...sliceResult,
                                subgraph: enrichedSubgraph,
                                metadata,
                                thermalStatus,
                                thermalAnalytics: this.createThermalAnalytics(initialState, finalState),
                                thermalRecommendations: recommendations && recommendations.length > 0 ? recommendations : undefined,
                        };
                } catch (error) {
                        const thermalState = await this.thermalMonitor.getCurrentTemperature();
                        return this.createThermalErrorResult(
                                error,
                                operationId,
                                startTime,
                                thermalState,
                                shouldThrottle,
                        );
                } finally {
                        this.stopThermalMonitoring();
                }
        }

        async thermalAwarePack(
                subgraph: ThermalContextSliceResult['subgraph'],
                options: ThermalContextPackOptions,
        ): Promise<ThermalContextPackResult> {
                const startTime = Date.now();
                const thermalState = await this.thermalMonitor.getCurrentTemperature();
                const recommendation = await this.thermalPolicy.getRecommendedLimits(thermalState, {
                        maxNodes: subgraph.nodes.length,
                        maxDepth: subgraph.metadata.depthUsed ?? 1,
                });

                if (await this.thermalPolicy.isEmergencyMode(thermalState)) {
                        const emergencyMetadata: ThermalPackMetadata = {
                                totalNodes: 0,
                                totalEdges: 0,
                                totalTokens: 0,
                                packDuration: Date.now() - startTime,
                                brainwavBranded: true,
                                thermalShutdown: thermalState.zone === 'shutdown',
                                thermalEmergency: thermalState.critical,
                                brainwavThermalManaged: true,
                        };

                        return {
                                subgraph: { nodes: [], edges: [] },
                                packedContext: '',
                                metadata: emergencyMetadata,
                                thermalStatus: this.createThermalStatus({
                                        state: thermalState,
                                        shouldThrottle: true,
                                        throttlingLevel: recommendation.throttlingLevel,
                                        rapidIncrease: { detected: false, delta: 0 },
                                        emergencyTriggered: true,
                                        operationAborted: true,
                                        recommendation,
                                        emergencyAtStart: true,
                                }),
                                thermalAnalytics: this.createThermalAnalytics(thermalState, thermalState),
                        };
                }

                const packResult = await this.contextPackService.pack(subgraph, options);
                const finalState = await this.thermalMonitor.getCurrentTemperature();
                const finalRecommendation = await this.thermalPolicy.getRecommendedLimits(finalState, {
                        maxNodes: subgraph.nodes.length,
                        maxDepth: subgraph.metadata.depthUsed ?? 1,
                        operationElapsedMs: Date.now() - startTime,
                });

                const optimizedMetadata: ThermalPackMetadata = {
                        ...packResult.metadata,
                        brainwavThermalManaged: true,
                        thermalOptimizationProvided:
                                (finalRecommendation.recommendations?.length ?? 0) > 0 ||
                                (recommendation.recommendations?.length ?? 0) > 0,
                };

                return {
                        ...packResult,
                        metadata: optimizedMetadata,
                        thermalStatus: this.createThermalStatus({
                                state: finalState,
                                shouldThrottle: await this.thermalPolicy.shouldThrottle(finalState, {
                                        maxNodes: subgraph.nodes.length,
                                        maxDepth: subgraph.metadata.depthUsed ?? 1,
                                }),
                                throttlingLevel: finalRecommendation.throttlingLevel,
                                rapidIncrease: this.detectRapidIncrease(),
                                emergencyTriggered: await this.thermalPolicy.isEmergencyMode(finalState),
                                operationAborted: false,
                                recommendation: finalRecommendation,
                                emergencyAtStart: false,
                        }),
                        thermalAnalytics: this.createThermalAnalytics(thermalState, finalState),
                };
        }

        private startThermalMonitoring(): void {
                this.isMonitoring = true;
                this.temperatureReadings = [];
                this.thermalMonitor.startMonitoring((reading) => {
                        if (!this.isMonitoring) {
                                return;
                        }
                        this.temperatureReadings.push({
                                temp: Math.round(reading.temp),
                                timestamp: reading.timestamp,
                        });
                });
        }

        private stopThermalMonitoring(): void {
                if (!this.isMonitoring) {
                        return;
                }
                this.isMonitoring = false;
                this.thermalMonitor.stopMonitoring();
                this.temperatureReadings = [];
        }

        private createThermalStatus(params: {
                state: ThermalState;
                shouldThrottle: boolean;
                throttlingLevel?: ThermalPolicyRecommendation['throttlingLevel'];
                rapidIncrease: { detected: boolean; delta: number };
                emergencyTriggered: boolean;
                operationAborted: boolean;
                recommendation: ThermalPolicyRecommendation;
                emergencyAtStart: boolean;
        }): ThermalStatus {
                const {
                        state,
                        shouldThrottle,
                        throttlingLevel,
                        rapidIncrease,
                        emergencyTriggered,
                        operationAborted,
                        recommendation,
                        emergencyAtStart,
                } = params;

                return {
                        currentTemp: state.currentTemp,
                        trend: state.trend,
                        zone: state.zone,
                        critical: state.critical,
                        throttlingActive: shouldThrottle,
                        throttlingLevel,
                        monitored: this.temperatureReadings.length > 0,
                        temperatureReadings:
                                this.temperatureReadings.length > 0 ? [...this.temperatureReadings] : undefined,
                        predictedTemp: state.predictedTemp ?? recommendation.predictedTemp,
                        rapidIncreaseDetected: rapidIncrease.detected,
                        temperatureIncrease: rapidIncrease.delta,
                        emergencyTriggered,
                        thermalEmergency: emergencyTriggered,
                        operationAborted,
                        recoveryMode: recommendation.recoveryMode ?? state.recoveryMode ?? false,
                        cooldownRequired: recommendation.cooldownRequired ?? state.cooldownRequired ?? false,
                        cooldownDuration: recommendation.cooldownDuration ?? state.cooldownDuration,
                        emergencyMode: emergencyAtStart || recommendation.emergencyMode || state.emergencyMode || false,
                };
        }

        private createThermalMetadata(
                baseMetadata: ContextSliceResult['metadata'],
                details: {
                        shouldThrottle: boolean;
                        depthReduced: boolean;
                        nodesReduced: boolean;
                        emergencyTriggered: boolean;
                        emergencyAtStart: boolean;
                        rapidIncrease: { detected: boolean; delta: number };
                        operationAborted: boolean;
                        recommendation: ThermalPolicyRecommendation;
                        throttlingReason?: string;
                },
        ): ContextSliceResult['metadata'] & ThermalSliceMetadata {
                const existingProtection = (baseMetadata as Partial<ThermalSliceMetadata>).brainwavThermalProtected;

                const metadata: ContextSliceResult['metadata'] & ThermalSliceMetadata = {
                        ...baseMetadata,
                        brainwavThermalManaged: true,
                        thermalConstrained: details.shouldThrottle,
                        depthReduced: details.shouldThrottle ? details.depthReduced : false,
                        nodesReduced: details.shouldThrottle ? details.nodesReduced : false,
                        emergencyThrottling: details.emergencyTriggered,
                        proactiveThrottling:
                                details.recommendation.throttlingLevel === 'proactive' ||
                                Boolean(details.recommendation.proactive),
                        throttlingReason: details.throttlingReason,
                        brainwavEmergencyMode: details.emergencyTriggered || details.recommendation.emergencyMode,
                        brainwavThermalProtected: existingProtection ?? false,
                        thermalMonitoringActive: this.temperatureReadings.length > 0,
                        thermalEmergency: details.rapidIncrease.detected,
                        operationAborted: details.operationAborted,
                        thermalRecovery: Boolean(details.recommendation.recoveryMode),
                        capabilitiesRestored: Boolean(details.recommendation.capabilitiesRestored),
                        cooldownEnforced: Boolean(details.recommendation.cooldownRequired),
                        operationDelayed: Boolean(details.recommendation.cooldownRequired),
                        thermalCooldownActive: Boolean(details.recommendation.cooldownRequired),
                        thermalOptimizationProvided:
                                (details.recommendation.recommendations?.length ?? 0) > 0,
                        brainwavThermalOptimized:
                                (details.recommendation.recommendations?.length ?? 0) > 0,
                        emergencyTriggered: details.emergencyTriggered,
                        cooldownRequired: details.recommendation.cooldownRequired,
                };

                if (!metadata.brainwavThermalProtected && details.emergencyTriggered) {
                        metadata.brainwavThermalProtected = false;
                }

                if (!metadata.thermalShutdown) {
                        metadata.thermalShutdown = false;
                }

                return metadata;
        }

        private enrichSubgraph(
                subgraph: ContextSliceResult['subgraph'],
                effectiveRecipe: ThermalContextSliceRecipe,
                recommendation: ThermalPolicyRecommendation,
        ): ContextSliceResult['subgraph'] {
                const metadata = {
                        ...subgraph.metadata,
                        maxDepthUsed: Math.min(effectiveRecipe.maxDepth, recommendation.maxDepth ?? effectiveRecipe.maxDepth),
                        maxNodesUsed: Math.min(effectiveRecipe.maxNodes, recommendation.maxNodes ?? effectiveRecipe.maxNodes),
                };

                return {
                        ...subgraph,
                        metadata,
                };
        }

        private createThermalAnalytics(initial: ThermalState, final: ThermalState) {
                return {
                        operationTempStart: initial.currentTemp,
                        operationTempEnd: final.currentTemp,
                        tempDelta: final.currentTemp - initial.currentTemp,
                        thermalEfficiency: Math.max(0, 1 - Math.abs(final.currentTemp - initial.currentTemp) / 50),
                        brainwavThermalMetrics: true,
                };
        }

        private detectRapidIncrease(): { detected: boolean; delta: number } {
                if (this.temperatureReadings.length < 2) {
                        return { detected: false, delta: 0 };
                }

                const first = this.temperatureReadings[0];
                const last = this.temperatureReadings[this.temperatureReadings.length - 1];
                const delta = Math.round(last.temp - first.temp);

                return {
                        detected: delta >= RAPID_INCREASE_THRESHOLD,
                        delta,
                };
        }

        private createThermalRejection(
                state: ThermalState,
                recommendation: ThermalPolicyRecommendation,
                operationId: string,
                startTime: number,
                throttlingLevel?: ThermalPolicyRecommendation['throttlingLevel'],
        ): ThermalContextSliceResult {
                const metadata: ContextSliceResult['metadata'] & ThermalSliceMetadata = {
                        sliceDuration: Date.now() - startTime,
                        brainwavBranded: true,
                        brainwavOperationId: operationId,
                        thermalShutdown: true,
                        brainwavThermalProtected: true,
                        brainwavThermalManaged: true,
                        emergencyThrottling: true,
                        thermalConstrained: true,
                        depthReduced: true,
                        nodesReduced: true,
                        throttlingReason: recommendation.reason,
                };

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
                                        maxDepthUsed: 0,
                                        maxNodesUsed: 0,
                                },
                        },
                        metadata,
                        thermalStatus: this.createThermalStatus({
                                state,
                                shouldThrottle: true,
                                throttlingLevel: throttlingLevel ?? recommendation.throttlingLevel,
                                rapidIncrease: { detected: false, delta: 0 },
                                emergencyTriggered: true,
                                operationAborted: true,
                                recommendation,
                                emergencyAtStart: true,
                        }),
                        rejected: true,
                        reason: recommendation.reason ?? 'Thermal shutdown threshold exceeded',
                        thermalAnalytics: this.createThermalAnalytics(state, state),
                };
        }

        private createThermalErrorResult(
                error: unknown,
                operationId: string,
                startTime: number,
                state: ThermalState,
                throttled: boolean,
        ): ThermalContextSliceResult {
                const reason = `Thermal-aware slice error: ${error instanceof Error ? error.message : String(error)}`;

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
                                        maxDepthUsed: 0,
                                        maxNodesUsed: 0,
                                },
                        },
                        metadata: {
                                sliceDuration: Date.now() - startTime,
                                brainwavBranded: true,
                                brainwavOperationId: operationId,
                                error: reason,
                                thermalShutdown: state.zone === 'shutdown',
                                brainwavThermalManaged: true,
                        },
                        thermalStatus: this.createThermalStatus({
                                state,
                                shouldThrottle: throttled,
                                throttlingLevel: undefined,
                                rapidIncrease: this.detectRapidIncrease(),
                                emergencyTriggered: state.zone === 'shutdown' || state.critical,
                                operationAborted: true,
                                recommendation: {
                                        maxDepth: 0,
                                        maxNodes: 0,
                                        maxConcurrentOps: 0,
                                        throttlingActive: throttled,
                                        throttlingLevel: 'emergency',
                                        emergencyMode: state.critical,
                                },
                                emergencyAtStart: state.critical,
                        }),
                        rejected: true,
                        reason,
                        thermalAnalytics: this.createThermalAnalytics(state, state),
                };
        }

        private createDefaultContextSliceService(): ContextSliceAdapter {
                return {
                        slice: async (recipe: ThermalContextSliceRecipe): Promise<ContextSliceResult> => {
                                const sliceDuration = 5;
                                return {
                                        subgraph: {
                                                nodes: [],
                                                edges: [],
                                                metadata: {
                                                        focusNodes: 0,
                                                        expandedNodes: 0,
                                                        totalChunks: 0,
                                                        edgesTraversed: 0,
                                                        depthUsed: recipe.maxDepth,
                                                        nodesExplored: recipe.maxNodes,
                                                        sliceDuration,
                                                        brainwavGenerated: false,
                                                        brainwavBranded: true,
                                                        maxDepthUsed: recipe.maxDepth,
                                                        maxNodesUsed: recipe.maxNodes,
                                                },
                                        },
                                        metadata: {
                                                sliceDuration,
                                                brainwavBranded: true,
                                                brainwavOperationId: `thermal-default-${randomUUID()}`,
                                                depthUsed: recipe.maxDepth,
                                                nodesExplored: recipe.maxNodes,
                                        },
                                };
                        },
                };
        }

        private createDefaultContextPackService(): ContextPackAdapter {
                return {
                        pack: async (subgraph, options) => {
                                const packDuration = 5;
                                return {
                                        subgraph,
                                        packedContext: JSON.stringify({ nodes: subgraph.nodes.length }),
                                        metadata: {
                                                totalNodes: subgraph.nodes.length,
                                                totalEdges: subgraph.edges.length,
                                                totalTokens: subgraph.nodes.length * 150,
                                                packDuration,
                                                format: options.format ?? 'markdown',
                                                brainwavBranded: options.branding !== false,
                                        },
                                };
                        },
                };
        }
}
