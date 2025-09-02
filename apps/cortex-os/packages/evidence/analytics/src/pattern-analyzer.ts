/**
 * @file_path packages/orchestration-analytics/src/pattern-analyzer.ts
 * @description Advanced pattern analysis for agent interactions and workflow optimization
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-04
 * @version 1.0.0
 * @status active
 * @ai_generated_by human
 * @ai_provenance_hash N/A
 */

import { EventEmitter } from "node:events";
import pino from "pino";
import type {
	AgentMetrics,
	AnalyticsConfig,
	CrossAgentDependency,
	InteractionPattern,
	PerformanceAnomaly,
	WorkflowBottleneck,
} from "./types.js";

/**
 * Advanced pattern analyzer for multi-agent orchestration
 * Identifies interaction patterns, dependencies, and optimization opportunities
 */
export class PatternAnalyzer extends EventEmitter {
	private logger: pino.Logger;
	private config: AnalyticsConfig;
	private isAnalyzing = false;
	private analysisInterval?: NodeJS.Timeout;

	// Pattern detection data
	private interactionHistory: Map<
		string,
		Array<{ timestamp: Date; target: string; type: string; latency: number }>
	> = new Map();
	private detectedPatterns: InteractionPattern[] = [];
	private dependencies: CrossAgentDependency[] = [];
	private bottlenecks: WorkflowBottleneck[] = [];
	private anomalies: PerformanceAnomaly[] = [];

	// Analysis statistics
	private patternsDetected = 0;
	private lastAnalysisTime?: Date;
	private analysisErrors = 0;

	constructor(config: AnalyticsConfig) {
		super();
		this.config = config;
		this.logger = pino({
			name: "orchestration-pattern-analyzer",
			level: "info",
		});

		this.initializeAnalysis();
	}

	/**
	 * Initialize pattern analysis system
	 */
	private initializeAnalysis(): void {
		this.logger.info("Initializing pattern analysis system", {
			patternDetection: this.config.analysis.patternDetection,
			anomalyDetection: this.config.analysis.anomalyDetection,
		});

		if (this.config.analysis.patternDetection) {
			this.startAnalysis();
		}
	}

	/**
	 * Start automated pattern analysis
	 */
	startAnalysis(): void {
		if (this.isAnalyzing) {
			this.logger.warn("Pattern analysis already running");
			return;
		}

		this.isAnalyzing = true;

		// Start periodic analysis
		this.analysisInterval = setInterval(() => {
			this.analyzePatterns().catch((error) => {
				this.logger.error("Error during pattern analysis", {
					error: error.message,
				});
				this.analysisErrors++;
			});
		}, this.config.collection.interval * 2); // Analyze less frequently than collection

		this.logger.info("Pattern analysis started");
		this.emit("analysisStarted");
	}

	/**
	 * Stop pattern analysis
	 */
	stopAnalysis(): void {
		if (!this.isAnalyzing) {
			this.logger.warn("Pattern analysis not running");
			return;
		}

		this.isAnalyzing = false;

		if (this.analysisInterval) {
			clearInterval(this.analysisInterval);
			this.analysisInterval = undefined;
		}

		this.logger.info("Pattern analysis stopped");
		this.emit("analysisStopped");
	}

