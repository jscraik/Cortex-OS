/**
 * @fileoverview ULID generation and validation utilities
 */

import { ulid } from "ulid";
import { type ULID, ULIDSchema } from "./types.js";

// Crockford's Base32 alphabet for ULID timestamps
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Generate a new ULID for run identification
 */
export function generateRunId(): ULID {
	return ulid() as ULID;
}

/**
 * Validate ULID format
 */
export function isValidULID(value: string): value is ULID {
	return ULIDSchema.safeParse(value).success;
}

/**
 * Extract timestamp from ULID
 */
export function getULIDTimestamp(runId: ULID): Date {
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
export function createULIDWithTime(time: number): ULID {
	return ulid(time) as ULID;
}
