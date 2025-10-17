import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { err, ok, wrap } from '../src/result.js';

describe('result property tests', () => {
        it('ok returns value', () => {
                fc.assert(
                        fc.property(fc.anything(), (value) => {
                                expect(ok(value).value).toBe(value);
                        }),
                        { numRuns: 100, seed: 12345 },
                );
        });

        it('err returns error', () => {
                fc.assert(
                        fc.property(fc.string(), (msg) => {
                                const e = new Error(msg);
                                expect(err(e).error).toBe(e);
                        }),
                        { numRuns: 100, seed: 12345 },
                );
        });

        it('wrap resolves', async () => {
                await fc.assert(
                        fc.asyncProperty(fc.anything(), async (value) => {
                                const r = await wrap(async () => value);
                                expect(r.ok).toBe(true);
                                if (r.ok) {
                                        expect(r.value).toBe(value);
                                }
                        }),
                        { numRuns: 100, seed: 12345 },
                );
        });

        it('wrap captures errors', async () => {
                await fc.assert(
                        fc.asyncProperty(fc.string(), async (msg) => {
                                const r = await wrap(async () => {
                                        throw new Error(msg);
                                });
                                expect(r.ok).toBe(false);
                                if (!r.ok) {
                                        expect(r.error).toBeInstanceOf(Error);
                                        expect(r.error.message).toBe(msg);
                                }
                        }),
                        { numRuns: 100, seed: 12345 },
                );
        });
});
