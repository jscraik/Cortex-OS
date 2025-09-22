/**
 * @fileoverview ULID generation and validation utilities
 */
import { ulid } from 'ulid';
import { ULIDSchema } from './types.js';
// Crockford's Base32 alphabet for ULID timestamps
const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/**
 * Generate a new ULID for run identification
 */
export function generateRunId() {
    return ulid();
}
/**
 * Validate ULID format
 */
export function isValidULID(value) {
    return ULIDSchema.safeParse(value).success;
}
/**
 * Extract timestamp from ULID
 */
export function getULIDTimestamp(runId) {
    // Decode first 10 characters using Crockford Base32
    const timeChars = runId.slice(0, 10);
    let timestamp = 0;
    for (const char of timeChars) {
        const value = CROCKFORD_BASE32.indexOf(char);
        if (value === -1) {
            throw new Error(`Invalid ULID character: ${char}`);
        }
        timestamp = timestamp * 32 + value;
    }
    return new Date(timestamp);
}
/**
 * Create ULID with specific timestamp (for testing)
 */
export function createULIDWithTime(time) {
    return ulid(time);
}
//# sourceMappingURL=ulids.js.map