	/**
	 * Analyze agent interaction patterns and detect anomalies
	 */
	async analyzePatterns(): Promise<void> {
		try {
			const startTime = Date.now();

			// Detect interaction patterns
			const newPatterns = await this.detectInteractionPatterns();

			// Analyze agent dependencies
			const newDependencies = await this.analyzeDependencies();

			// Identify workflow bottlenecks
			const newBottlenecks = await this.identifyBottlenecks();

			// Detect performance anomalies
			const newAnomalies = await this.detectAnomalies();

			// Update stored data
			this.updateStoredPatterns(
				newPatterns,
				newDependencies,
				newBottlenecks,
				newAnomalies,
			);

			// Update statistics
			this.patternsDetected += newPatterns.length;
			this.lastAnalysisTime = new Date();

			const analysisTime = Date.now() - startTime;

			this.logger.debug("Pattern analysis completed", {
				newPatterns: newPatterns.length,
				newDependencies: newDependencies.length,
				newBottlenecks: newBottlenecks.length,
				newAnomalies: newAnomalies.length,
				analysisTime,
				totalPatterns: this.detectedPatterns.length,
			});

			// Emit analysis results for real-time processing
			this.emit("patternsAnalyzed", {
				patterns: newPatterns,
				dependencies: newDependencies,
				bottlenecks: newBottlenecks,
				anomalies: newAnomalies,
				timestamp: new Date(),
				analysisTime,
			});
		} catch (error) {
			this.logger.error("Failed to analyze patterns", { error: error.message });
			this.analysisErrors++;
			throw error;
		}
	}

	/**
	 * Ingest historical data from other components for context-aware analysis
	 */
	addHistoricalData(
		_metrics: AgentMetrics[],
		_orchestrationMetrics: unknown[],
		patterns: InteractionPattern[],
		bottlenecks: WorkflowBottleneck[],
	): void {
		// Store the passed-in patterns/bottlenecks so they are included in stats
		if (patterns?.length) this.detectedPatterns.push(...patterns);
		if (bottlenecks?.length) this.bottlenecks.push(...bottlenecks);
		// Maintain limits after ingestion
		this.maintainStorageLimits();
	}

	/**
	 * Record agent interaction for pattern detection
	 */
	recordInteraction(
		sourceAgent: string,
		targetAgent: string,
		type: string,
		latency: number,
	): void {
		if (!this.interactionHistory.has(sourceAgent)) {
			this.interactionHistory.set(sourceAgent, []);
		}

		let interactions = this.interactionHistory.get(sourceAgent);
		if (!interactions) {
			interactions = [];
			this.interactionHistory.set(sourceAgent, interactions);
		}
		interactions.push({
			timestamp: new Date(),
			target: targetAgent,
			type,
			latency,
		});

		// Maintain history size
		const maxHistorySize = 1000;
		if (interactions.length > maxHistorySize) {
			interactions.splice(0, interactions.length - maxHistorySize);
		}
	}

	/**
	 * Detect interaction patterns between agents
	 */
	private async detectInteractionPatterns(): Promise<InteractionPattern[]> {
		const patterns: InteractionPattern[] = [];
		const timeWindow = 5 * 60 * 1000; // 5 minutes
		const currentTime = Date.now();

		try {
			// Analyze interaction frequencies and patterns
			for (const [sourceAgent, interactions] of this.interactionHistory) {
				const recentInteractions = interactions.filter(
					(interaction) =>
						currentTime - interaction.timestamp.getTime() < timeWindow,
				);

				if (recentInteractions.length < 3) continue; // Need minimum interactions

				// Group by target and type
				const targetGroups = this.groupInteractionsByTarget(recentInteractions);

				for (const [targetAgent, targetInteractions] of targetGroups) {
					const pattern = await this.analyzeInteractionPattern(
						sourceAgent,
						targetAgent,
						targetInteractions,
					);

					if (pattern) {
						patterns.push(pattern);
					}
				}
			}

			// Detect multi-agent patterns (broadcast, cascade, circular)
			const multiAgentPatterns = await this.detectMultiAgentPatterns();
			patterns.push(...multiAgentPatterns);
		} catch (error) {
			this.logger.error("Error detecting interaction patterns", {
				error: error.message,
			});
		}

		return patterns;
	}

	/**
	 * Group interactions by target agent
	 */
	private groupInteractionsByTarget(
		interactions: Array<{
			timestamp: Date;
			target: string;
			type: string;
			latency: number;
		}>,
	): Map<
		string,
		Array<{ timestamp: Date; target: string; type: string; latency: number }>
	> {
		const groups = new Map();

		for (const interaction of interactions) {
			if (!groups.has(interaction.target)) {
				groups.set(interaction.target, []);
			}
			groups.get(interaction.target).push(interaction);
		}

		return groups;
	}

