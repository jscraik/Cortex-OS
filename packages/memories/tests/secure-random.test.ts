import { afterEach, describe, expect, it } from 'vitest';
import {
        createIdentifierFactory,
        getIdentifierFactory,
        resetSecureRandomSource,
        setSecureRandomSource,
        withSecureRandomSource,
} from '../src/utils/secure-random.js';

describe('memories secure random helpers', () => {
        afterEach(() => {
                resetSecureRandomSource();
        });

        it('allows overriding the random source for deterministic ids', async () => {
                const overrides = {
                        randomUUID: () => '11111111-2222-3333-4444-555555555555',
                } as const;

                const identifiers = await withSecureRandomSource(overrides, async () => getIdentifierFactory());

                const memoryId = identifiers.generateMemoryId('mem');
                expect(memoryId).toMatch(/^mem-\d+-11111111222/);
        });

        it('creates independent identifier factories with custom sources', () => {
                const factory = createIdentifierFactory({
                        randomUUID: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
                        randomBytes: () => Buffer.from('ffffffffffff', 'hex'),
                        randomInt: () => 0,
                });

                expect(factory.generateAuditId()).toMatch(/^audit_\d+_aaaaaaaaa$/);
                expect(factory.generateSubscriptionId()).toMatch(/^subscription-aaaaaaaaaaaaaaaaaaaaaaaa$/);
        });

        it('restores the default source after override', () => {
                setSecureRandomSource({ randomUUID: () => 'ffffffff-ffff-ffff-ffff-ffffffffffff' });
                const custom = getIdentifierFactory().generateCompactionId();
                expect(custom).toContain('fffffffff');

                resetSecureRandomSource();
                const restored = getIdentifierFactory().generateCompactionId();
                expect(restored).not.toEqual(custom);
        });
});
