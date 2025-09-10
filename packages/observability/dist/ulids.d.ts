/**
 * @fileoverview ULID generation and validation utilities
 */
import { type ULID } from './types.js';
/**
 * Generate a new ULID for run identification
 */
export declare function generateRunId(): ULID;
/**
 * Validate ULID format
 */
export declare function isValidULID(value: string): value is ULID;
/**
 * Extract timestamp from ULID
 */
export declare function getULIDTimestamp(runId: ULID): Date;
/**
 * Create ULID with specific timestamp (for testing)
 */
export declare function createULIDWithTime(time: number): ULID;
//# sourceMappingURL=ulids.d.ts.map
