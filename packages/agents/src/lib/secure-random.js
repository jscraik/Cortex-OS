import { randomBytes, randomInt, randomUUID } from 'node:crypto';
/**
 * Generate a secure identifier optionally prefixed.
 */
export const createSecureId = (prefix) => {
    const core = randomUUID().replace(/-/g, '');
    return prefix ? `${prefix}-${core}` : core;
};
export const createPrefixedId = (prefix) => {
    return `${prefix}-${createSecureId()}`;
};
/**
 * Generate a secure integer within [min, max).
 */
export const secureInt = (min, max) => {
    return randomInt(min, max);
};
/**
 * Generate a secure ratio between 0 (inclusive) and 1 (exclusive).
 */
export const secureRatio = () => {
    const buffer = randomBytes(6).readUIntBE(0, 6);
    return buffer / 0x1000000000000; // 2^48
};
export const secureDelay = (minimum, maximum) => {
    const span = Math.max(0, maximum - minimum);
    return minimum + secureInt(0, span === 0 ? 1 : span);
};
