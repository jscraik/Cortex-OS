import {
	type DSPPlanningContext,
	type PlanningContextIsolationOptions,
	type PlanningContextIsolationStrategy,
	type PlanningContextPersistenceAdapter,
	type PlanningContextSnapshot,
	PlanningPhase,
} from '../types.js';
export type {
	PlanningContextIsolationOptions,
	PlanningContextIsolationStrategy,
	PlanningContextPersistenceAdapter,
	PlanningContextSnapshot,
} from '../types.js';
export { PlanningPhase } from '../types.js';
export type PlanningContext = DSPPlanningContext;
type PersistReason = 'initialize' | 'phase_advance' | 'update' | 'complete' | 'attach';
export type DSPConfig = {
	initialStep?: number;
	maxStep?: number;
	planningDepth?: number;
	contextIsolation?: boolean;
	workspaceId?: string;
	autoPersist?: boolean;
	resumeFromPersistence?: boolean;
	isolationOptions?: PlanningContextIsolationOptions;
	persistenceAdapter?: PlanningContextPersistenceAdapter;
	isolationStrategy?: PlanningContextIsolationStrategy;
};
export declare class DynamicSpeculativePlanner {
	private _current;
	private readonly max;
	private readonly planningDepth;
	private readonly contextIsolation;
	private readonly workspaceId?;
	private readonly autoPersist;
	private readonly resumeFromPersistence;
	private readonly isolationOptions?;
	private readonly persistenceAdapter?;
	private readonly isolationStrategy?;
	private readonly isolationScope;
	private planningContext?;
	private revision;
	private lastSnapshot?;
	constructor(config?: DSPConfig);
	get currentStep(): number;
	get currentPhase(): PlanningPhase | undefined;
	get context(): PlanningContext | undefined;
	get lastKnownSnapshot(): PlanningContextSnapshot | undefined;
	update(success: boolean): void;
	initializePlanning(taskId: string, complexity?: number, priority?: number): PlanningContext;
	advancePhase(action: string): void;
	getAdaptivePlanningDepth(): number;
	completePlanning(result?: unknown): void;
	resumePlanning(
		taskId: string,
		overrides?: {
			complexity?: number;
			priority?: number;
		},
	): PlanningContext | undefined;
	attachContext(
		context: PlanningContext,
		options?: {
			reason?: PersistReason;
			persist?: boolean;
			preserveRevision?: boolean;
			isolationOptions?: PlanningContextIsolationOptions;
			currentStep?: number;
		},
	): PlanningContext;
	clearContext(): void;
	getContextSnapshot(reason?: string): PlanningContextSnapshot | undefined;
	getLastSnapshot(): PlanningContextSnapshot | undefined;
	peekPersistedContext(taskId: string): PlanningContextSnapshot | undefined;
	private finalizeContext;
	private createNewContext;
	private prepareContext;
	private applyIsolation;
	private bumpRevision;
	private persistContext;
	private createSnapshot;
	private cloneContext;
}
export declare function simulateDSP(outcomes: boolean[], config?: DSPConfig): number[];
//# sourceMappingURL=dsp.d.ts.map
