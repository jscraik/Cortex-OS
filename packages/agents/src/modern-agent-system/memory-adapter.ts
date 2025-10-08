import {
        type PlannerGoal,
        type PlannerPlan,
        type PlannerSessionState,
        type RagDocument,
        type RagRetriever,
        type SessionMemoryAdapter,
        type WorkerStepResult,
} from './types.js';

export interface MemoryCoordinator {
        loadState: (goal: PlannerGoal) => Promise<{
                state: PlannerSessionState | null;
                context: readonly RagDocument[];
        }>;
        persistPlan: (plan: PlannerPlan) => Promise<void>;
        persistStep: (goal: PlannerGoal, result: WorkerStepResult) => Promise<void>;
}

const nowIso = () => new Date().toISOString();

const toState = (state: PlannerSessionState | null): PlannerSessionState => {
        if (state) return state;
        return { steps: [], facts: [], lastUpdated: nowIso() };
};

const upsertStep = (state: PlannerSessionState, result: WorkerStepResult): PlannerSessionState => {
        const existing = state.steps.find((step) => step.capability === result.capability);
        if (!existing) {
                state.steps.push({
                        capability: result.capability,
                        worker: result.worker,
                        status: 'completed',
                        output: result.output,
                        completedAt: nowIso(),
                });
                return { ...state, lastUpdated: nowIso() };
        }
        existing.status = 'completed';
        existing.worker = result.worker;
        existing.output = result.output;
        existing.completedAt = nowIso();
        return { ...state, lastUpdated: nowIso() };
};

const storeContext = async (
        session: SessionMemoryAdapter,
        goal: PlannerGoal,
        state: PlannerSessionState,
        result: WorkerStepResult,
) => {
        await session.saveSession(goal.sessionId, state);
        if (!session.appendEvent) return;
        await session.appendEvent(goal.sessionId, {
                type: 'step-completed',
                payload: { capability: result.capability, worker: result.worker },
                timestamp: nowIso(),
        });
};

const retrieveContext = async (rag?: RagRetriever, goal?: PlannerGoal) => {
        if (!rag || !goal) return [] as const;
        const query = `${goal.objective} ${goal.requiredCapabilities.join(' ')}`.trim();
        if (!query) return [] as const;
        try {
                return await rag.retrieve(query, 5);
        } catch (error) {
                console.warn(
                        'brAInwav modern-agent-system: failed to retrieve RAG context',
                        error,
                );
                return [] as const;
        }
};

export const createMemoryCoordinator = (
        adapters: { session: SessionMemoryAdapter; rag?: RagRetriever },
): MemoryCoordinator => {
        const loadState = async (goal: PlannerGoal) => {
                const state = await adapters.session.loadSession(goal.sessionId);
                const context = await retrieveContext(adapters.rag, goal);
                return { state, context };
        };
        const persistPlan = async (plan: PlannerPlan) => {
                const state = toState(await adapters.session.loadSession(plan.goal.sessionId));
        state.steps = plan.steps;
        state.reasoning = plan.reasoning;
        state.lastUpdated = nowIso();
                await adapters.session.saveSession(plan.goal.sessionId, state);
                if (!adapters.session.appendEvent) return;
                await adapters.session.appendEvent(plan.goal.sessionId, {
                        type: 'plan-created',
                        payload: { steps: plan.steps.map((step) => step.capability) },
                        timestamp: nowIso(),
                });
        };
        const persistStep = async (goal: PlannerGoal, result: WorkerStepResult) => {
                const state = toState(await adapters.session.loadSession(goal.sessionId));
                const next = upsertStep(state, result);
                await storeContext(adapters.session, goal, next, result);
        };
        return { loadState, persistPlan, persistStep };
};
