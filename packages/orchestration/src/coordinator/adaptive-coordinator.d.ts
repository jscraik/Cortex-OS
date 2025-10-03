import { type Strategy, StrategySelector } from '../intelligence/strategy-selector.js';
import type { LongHorizonTask, PlanningResult } from '../lib/long-horizon-planner.js';
import { SecurityCoordinator } from '../security/security-coordinator.js';
import type { PlanningContext } from '../utils/dsp.js';
export interface AgentDescriptor {
	id: string;
	capabilities: string[];
	traits?: Record<string, unknown>;
}
export interface CoordinationRequest {
	task: LongHorizonTask;
	agents: AgentDescriptor[];
	planningResult?: PlanningResult;
	contextSnapshot?: PlanningContext;
	requiredCapabilities?: string[];
}
export interface CoordinationTelemetry {
	branding: 'brAInwav';
	timestamp: string;
	message: string;
	metadata?: Record<string, unknown>;
}
export interface CoordinationAssignment {
	agentId: string;
	role: string;
	weight: number;
}
export interface CoordinationDecision {
	taskId: string;
	strategy: Strategy;
	assignments: CoordinationAssignment[];
	confidence: number;
	telemetry: CoordinationTelemetry[];
	statePatch: Record<string, unknown>;
}
export type CoordinationResult = CoordinationDecision & {
	estimatedDuration?: number;
};
export interface CoordinationOutcome {
	taskId: string;
	strategy: Strategy;
	success: boolean;
	efficiency: number;
	quality: number;
	durationMs: number;
	timestamp: Date;
}
export interface AdaptiveCoordinationOptions {
	selector?: StrategySelector;
	clock?: () => Date;
	telemetrySink?: (telemetry: CoordinationTelemetry) => void;
	historyLimit?: number;
	securityCoordinator?: SecurityCoordinator;
}
interface HistoricalRecord {
	decision: CoordinationDecision;
	outcome?: CoordinationOutcome;
}
export declare class AdaptiveCoordinationManager {
	private readonly selector;
	private readonly clock;
	private readonly telemetrySink?;
	private readonly historyLimit;
	private readonly securityCoordinator;
	private readonly history;
	constructor(options?: AdaptiveCoordinationOptions);
	/**
	 * Optional integration hook used by LangGraph bridge to provide the long horizon planner
	 */
	setLongHorizonPlanner(_planner: unknown): void;
	coordinate(request: CoordinationRequest): CoordinationDecision;
	recordOutcome(outcome: CoordinationOutcome): void;
	getHistory(taskId: string): HistoricalRecord[];
	private createProfile;
	private adjustStrategyWithHistory;
	private buildAssignments;
	private computeConfidence;
	private createStatePatch;
	private recordDecision;
	private trimHistory;
	private mergeStatePatches;
	private mergeValues;
	private isPlainRecord;
}
//# sourceMappingURL=adaptive-coordinator.d.ts.map