	/**
	 * Analyze interaction pattern between two agents
	 */
	private async analyzeInteractionPattern(
		sourceAgent: string,
		targetAgent: string,
		interactions: Array<{
			timestamp: Date;
			target: string;
			type: string;
			latency: number;
		}>,
	): Promise<InteractionPattern | null> {
		if (interactions.length < 2) return null;

		try {
			// Calculate pattern metrics
			const frequency = interactions.length;
			const latencies = interactions.map((i) => i.latency);
			const averageLatency =
				latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
			const types = [...new Set(interactions.map((i) => i.type))];

			// Determine pattern type
			const patternType = this.determinePatternType(interactions);

			// Calculate criticality based on frequency and dependencies
			const criticality = this.calculateCriticality(
				frequency,
				averageLatency,
				types,
			);

			return {
				id: `pattern-${sourceAgent}-${targetAgent}-${Date.now()}`,
				patternType,
				participants: [sourceAgent, targetAgent],
				frequency,
				averageLatency,
				successRate: this.calculateSuccessRate(interactions),
				communicationVolume: frequency,
				dependencies: await this.getPatternDependencies(
					sourceAgent,
					targetAgent,
				),
				criticality,
				detectedAt: new Date(),
			};
		} catch (error) {
			this.logger.error("Error analyzing interaction pattern", {
				sourceAgent,
				targetAgent,
				error: error.message,
			});
			return null;
		}
	}

	/**
	 * Determine the type of interaction pattern
	 */
	private determinePatternType(
		interactions: Array<{
			timestamp: Date;
			target: string;
			type: string;
			latency: number;
		}>,
	): InteractionPattern["patternType"] {
		const types = interactions.map((i) => i.type);

		// Analyze temporal patterns
		const timestamps = interactions.map((i) => i.timestamp.getTime());
		const intervals = [];
		for (let i = 1; i < timestamps.length; i++) {
			intervals.push(timestamps[i] - timestamps[i - 1]);
		}

		const avgInterval =
			intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
		const intervalVariance = this.calculateVariance(intervals);

		// Determine pattern based on characteristics
		if (
			types.every((type) => type === "request") &&
			intervalVariance < avgInterval * 0.2
		) {
			return "request-response";
		} else if (types.includes("broadcast")) {
			return "broadcast";
		} else if (this.detectsCascadePattern(interactions)) {
			return "cascade";
		} else {
			return "request-response"; // Default
		}
	}

	/**
	 * Detect cascade patterns in interactions
	 */
	private detectsCascadePattern(
		interactions: Array<{
			timestamp: Date;
			target: string;
			type: string;
			latency: number;
		}>,
	): boolean {
		// Look for cascading delays or increasing latencies
		const latencies = interactions.map((i) => i.latency);
		let increasingCount = 0;

		for (let i = 1; i < latencies.length; i++) {
			if (latencies[i] > latencies[i - 1]) {
				increasingCount++;
			}
		}

		return increasingCount > latencies.length * 0.6; // 60% increasing latencies
	}

	/**
	 * Calculate pattern criticality
	 */
	private calculateCriticality(
		frequency: number,
		averageLatency: number,
		types: string[],
	): InteractionPattern["criticality"] {
		let score = 0;

		// High frequency increases criticality
		if (frequency > 20) score += 2;
		else if (frequency > 10) score += 1;

		// High latency increases criticality
		if (averageLatency > 1000) score += 2;
		else if (averageLatency > 500) score += 1;

		// Critical operation types
		if (
			types.some((type) =>
				["coordination", "decision", "critical"].includes(type),
			)
		) {
			score += 2;
		}

		if (score >= 4) return "high";
		if (score >= 2) return "medium";
		return "low";
	}

