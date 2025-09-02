/**
 * @fileoverview ULID generation and validation utilities
 */

import { ulid } from "ulid";
import { type ULID, ULIDSchema } from "./types.js";

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
	// ULID first 10 characters are timestamp in Crockford base32
	const timestamp = parseInt(runId.slice(0, 10), 32);
	return new Date(timestamp);
}

/**
 * Create ULID with specific timestamp (for testing)
 */
export function createULIDWithTime(time: number): ULID {
	return ulid(time) as ULID;
}
