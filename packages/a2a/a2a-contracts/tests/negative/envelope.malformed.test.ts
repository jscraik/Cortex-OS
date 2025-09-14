import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { Envelope } from '../../src/envelope';

/**
 * Contract-level negative tests ensuring malformed envelopes are rejected.
 * Focuses on required fields and schema refinements beyond trivial type errors.
 */

describe('Envelope malformed contract rejection', () => {
    it('rejects missing required type field', () => {
        // Deliberately omit required 'type'
        const bad: any = { id: '123', source: 'https://cortex.invalid', specversion: '1.0' };
        expect(() => Envelope.parse(bad)).toThrow(ZodError);
    });

    it('rejects invalid specversion value', () => {
        const bad = { id: '123', type: 'evt.test', source: 'https://cortex.invalid', specversion: '2.0' };
        try {
            Envelope.parse(bad as any);
            throw new Error('Expected specversion validation failure');
        } catch (e) {
            expect(e).toBeInstanceOf(ZodError);
            const ze = e as ZodError;
            expect(ze.errors.some(err => err.message.includes('Invalid literal value'))).toBe(true);
        }
    });

    it('rejects non-uuid correlationId', () => {
        const bad = { id: '123', type: 'evt.test', source: 'https://cortex.invalid', specversion: '1.0', correlationId: 'not-a-uuid' };
        expect(() => Envelope.parse(bad as any)).toThrow(ZodError);
    });

    it('rejects negative ttlMs', () => {
        const bad = { id: '123', type: 'evt.test', source: 'https://cortex.invalid', specversion: '1.0', ttlMs: -10 };
        expect(() => Envelope.parse(bad as any)).toThrow(ZodError);
    });

    it('rejects invalid source (not a URI)', () => {
        const bad = { id: '123', type: 'evt.test', source: 'nota//uri', specversion: '1.0' };
        expect(() => Envelope.parse(bad as any)).toThrow(ZodError);
    });
});