	/**
	 * Calculate success rate for interactions
	 */
	private calculateSuccessRate(
		interactions: Array<{
			timestamp: Date;
			target: string;
			type: string;
			latency: number;
		}>,
	): number {
		// In a real implementation, this would track actual success/failure
		// For now, estimate based on latency patterns
		const highLatencyCount = interactions.filter(
			(i) => i.latency > 2000,
		).length;
		return Math.max(0.5, 1 - highLatencyCount / interactions.length);
	}

	/**
	 * Get dependencies for a pattern
	 */
	private async getPatternDependencies(
		sourceAgent: string,
		targetAgent: string,
	): Promise<string[]> {
		// Analyze agent dependencies based on interaction history
		const dependencies: string[] = [];

		// Look for agents that the source depends on before interacting with target
		for (const [agent, interactions] of this.interactionHistory) {
			if (agent === sourceAgent) continue;

			const hasPrerequisiteInteraction = interactions.some(
				(interaction) =>
					interaction.target === sourceAgent ||
					interaction.target === targetAgent,
			);

			if (hasPrerequisiteInteraction) {
				dependencies.push(agent);
			}
		}

		return dependencies;
	}

	/**
	 * Detect multi-agent patterns (broadcast, cascade, circular)
	 */
	private async detectMultiAgentPatterns(): Promise<InteractionPattern[]> {
		const patterns: InteractionPattern[] = [];

		try {
			// Detect broadcast patterns (one agent communicating with many)
			const broadcastPatterns = await this.detectBroadcastPatterns();
			patterns.push(...broadcastPatterns);

			// Detect cascade patterns (sequential agent activation)
			const cascadePatterns = await this.detectCascadePatterns();
			patterns.push(...cascadePatterns);

			// Detect circular patterns (cyclic dependencies)
			const circularPatterns = await this.detectCircularPatterns();
			patterns.push(...circularPatterns);
		} catch (error) {
			this.logger.error("Error detecting multi-agent patterns", {
				error: error.message,
			});
		}

		return patterns;
	}

	/**
	 * Detect broadcast patterns
	 */
	private async detectBroadcastPatterns(): Promise<InteractionPattern[]> {
		const patterns: InteractionPattern[] = [];
		const broadcastThreshold = 3; // Minimum targets for broadcast

		for (const [sourceAgent, interactions] of this.interactionHistory) {
			const recentTargets: Set<string> = new Set();
			const recentInteractions = interactions.filter(
				(interaction) => Date.now() - interaction.timestamp.getTime() < 60000, // 1 minute
			);

			for (const interaction of recentInteractions) {
				recentTargets.add(interaction.target);
			}

			if (recentTargets.size >= broadcastThreshold) {
				patterns.push({
					id: `broadcast-${sourceAgent}-${Date.now()}`,
					patternType: "broadcast",
					participants: [sourceAgent, ...Array.from(recentTargets)],
					frequency: recentInteractions.length,
					averageLatency:
						recentInteractions.reduce((sum, i) => sum + i.latency, 0) /
						recentInteractions.length,
					successRate: 0.95, // Estimate
					communicationVolume: recentInteractions.length,
					dependencies: [],
					criticality: "medium",
					detectedAt: new Date(),
				});
			}
		}

		return patterns;
	}

