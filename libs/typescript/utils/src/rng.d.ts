/**
 * Cryptographically secure UUID wrapper (v4).
 */
export declare const secureUUID: () => string;
/**
 * Generate a cryptographically secure random integer in [0, max) using rejection sampling.
 */
export declare function secureRandomInt(max: number): number;
/**
 * Generate a secure random string of given length from provided alphabet.
 * Default alphabet: URL-safe base62 (0-9a-zA-Z).
 */
export declare function secureRandomString(length: number, alphabet?: string): string;
/**
 * Compute jittered delay. Given a base delay (ms) and jitterPercent (0..1),
 * returns a value uniformly distributed in [base - base*jitterPercent, base + base*jitterPercent].
 * Uses secure randomness and can optionally accept a seeded RNG for deterministic tests.
 */
export declare function jitterDelay(baseMs: number, jitterPercent?: number, rng?: () => number): number;
/**
 * Secure uniform float in [0,1) using 48 random bits mapped to Number precision domain.
 */
export declare function secureUniform(): number;
/**
 * Create a deterministic seeded RNG returning numbers in [0,1).
 * Uses xorshift32 algorithm (NOT cryptographically secure) for test determinism.
 */
export declare function createSeededRNG(seed: number): () => number;
/**
 * Generate a prefixed identifier with secure randomness (no Date.now dependency by default)
 * Format: `${prefix}_${uuid}` unless custom length requested.
 */
export declare function secureId(prefix: string, randomLength?: number): string;
/**
 * Backoff calculation with optional jitter using secure randomness or provided RNG.
 */
export declare function backoffDelay(attempt: number, baseMs: number, multiplier?: number, options?: {
    maxMs?: number;
    jitterPercent?: number;
    rng?: () => number;
}): number;
export declare const RNG: {
    secureUUID: () => string;
    secureRandomInt: typeof secureRandomInt;
    secureRandomString: typeof secureRandomString;
    secureUniform: typeof secureUniform;
    createSeededRNG: typeof createSeededRNG;
    secureId: typeof secureId;
    jitterDelay: typeof jitterDelay;
    backoffDelay: typeof backoffDelay;
};
