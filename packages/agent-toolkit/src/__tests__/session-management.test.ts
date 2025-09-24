import { describe, expect, it } from 'vitest';
import { createSessionContextManager } from '../session/SessionContextManager.js';
import { createTokenBudget } from '../session/TokenBudget.js';
import { createToolCallHistory } from '../session/ToolCallHistory.js';

describe('TokenBudget', () => {
    it('tracks totals and prunes oldest to target', () => {
        const b = createTokenBudget({ maxTokens: 40000, trimToTokens: 20000 });
        const items = [
            { id: 'a', tokens: 15000, createdAt: 1 },
            { id: 'b', tokens: 15000, createdAt: 2 },
            { id: 'c', tokens: 15000, createdAt: 3 },
        ];
        expect(b.getTotalTokens(items)).toBe(45000);
        expect(b.needsPrune(items)).toBe(true);
        const pruned = b.prune(items);
        // Should keep newest until <= 20k => expect keep last item only (15k) or last two if fits
        const total = b.getTotalTokens(pruned);
        expect(total).toBeLessThanOrEqual(20000);
        expect(pruned.every((p) => p.id !== 'a')).toBe(true);
    });
});

describe('ToolCallHistory', () => {
    it('rarely compacts; keeps under soft max', () => {
        const h = createToolCallHistory({ maxEntries: 100 });
        for (let i = 0; i < 250; i++) {
            h.addCall(`id-${i}`, { x: i }, 10);
        }
        expect(h.size()).toBeLessThanOrEqual(150);
        const list = h.list();
        expect(list[0].createdAt).toBeLessThanOrEqual(list[list.length - 1].createdAt);
    });
});

describe('SessionContextManager', () => {
    it('tracks tool calls and token totals', () => {
        const m = createSessionContextManager({ budget: { maxTokens: 40000, trimToTokens: 20000 } });
        m.addToolCall('search', { pattern: 'test' }, 150);
        expect(m.getTotalTokens()).toBe(150);
        const recent = m.getRecentToolCalls(10);
        expect(recent.length).toBeGreaterThan(0);
        expect(recent[0].kind).toBe('search');
    });

    it('prunes when exceeding 40k tokens with trim to ~20k', () => {
        const m = createSessionContextManager({ budget: { maxTokens: 40000, trimToTokens: 20000 } });
        // Add 45k tokens across calls
        const per = 5000;
        for (let i = 0; i < 9; i++) {
            m.addToolCall('search', { i }, per);
        }
        expect(m.getTotalTokens()).toBeLessThanOrEqual(40000);
        // sanity: we should have pruned some earliest calls
        const recent = m.getRecentToolCalls(20);
        expect(recent.length).toBeGreaterThan(0);
    });
});
