import { randomBytes, randomInt, randomUUID } from 'node:crypto';

/**
 * Generate a cryptographically secure identifier with optional prefix.
 */
export const createSecureId = (prefix?: string): string => {
        const core = randomUUID().replace(/-/g, '');
        return prefix ? `${prefix}-${core}` : core;
};

/**
 * Generate a secure identifier that MUST include the provided prefix.
 */
export const createPrefixedId = (prefix: string): string => createSecureId(prefix);

/**
 * Generate a secure integer in the half-open interval [min, max).
 */
export const secureInt = (min: number, max: number): number => randomInt(min, max);

/**
 * Generate a secure ratio between 0 (inclusive) and 1 (exclusive).
 */
export const secureRatio = (): number => {
        const buffer = randomBytes(6).readUIntBE(0, 6);
        return buffer / 0x1000000000000; // 2^48
};

/**
 * Generate a secure delay duration between the provided bounds in milliseconds.
 */
export const secureDelay = (minimum: number, maximum: number): number => {
        const span = Math.max(0, maximum - minimum);
        return minimum + secureInt(0, span === 0 ? 1 : span);
};