	/**
	 * Detect cascade patterns
	 */
	private async detectCascadePatterns(): Promise<InteractionPattern[]> {
		// Detect cascade patterns (sequential agent activation: A -> B -> C)
		// A cascade is defined as a chain of interactions where the target of one interaction
		// becomes the source of the next, for at least 3 agents (A -> B -> C).
		const patterns: InteractionPattern[] = [];
		try {
			// Build a map of agent -> agents they activated
			const activationMap: Map<string, Set<string>> = new Map();
			for (const [sourceAgent, interactions] of this.interactionHistory) {
				for (const interaction of interactions) {
					if (!activationMap.has(sourceAgent)) {
						activationMap.set(sourceAgent, new Set());
					}
					activationMap.get(sourceAgent)?.add(interaction.target);
				}
			}
			// Find cascades: sequences A -> B -> C (length >= 3)
			for (const [agentA, targetsA] of activationMap) {
				for (const agentB of targetsA) {
					if (activationMap.has(agentB)) {
						const next = activationMap.get(agentB);
						if (!next) continue;
						for (const agentC of next) {
							if (agentC !== agentA && agentC !== agentB) {
								// Found a cascade: agentA -> agentB -> agentC
								patterns.push({
									id: `cascade-${agentA}-${agentB}-${agentC}-${Date.now()}`,
									patternType: "cascade",
									participants: [agentA, agentB, agentC],
									frequency: 1,
									averageLatency: 0,
									successRate: 1,
									communicationVolume: 3,
									dependencies: [],
									criticality: "medium",
									detectedAt: new Date(),
								});
							}
						}
					}
				}
			}
		} catch (error) {
			this.logger.error("Error detecting cascade patterns", {
				error: error.message,
			});
		}
		return patterns;
	}

	/**
	 * Detect circular patterns
	 */
	private async detectCircularPatterns(): Promise<InteractionPattern[]> {
		// TODO: Implement circular pattern detection.
		// This is a key feature for production analytics. Implementation is planned for Q3 2024.
		// If you need this feature sooner, please contact the analytics team.
		return [];
	}

	/**
	 * Analyze cross-agent dependencies
	 */
	private async analyzeDependencies(): Promise<CrossAgentDependency[]> {
		const dependencies: CrossAgentDependency[] = [];

		try {
			// Build dependency matrix from interaction history
			const agents = Array.from(this.interactionHistory.keys());
			const dependencyMatrix = this.buildDependencyMatrix(agents);

			// Analyze dependencies for each agent pair
			for (let i = 0; i < agents.length; i++) {
				for (let j = 0; j < agents.length; j++) {
					if (i === j) continue;

					const sourceAgent = agents[i];
					const targetAgent = agents[j];
					const dependencyStrength = dependencyMatrix[i][j];

					if (dependencyStrength > 0.1) {
						// Threshold for significant dependency
						const dependency = await this.analyzeDependency(
							sourceAgent,
							targetAgent,
							dependencyStrength,
						);
						if (dependency) {
							dependencies.push(dependency);
						}
					}
				}
			}
		} catch (error) {
			this.logger.error("Error analyzing dependencies", {
				error: error.message,
			});
		}

		return dependencies;
	}

	/**
	 * Build dependency matrix from interaction history
	 */
	private buildDependencyMatrix(agents: string[]): number[][] {
		const matrix = Array(agents.length)
			.fill(null)
			.map(() => Array(agents.length).fill(0));

		for (let i = 0; i < agents.length; i++) {
			const sourceAgent = agents[i];
			const interactions = this.interactionHistory.get(sourceAgent) || [];

			for (const interaction of interactions) {
				const targetIndex = agents.indexOf(interaction.target);
				if (targetIndex !== -1) {
					matrix[i][targetIndex] += 1;
				}
			}
		}

		// Normalize by total interactions
		for (let i = 0; i < agents.length; i++) {
			const totalInteractions = matrix[i].reduce(
				(sum, count) => sum + count,
				0,
			);
			if (totalInteractions > 0) {
				for (let j = 0; j < agents.length; j++) {
					matrix[i][j] /= totalInteractions;
				}
			}
		}

		return matrix;
	}

