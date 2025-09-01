/**
 * @fileoverview ULID generation and validation utilities
 */

import { ulid, decodeTime } from 'ulid';
import { ULIDSchema, type ULID } from './types.js';

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
  return new Date(decodeTime(runId));
}

/**
 * Create ULID with specific timestamp (for testing)
 */
export function createULIDWithTime(time: number): ULID {
  return ulid(time) as ULID;
}
