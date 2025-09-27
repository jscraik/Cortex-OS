import { randomUUID } from 'node:crypto';
import { createTokenBudget, type TokenBudgetConfig, type TokenizedItem } from './TokenBudget.js';
import { createToolCallHistory, type ToolCallEntry } from './ToolCallHistory.js';

export interface ToolCallRecord {
	id: string;
	kind: 'search' | 'codemod' | 'validation' | 'analysis';
	params: Record<string, unknown>;
	tokenCount: number;
	createdAt: number;
}

export interface SessionContextOptions {
	budget?: TokenBudgetConfig;
}

const toTokenItem = (r: ToolCallRecord): TokenizedItem => ({
	id: r.id,
	tokens: r.tokenCount,
	createdAt: r.createdAt,
});

const rebuildHistory = (
	history: ReturnType<typeof createToolCallHistory<ToolCallRecord>>,
	keep: Set<string>,
) => {
	const remaining = history.list().filter((e) => keep.has(e.id));
	history.clear();
	for (const e of remaining) history.addCall(e.id, e.payload, e.payload.tokenCount);
};

const makePrune =
	(
		budget: ReturnType<typeof createTokenBudget>,
		history: ReturnType<typeof createToolCallHistory<ToolCallRecord>>,
	) =>
	() => {
		const items = history.list().map((e: ToolCallEntry<ToolCallRecord>) => toTokenItem(e.payload));
		if (!budget.needsPrune(items)) return;
		const pruned = budget.prune(items);
		const keep = new Set(pruned.map((p) => p.id));
		rebuildHistory(history, keep);
	};

const makeAddCall =
	(history: ReturnType<typeof createToolCallHistory<ToolCallRecord>>, prune: () => void) =>
	(
		kind: ToolCallRecord['kind'],
		params: Record<string, unknown>,
		tokenCount: number,
	): ToolCallRecord => {
		const rec: ToolCallRecord = {
			id: `${kind}-${Date.now()}-${randomUUID().slice(0, 8)}`,
			kind,
			params,
			tokenCount,
			createdAt: Date.now(),
		};
		history.addCall(rec.id, rec, tokenCount);
		prune();
		return rec;
	};

const makeGetTotal =
	(
		budget: ReturnType<typeof createTokenBudget>,
		history: ReturnType<typeof createToolCallHistory<ToolCallRecord>>,
	) =>
	() =>
		budget.getTotalTokens(history.list().map((e) => toTokenItem(e.payload)));

const makeGetRecent =
	(history: ReturnType<typeof createToolCallHistory<ToolCallRecord>>) =>
	(limit = 50): ToolCallRecord[] =>
		history
			.list()
			.sort((a, b) => b.createdAt - a.createdAt)
			.slice(0, limit)
			.map((e) => e.payload);

export const createSessionContextManager = (opts?: SessionContextOptions) => {
	const budget = createTokenBudget({ maxTokens: 40_000, trimToTokens: 20_000, ...opts?.budget });
	const history = createToolCallHistory<ToolCallRecord>({ maxEntries: 5_000 });
	const prune = makePrune(budget, history);
	const addToolCall = makeAddCall(history, prune);
	const getTotalTokens = makeGetTotal(budget, history);
	const getRecentToolCalls = makeGetRecent(history);
	return { addToolCall, getTotalTokens, getRecentToolCalls };
};

export type SessionContextManager = ReturnType<typeof createSessionContextManager>;
