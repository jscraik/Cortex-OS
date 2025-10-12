/**
 * Generate a secure identifier optionally prefixed.
 */
export declare const createSecureId: (prefix?: string) => string;
export declare const createPrefixedId: (prefix: string) => string;
/**
 * Generate a secure integer within [min, max).
 */
export declare const secureInt: (min: number, max: number) => number;
/**
 * Generate a secure ratio between 0 (inclusive) and 1 (exclusive).
 */
export declare const secureRatio: () => number;
export declare const secureDelay: (minimum: number, maximum: number) => number;
//# sourceMappingURL=secure-random.d.ts.map