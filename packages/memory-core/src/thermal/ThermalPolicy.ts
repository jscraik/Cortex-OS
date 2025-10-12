import type { ThermalLimits, ThermalState } from './ThermalMonitor.js';

export interface ThermalPolicyConfig {
        maxDepth: number;
        maxNodes: number;
        maxConcurrentOps: number;
        proactiveTempThreshold: number;
        rapidIncreaseDelta: number;
        cooldownPaddingMs: number;
}

export type ThermalContextInput = Partial<{
        maxDepth: number;
        maxNodes: number;
        maxConcurrentOps: number;
        operationElapsedMs: number;
}>;

export interface ThermalPolicyRecommendation extends ThermalLimits {
        cooldownRequired?: boolean;
        cooldownDuration?: number;
        predictedTemp?: number;
        predictionWindow?: string;
        proactive?: boolean;
        capabilitiesRestored?: boolean;
}

const DEFAULT_CONFIG: ThermalPolicyConfig = {
        maxDepth: 5,
        maxNodes: 50,
        maxConcurrentOps: 5,
        proactiveTempThreshold: 80,
        rapidIncreaseDelta: 12,
        cooldownPaddingMs: 2_000,
};

const RECOVERY_REDUCTION = 0.6;

/**
 * ThermalPolicy is a critical component for managing and enforcing thermal limits
 * within the system. It provides logic to determine operational constraints based
 * on current and predicted thermal states, and can recommend throttling, cooldowns,
 * or restoration of capabilities as appropriate.
 *
 * ## Configuration
 * The policy can be configured via the constructor with options such as:
 * - `maxDepth`: Maximum allowed operation depth.
 * - `maxNodes`: Maximum number of nodes allowed.
 * - `maxConcurrentOps`: Maximum concurrent operations permitted.
 * - `proactiveTempThreshold`: Temperature threshold for proactive throttling.
 * - `rapidIncreaseDelta`: Temperature delta to detect rapid increases.
 * - `cooldownPaddingMs`: Additional cooldown time in milliseconds.
 *
 * ## Key Methods
 * - {@link getThermalLimits}: Given the current thermal state and optional context,
 *   returns a recommendation for operational limits, including whether throttling
 *   or cooldown is required.
 *
 * ## Usage
 * Instantiate the policy with optional configuration, then call `getThermalLimits`
 * as needed to obtain recommendations based on the current system state.
 *
 * @example
 * const policy = new ThermalPolicy({ maxDepth: 10 });
 * const recommendation = await policy.getThermalLimits(currentState, { operationElapsedMs: 500 });
 * if (recommendation.cooldownRequired) {
 *   // Initiate cooldown logic
 * }
 */
export class ThermalPolicy {
        private readonly config: ThermalPolicyConfig;

        constructor(config: Partial<ThermalPolicyConfig> = {}) {
                this.config = { ...DEFAULT_CONFIG, ...config };
        }

