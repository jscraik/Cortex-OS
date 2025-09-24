export interface TokenBudgetConfig {
    maxTokens: number; // hard cap, e.g., 40_000
    trimToTokens?: number; // target after prune, e.g., 20_000
}

export interface TokenizedItem {
    id: string;
    tokens: number;
    createdAt: number; // ms since epoch for ordering
}

/**
 * Lightweight token budget manager: keeps total under `maxTokens` by
 * pruning oldest items until <= `trimToTokens` (or `maxTokens` if unset).
 */
export const createTokenBudget = (config: TokenBudgetConfig) => {
    const target = typeof config.trimToTokens === 'number' ? config.trimToTokens : config.maxTokens;

    const getTotalTokens = (items: TokenizedItem[]): number => {
        let total = 0;
        for (const it of items) total += it.tokens;
        return total;
    };

    const needsPrune = (items: TokenizedItem[]): boolean => getTotalTokens(items) > config.maxTokens;

    const prune = (items: TokenizedItem[]): TokenizedItem[] => {
        // Oldest-first removal until we reach target
        const sorted = [...items].sort((a, b) => a.createdAt - b.createdAt);
        let total = getTotalTokens(sorted);
        while (sorted.length > 0 && total > target) {
            const removed = sorted.shift();
            if (!removed) break;
            total -= removed.tokens;
        }
        return sorted;
    };

    return { getTotalTokens, needsPrune, prune };
};

export type TokenBudget = ReturnType<typeof createTokenBudget>;