	/**
	 * Analyze specific dependency relationship
	 */
	private async analyzeDependency(
		sourceAgent: string,
		targetAgent: string,
		strength: number,
	): Promise<CrossAgentDependency | null> {
		try {
			const sourceInteractions = this.interactionHistory.get(sourceAgent) || [];
			const targetInteractions = sourceInteractions.filter(
				(i) => i.target === targetAgent,
			);

			if (targetInteractions.length === 0) return null;

			const avgLatency =
				targetInteractions.reduce((sum, i) => sum + i.latency, 0) /
				targetInteractions.length;
			const frequency = targetInteractions.length;

			return {
				sourceAgent,
				targetAgent,
				dependencyType: this.determineDependencyType(targetInteractions),
				strength,
				frequency,
				criticality:
					strength > 0.7 ? "high" : strength > 0.4 ? "medium" : "low",
				latency: avgLatency,
				reliability: this.calculateReliability(targetInteractions),
				impact: {
					onFailure:
						strength > 0.7
							? "cascade"
							: strength > 0.4
								? "degraded"
								: "isolated",
					recoveryTime: avgLatency * 2, // Estimate
				},
			};
		} catch (error) {
			this.logger.error("Error analyzing dependency", {
				sourceAgent,
				targetAgent,
				error: error.message,
			});
			return null;
		}
	}

	/**
	 * Determine dependency type
	 */
	private determineDependencyType(
		interactions: Array<{
			timestamp: Date;
			target: string;
			type: string;
			latency: number;
		}>,
	): CrossAgentDependency["dependencyType"] {
		const types = interactions.map((i) => i.type);

		if (types.some((type) => type.includes("data"))) return "data";
		if (types.some((type) => type.includes("control"))) return "control";
		if (types.some((type) => type.includes("resource"))) return "resource";
		if (types.some((type) => type.includes("timing"))) return "timing";

		return "data"; // Default
	}

	/**
	 * Calculate dependency reliability
	 */
	private calculateReliability(
		interactions: Array<{
			timestamp: Date;
			target: string;
			type: string;
			latency: number;
		}>,
	): number {
		// Estimate reliability based on latency consistency
		const latencies = interactions.map((i) => i.latency);
		const avgLatency =
			latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
		const variance = this.calculateVariance(latencies);

		// Lower variance indicates higher reliability
		const stabilityScore = Math.max(
			0,
			1 - variance / (avgLatency * avgLatency),
		);

		// Factor in successful completion rate (estimated)
		const timeoutCount = latencies.filter((l) => l > 5000).length;
		const completionRate = 1 - timeoutCount / latencies.length;

		return stabilityScore * 0.6 + completionRate * 0.4;
	}

	/**
	 * Identify workflow bottlenecks
	 */
	private async identifyBottlenecks(): Promise<WorkflowBottleneck[]> {
		const bottlenecks: WorkflowBottleneck[] = [];

		try {
			// Analyze agent load patterns
			const loadBottlenecks = await this.identifyLoadBottlenecks();
			bottlenecks.push(...loadBottlenecks);

			// Analyze communication bottlenecks
			const commBottlenecks = await this.identifyCommunicationBottlenecks();
			bottlenecks.push(...commBottlenecks);

			// Analyze dependency bottlenecks
			const depBottlenecks = await this.identifyDependencyBottlenecks();
			bottlenecks.push(...depBottlenecks);
		} catch (error) {
			this.logger.error("Error identifying bottlenecks", {
				error: error.message,
			});
		}

		return bottlenecks;
	}

	/**
	 * Identify agent overload bottlenecks
	 */
	private async identifyLoadBottlenecks(): Promise<WorkflowBottleneck[]> {
		const bottlenecks: WorkflowBottleneck[] = [];

		for (const [agentId, interactions] of this.interactionHistory) {
			const recentInteractions = interactions.filter(
				(i) => Date.now() - i.timestamp.getTime() < 60000, // Last minute
			);

			if (recentInteractions.length > 20) {
				// High load threshold
				const avgLatency =
					recentInteractions.reduce((sum, i) => sum + i.latency, 0) /
					recentInteractions.length;

				if (avgLatency > 1000) {
					// High latency threshold
					bottlenecks.push({
						id: `load-bottleneck-${agentId}-${Date.now()}`,
						location: agentId,
						type: "agent-overload",
						severity: avgLatency > 2000 ? "critical" : "high",
						impactScope: [agentId],
						averageDelay: avgLatency,
						frequency: recentInteractions.length,
						rootCause: `Agent ${agentId} is experiencing high load with ${recentInteractions.length} interactions in the last minute`,
						suggestedResolution: [
							"Scale agent horizontally",
							"Optimize agent processing",
							"Implement load balancing",
							"Add caching layer",
						],
						detectedAt: new Date(),
					});
				}
			}
		}

		return bottlenecks;
	}

