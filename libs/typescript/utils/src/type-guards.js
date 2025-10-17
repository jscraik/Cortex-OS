/**
 * @fileoverview Type Guards for Runtime Type Safety
 * Systematic approach to type checking without assertions
 */
/**
 * Type guard to check if value is a record (plain object)
 */
export function isRecord(value) {
    return (typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
/**
 * Type guard to check if value has specific properties
 */
export function hasProperties(value, properties) {
    if (!isRecord(value)) {
        return false;
    }
    return properties.every((prop) => prop in value && value[prop] !== undefined);
}
export function isProposalShape(value) {
    if (!isRecord(value)) {
        return false;
    }
    const hasValidDataClass = !('dataClass' in value) || typeof value.dataClass === 'string';
    const hasValidPath = !('path' in value) || typeof value.path === 'string';
    return hasValidDataClass && hasValidPath;
}
/**
 * Type guard for error objects
 */
export function isError(value) {
    return value instanceof Error;
}
/**
 * Type guard for string values
 */
export function isString(value) {
    return typeof value === 'string';
}
/**
 * Type guard for number values
 */
export function isNumber(value) {
    return typeof value === 'number' && !Number.isNaN(value);
}
/**
 * Type guard for boolean values
 */
export function isBoolean(value) {
    return typeof value === 'boolean';
}
/**
 * Safe validation with detailed error information
 */
export function safeValidate(value, guard, errorMessage) {
    if (guard(value)) {
        return { success: true, data: value };
    }
    return {
        success: false,
        error: `${errorMessage}: received ${typeof value}`,
    };
}