        async getThermalLimits(
                state: ThermalState,
                context: ThermalContextInput = {},
        ): Promise<ThermalPolicyRecommendation> {
                const limits: ThermalPolicyRecommendation = {
                        maxDepth: this.config.maxDepth,
                        maxNodes: this.config.maxNodes,
                        maxConcurrentOps: this.config.maxConcurrentOps,
                        throttlingActive: false,
                        throttlingLevel: 'none',
                        recoveryMode: Boolean(state.recoveryMode),
                        emergencyMode: Boolean(state.emergencyMode),
                        predictedTemp: state.predictedTemp,
                        predictionWindow: state.predictionWindow,
                };

                const rapidIncrease =
                        typeof state.previousTemp === 'number'
                                ? state.currentTemp - state.previousTemp >= this.config.rapidIncreaseDelta
                                : false;

                switch (state.zone) {
                        case 'shutdown':
                                limits.maxDepth = 0;
                                limits.maxNodes = 0;
                                limits.maxConcurrentOps = 0;
                                limits.throttlingActive = true;
                                limits.throttlingLevel = 'emergency';
                                limits.reason = 'Thermal shutdown threshold exceeded';
                                limits.emergencyMode = true;
                                limits.recommendations = [
                                        'Immediate shutdown of high-intensity workloads',
                                        'Inspect cooling systems before resuming operations',
                                ];
                                break;

                        case 'critical':
                                limits.maxDepth = 1;
                                limits.maxNodes = 4;
                                limits.maxConcurrentOps = 1;
                                limits.throttlingActive = true;
                                limits.throttlingLevel = 'aggressive';
                                limits.reason = 'Critical temperature detected';
                                limits.emergencyMode = true;
                                limits.cooldownRequired = true;
                                limits.cooldownDuration = Math.max(state.cooldownDuration ?? 5_000, 5_000);
                                limits.recommendations = [
                                        'Trigger emergency cooling protocols',
                                        'Distribute workload to external services',
                                ];
                                break;

                        case 'elevated':
                                limits.maxDepth = Math.min(3, limits.maxDepth);
                                limits.maxNodes = Math.min(16, limits.maxNodes);
                                limits.maxConcurrentOps = Math.min(2, limits.maxConcurrentOps);
                                limits.throttlingActive = true;
                                limits.throttlingLevel = 'moderate';
                                limits.reason = 'Elevated thermal zone - enforcing moderate throttling';
                                limits.cooldownRequired = state.cooldownRequired ?? true;
                                limits.cooldownDuration =
                                        state.cooldownDuration ?? this.estimateCooldown(state, context);
                                limits.recommendations = [
                                        'Reduce concurrent operations',
                                        'Increase cooldown periods between runs',
                                        'Consider workload distribution',
                                ];
                                break;

                        case 'normal':
                                if (
                                        state.trend === 'rising' ||
                                        (typeof state.predictedTemp === 'number' &&
                                                state.predictedTemp >= this.config.proactiveTempThreshold)
                                ) {
                                        limits.maxDepth = Math.min(4, limits.maxDepth);
                                        limits.maxNodes = Math.min(24, limits.maxNodes);
                                        limits.maxConcurrentOps = Math.min(4, limits.maxConcurrentOps);
                                        limits.throttlingActive = true;
                                        limits.throttlingLevel = 'proactive';
                                        limits.reason =
                                                state.predictedTemp && state.predictedTemp >= this.config.proactiveTempThreshold
                                                        ? `Predictive throttling: forecast temperature ${state.predictedTemp}°C`
                                                        : 'Predictive throttling due to rising temperature trend';
                                        limits.proactive = true;
                                        limits.cooldownRequired = state.cooldownRequired ?? false;
                                        limits.cooldownDuration = state.cooldownDuration;
                                        limits.recommendations = ['Monitor temperature trend closely'];
                                }
                                break;

                        case 'recovering':
                                limits.maxDepth = Math.ceil(this.config.maxDepth * RECOVERY_REDUCTION);
                                limits.maxNodes = Math.ceil(this.config.maxNodes * RECOVERY_REDUCTION);
                                limits.maxConcurrentOps = Math.max(1, Math.ceil(this.config.maxConcurrentOps * RECOVERY_REDUCTION));
                                limits.throttlingActive = true;
                                limits.throttlingLevel = 'recovery';
                                limits.reason = 'System recovering from previous thermal event';
                                limits.cooldownRequired = Boolean(state.cooldownRequired);
                                limits.cooldownDuration = state.cooldownDuration;
                                limits.recoveryMode = true;
                                limits.capabilitiesRestored = true;
                                limits.recommendations = [
                                        'Maintain reduced workload while system stabilizes',
                                        'Gradually restore capabilities once stable',
                                ];
                                break;

                        default:
                                break;
                }

                if (!limits.throttlingActive && (state.trend === 'rapidly_rising' || rapidIncrease)) {
                        limits.throttlingActive = true;
                        limits.throttlingLevel = 'proactive';
                        limits.reason = rapidIncrease
                                ? `Rapid temperature increase detected (${state.currentTemp - (state.previousTemp ?? 0)}°C)`
                                : 'Rapid temperature rise detected';
                        limits.proactive = true;
                        limits.recommendations = [
                                ...(limits.recommendations ?? []),
                                'Investigate potential hotspots or CPU spikes',
                        ];
                }

                if (state.recoveryMode && limits.throttlingLevel !== 'recovery') {
                        limits.recoveryMode = true;
                        limits.capabilitiesRestored = true;
                        limits.recommendations = [
                                ...(limits.recommendations ?? []),
                                'System recovering - maintain reduced load',
                        ];
                }

                this.applyContextBounds(limits, context);
                return limits;
        }

        async shouldThrottle(state: ThermalState, context: ThermalContextInput = {}): Promise<boolean> {
                const limits = await this.getThermalLimits(state, context);
                return limits.throttlingActive;
        }

        async getThrottlingLevel(
                state: ThermalState,
                context: ThermalContextInput = {},
        ): Promise<ThermalLimits['throttlingLevel']> {
                const limits = await this.getThermalLimits(state, context);
                return limits.throttlingLevel;
        }

        async getRecommendedLimits(
                state: ThermalState,
                context: ThermalContextInput = {},
        ): Promise<ThermalPolicyRecommendation> {
                const limits = await this.getThermalLimits(state, context);
                limits.recommendations = this.buildRecommendations(limits, state);
                return limits;
        }

        async isEmergencyMode(state: ThermalState): Promise<boolean> {
                return state.zone === 'shutdown' || state.zone === 'critical' || Boolean(state.emergencyMode);
        }

        private applyContextBounds(limits: ThermalPolicyRecommendation, context: ThermalContextInput): void {
                if (typeof context.maxDepth === 'number') {
                        limits.maxDepth = Math.min(limits.maxDepth, context.maxDepth);
                }
                if (typeof context.maxNodes === 'number') {
                        limits.maxNodes = Math.min(limits.maxNodes, context.maxNodes);
                }
                if (typeof context.maxConcurrentOps === 'number') {
                        limits.maxConcurrentOps = Math.min(limits.maxConcurrentOps, context.maxConcurrentOps);
                }
        }

        private estimateCooldown(state: ThermalState, context: ThermalContextInput): number {
                const baseDuration = state.cooldownDuration ?? 3_000;
                const elapsed = context.operationElapsedMs ?? 0;
                const padding = this.config.cooldownPaddingMs;
                return Math.max(0, baseDuration + padding - Math.min(elapsed, baseDuration));
        }

        private buildRecommendations(
                limits: ThermalPolicyRecommendation,
                state: ThermalState,
        ): string[] {
                const recommendations = new Set<string>(limits.recommendations ?? []);

                if (limits.throttlingActive && limits.throttlingLevel === 'aggressive') {
                        recommendations.add('Suspend non-critical context operations');
                        recommendations.add('Escalate to operations team if sustained');
                }

                if (limits.throttlingLevel === 'proactive') {
                        recommendations.add('Pre-warm alternate compute resources');
                }

                if (state.trend === 'rapidly_rising') {
                        recommendations.add('Enable predictive throttling and monitoring alerts');
                }

                if (limits.cooldownRequired) {
                        recommendations.add('Enforce cooldown window before next operation');
                }

                if (limits.recoveryMode) {
                        recommendations.add('Gradually restore workload capacity');
                }

                return Array.from(recommendations);
        }
}