	/**
	 * Identify communication lag bottlenecks
	 */
	private async identifyCommunicationBottlenecks(): Promise<
		WorkflowBottleneck[]
	> {
		// Implementation for communication bottleneck detection
		return [];
	}

	/**
	 * Identify dependency wait bottlenecks
	 */
	private async identifyDependencyBottlenecks(): Promise<WorkflowBottleneck[]> {
		// Implementation for dependency bottleneck detection
		return [];
	}

	/**
	 * Detect performance anomalies
	 */
	private async detectAnomalies(): Promise<PerformanceAnomaly[]> {
		const anomalies: PerformanceAnomaly[] = [];

		if (!this.config.analysis.anomalyDetection) {
			return anomalies;
		}

		try {
			// Detect latency spikes
			const latencyAnomalies = await this.detectLatencyAnomalies();
			anomalies.push(...latencyAnomalies);

			// Detect throughput drops
			const throughputAnomalies = await this.detectThroughputAnomalies();
			anomalies.push(...throughputAnomalies);

			// Detect pattern breaks
			const patternAnomalies = await this.detectPatternAnomalies();
			anomalies.push(...patternAnomalies);
		} catch (error) {
			this.logger.error("Error detecting anomalies", { error: error.message });
		}

		return anomalies;
	}

	/**
	 * Detect latency spike anomalies
	 */
	private async detectLatencyAnomalies(): Promise<PerformanceAnomaly[]> {
		const anomalies: PerformanceAnomaly[] = [];

		for (const [agentId, interactions] of this.interactionHistory) {
			const recentInteractions = interactions.filter(
				(i) => Date.now() - i.timestamp.getTime() < 300000, // Last 5 minutes
			);

			if (recentInteractions.length < 10) continue;

			const latencies = recentInteractions.map((i) => i.latency);
			const avgLatency =
				latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
			const stdDev = Math.sqrt(this.calculateVariance(latencies));

			// Detect spikes (values > mean + 2*stddev)
			const spikes = latencies.filter((l) => l > avgLatency + 2 * stdDev);

			if (spikes.length > 0) {
				anomalies.push({
					id: `latency-spike-${agentId}-${Date.now()}`,
					type: "spike",
					metric: "latency",
					severity: Math.max(...spikes) / avgLatency, // Ratio as severity
					duration: recentInteractions.length * 1000, // Estimate duration
					impact: [agentId],
					possibleCauses: [
						"Resource contention",
						"Network issues",
						"Increased workload",
						"External service delays",
					],
					detectedAt: new Date(),
					confidence: Math.min(1.0, (spikes.length / latencies.length) * 2),
				});
			}
		}

		return anomalies;
	}

	/**
	 * Detect throughput drop anomalies
	 */
	private async detectThroughputAnomalies(): Promise<PerformanceAnomaly[]> {
		// Implementation for throughput anomaly detection
		return [];
	}

	/**
	 * Detect pattern break anomalies
	 */
	private async detectPatternAnomalies(): Promise<PerformanceAnomaly[]> {
		// Implementation for pattern anomaly detection
		return [];
	}

