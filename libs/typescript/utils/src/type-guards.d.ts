/**
 * @fileoverview Type Guards for Runtime Type Safety
 * Systematic approach to type checking without assertions
 */
/**
 * Type guard to check if value is a record (plain object)
 */
export declare function isRecord(value: unknown): value is Record<string, unknown>;
/**
 * Type guard to check if value has specific properties
 */
export declare function hasProperties<T extends string>(value: unknown, properties: T[]): value is Record<T, unknown>;
/**
 * Type guard for proposal objects with required shape
 */
export interface ProposalShape {
    dataClass?: string;
    path?: string;
}
export declare function isProposalShape(value: unknown): value is ProposalShape;
/**
 * Type guard for error objects
 */
export declare function isError(value: unknown): value is Error;
/**
 * Type guard for string values
 */
export declare function isString(value: unknown): value is string;
/**
 * Type guard for number values
 */
export declare function isNumber(value: unknown): value is number;
/**
 * Type guard for boolean values
 */
export declare function isBoolean(value: unknown): value is boolean;
/**
 * Type guard validation result (distinct from validation.ts ValidationResult)
 */
export type TypeGuardResult<T> = {
    success: true;
    data: T;
    error?: never;
} | {
    success: false;
    data?: never;
    error: string;
};
/**
 * Safe validation with detailed error information
 */
export declare function safeValidate<T>(value: unknown, guard: (value: unknown) => value is T, errorMessage: string): TypeGuardResult<T>;
