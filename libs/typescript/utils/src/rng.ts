import { randomUUID, randomBytes } from "node:crypto";

/**
 * Cryptographically secure UUID wrapper (v4).
 */
export const secureUUID = (): string => randomUUID();

/**
 * Generate a cryptographically secure random integer in [0, max) using rejection sampling.
 */
export function secureRandomInt(max: number): number {
  if (!Number.isSafeInteger(max) || max <= 0) {
    throw new Error(`secureRandomInt: max must be positive safe integer, got ${max}`);
  }
  // Use 32-bit unsigned integers
  const range = 0xffffffff; // 2^32 - 1
  const limit = range - (range % max); // Rejection limit to avoid modulo bias
  while (true) {
    const buf = randomBytes(4);
    const val = buf.readUInt32BE(0);
    if (val < limit) return val % max;
  }
}

/**
 * Generate a secure random string of given length from provided alphabet.
 * Default alphabet: URL-safe base62 (0-9a-zA-Z).
 */
export function secureRandomString(length: number, alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"): string {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new Error(`secureRandomString: length must be >= 0 safe integer, got ${length}`);
  }
  if (length === 0) return "";
  const chars = alphabet;
  const base = chars.length;
  let out = "";
  // Generate in batches for efficiency
  const needed = length;
  while (out.length < needed) {
    // Generate 32 random bytes -> 256 bits -> up to 43 base62 chars. We'll map byte-wise.
    const batch = randomBytes(32);
    for (let i = 0; i < batch.length && out.length < needed; i++) {
      out += chars[batch[i] % base];
    }
  }
  return out;
}

/**
 * Compute jittered delay. Given a base delay (ms) and jitterPercent (0..1),
 * returns a value uniformly distributed in [base - base*jitterPercent, base + base*jitterPercent].
 * Uses secure randomness and can optionally accept a seeded RNG for deterministic tests.
 */
export function jitterDelay(baseMs: number, jitterPercent = 0.1, rng: () => number = secureUniform): number {
  if (baseMs < 0) throw new Error("jitterDelay: baseMs must be >= 0");
  if (jitterPercent < 0 || jitterPercent > 1) throw new Error("jitterDelay: jitterPercent must be in [0,1]");
  if (baseMs === 0 || jitterPercent === 0) return baseMs;
  const span = baseMs * jitterPercent;
  const offset = (rng() * 2 - 1) * span; // uniform in [-span, span]
  const val = Math.round(baseMs + offset);
  return val < 0 ? 0 : val;
}

/**
 * Secure uniform float in [0,1) using 48 random bits mapped to Number precision domain.
 */
export function secureUniform(): number {
  // 6 bytes = 48 bits => map to [0, 2^48)
  const buf = randomBytes(6);
  const val =
    (buf[0] * 2 ** 40) +
    (buf[1] * 2 ** 32) +
    (buf[2] * 2 ** 24) +
    (buf[3] * 2 ** 16) +
    (buf[4] * 2 ** 8) +
    buf[5];
  return val / 2 ** 48;
}

/**
 * Create a deterministic seeded RNG returning numbers in [0,1).
 * Uses xorshift32 algorithm (NOT cryptographically secure) for test determinism.
 */
export function createSeededRNG(seed: number): () => number {
  if (!Number.isInteger(seed)) throw new Error("createSeededRNG: seed must be integer");
  // Ensure non-zero seed
  let state = seed >>> 0 || 0x1a2b3c4d;
  return () => {
    // xorshift32
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    // Map to [0,1)
    return (state >>> 0) / 0x100000000;
  };
}

/**
 * Generate a prefixed identifier with secure randomness (no Date.now dependency by default)
 * Format: `${prefix}_${uuid}` unless custom length requested.
 */
export function secureId(prefix: string, randomLength?: number): string {
  if (randomLength && randomLength > 0) {
    return `${prefix}_${secureRandomString(randomLength)}`;
  }
  return `${prefix}_${secureUUID()}`;
}

/**
 * Backoff calculation with optional jitter using secure randomness or provided RNG.
 */
export function backoffDelay(
  attempt: number,
  baseMs: number,
  multiplier = 2,
  options?: { maxMs?: number; jitterPercent?: number; rng?: () => number },
): number {
  if (attempt < 0) throw new Error("backoffDelay: attempt must be >= 0");
  const exp = baseMs * Math.pow(multiplier, attempt);
  const capped = options?.maxMs ? Math.min(exp, options.maxMs) : exp;
  if (options?.jitterPercent) {
    return jitterDelay(capped, options.jitterPercent, options.rng ?? secureUniform);
  }
  return capped;
}

export const RNG = {
  secureUUID,
  secureRandomInt,
  secureRandomString,
  secureUniform,
  createSeededRNG,
  secureId,
  jitterDelay,
  backoffDelay,
};