	/**
	 * Update stored patterns with new analysis results
	 */
	private updateStoredPatterns(
		newPatterns: InteractionPattern[],
		newDependencies: CrossAgentDependency[],
		newBottlenecks: WorkflowBottleneck[],
		newAnomalies: PerformanceAnomaly[],
	): void {
		// Add new patterns
		this.detectedPatterns.push(...newPatterns);

		// Add new dependencies (avoid duplicates)
		for (const dep of newDependencies) {
			const exists = this.dependencies.some(
				(d) =>
					d.sourceAgent === dep.sourceAgent &&
					d.targetAgent === dep.targetAgent,
			);
			if (!exists) {
				this.dependencies.push(dep);
			}
		}

		// Add new bottlenecks
		this.bottlenecks.push(...newBottlenecks);

		// Add new anomalies
		this.anomalies.push(...newAnomalies);

		// Maintain storage limits
		this.maintainStorageLimits();
	}

	/**
	 * Maintain storage limits for performance
	 */
	private maintainStorageLimits(): void {
		const maxPatterns = 1000;
		const maxDependencies = 500;
		const maxBottlenecks = 200;
		const maxAnomalies = 100;

		if (this.detectedPatterns.length > maxPatterns) {
			this.detectedPatterns.sort(
				(a, b) => b.detectedAt.getTime() - a.detectedAt.getTime(),
			);
			this.detectedPatterns.splice(maxPatterns);
		}

		if (this.dependencies.length > maxDependencies) {
			this.dependencies.splice(0, this.dependencies.length - maxDependencies);
		}

		if (this.bottlenecks.length > maxBottlenecks) {
			this.bottlenecks.sort(
				(a, b) => b.detectedAt.getTime() - a.detectedAt.getTime(),
			);
			this.bottlenecks.splice(maxBottlenecks);
		}

		if (this.anomalies.length > maxAnomalies) {
			this.anomalies.sort(
				(a, b) => b.detectedAt.getTime() - a.detectedAt.getTime(),
			);
			this.anomalies.splice(maxAnomalies);
		}
	}

	/**
	 * Calculate variance for array of numbers
	 */
	private calculateVariance(values: number[]): number {
		if (values.length === 0) return 0;

		const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
		const squaredDiffs = values.map((val) => (val - mean) ** 2);
		return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
	}

	/**
	 * Get detected patterns
	 */
	getDetectedPatterns(): InteractionPattern[] {
		return [...this.detectedPatterns];
	}

	/**
	 * Get analyzed dependencies
	 */
	getDependencies(): CrossAgentDependency[] {
		return [...this.dependencies];
	}

	/**
	 * Get identified bottlenecks
	 */
	getBottlenecks(): WorkflowBottleneck[] {
		return [...this.bottlenecks];
	}

	/**
	 * Get detected anomalies
	 */
	getAnomalies(): PerformanceAnomaly[] {
		return [...this.anomalies];
	}

	/**
	 * Get analysis statistics
	 */
	getAnalysisStatistics(): {
		isAnalyzing: boolean;
		patternsDetected: number;
		lastAnalysisTime?: Date;
		analysisErrors: number;
		storedData: {
			patterns: number;
			dependencies: number;
			bottlenecks: number;
			anomalies: number;
		};
	} {
		return {
			isAnalyzing: this.isAnalyzing,
			patternsDetected: this.patternsDetected,
			lastAnalysisTime: this.lastAnalysisTime,
			analysisErrors: this.analysisErrors,
			storedData: {
				patterns: this.detectedPatterns.length,
				dependencies: this.dependencies.length,
				bottlenecks: this.bottlenecks.length,
				anomalies: this.anomalies.length,
			},
		};
	}

	/**
	 * Clear analysis data
	 */
	clearAnalysisData(): void {
		this.interactionHistory.clear();
		this.detectedPatterns.length = 0;
		this.dependencies.length = 0;
		this.bottlenecks.length = 0;
		this.anomalies.length = 0;
		this.patternsDetected = 0;
		this.analysisErrors = 0;

		this.logger.info("Analysis data cleared");
		this.emit("analysisDataCleared");
	}

	/**
	 * Cleanup resources
	 */
	async cleanup(): Promise<void> {
		this.stopAnalysis();
		this.clearAnalysisData();
		this.removeAllListeners();

		this.logger.info("Pattern analyzer cleanup completed");
	}
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
