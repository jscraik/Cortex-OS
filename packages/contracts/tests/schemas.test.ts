import { describe, it, expect } from 'vitest';
import { MessageEnvelopeSchema, AgentConfigSchema, RAGQuerySchema } from '../src/index';

describe('MessageEnvelopeSchema', () => {
    it('valid envelope passes', () => {
        const input = {
            id: '1',
            kind: 'MCP',
            ts: new Date().toISOString(),
            payload: null,
            meta: { seed: 1 }
        };
        expect(() => MessageEnvelopeSchema.parse(input)).not.toThrow();
    });

    it('missing id fails', () => {
        const input = {
            kind: 'MCP',
            ts: new Date().toISOString(),
            payload: null,
            meta: { seed: 1 }
        };
        expect(() => MessageEnvelopeSchema.parse(input)).toThrow();
    });
});

describe('AgentConfigSchema', () => {
    it('applies defaults', () => {
        const cfg = AgentConfigSchema.parse({
            memory: { maxItems: 1, maxBytes: 1 }
        });
        expect(cfg.seed).toBe(1);
        expect(cfg.maxTokens).toBe(1024);
        expect(cfg.timeoutMs).toBe(30000);
    });
});

describe('RAGQuerySchema', () => {
    it('enforces topK limit', () => {
        expect(() => RAGQuerySchema.parse({ query: 'hi', topK: 101 })).toThrow();
    });
});
