import { randomBytes, randomInt, randomUUID } from 'node:crypto';

export interface SecureRandomSource {
        randomUUID(): string;
        randomBytes(size: number): Buffer;
        randomInt(min: number, max: number): number;
}

export interface SecureRandomHelpers {
        createSecureId(prefix?: string): string;
        createPrefixedId(prefix: string): string;
        secureInt(minimum: number, maximum: number): number;
        secureRatio(): number;
        secureDelay(minimum: number, maximum: number): number;
}

export interface IdentifierFactory {
        generateMemoryId(prefix?: string): string;
        generateColdStorageId(namespace?: string): string;
        generateCompactionId(): string;
        generateAuditId(): string;
        generateSubscriptionId(): string;
}

const defaultSource: SecureRandomSource = {
        randomUUID,
        randomBytes,
        randomInt,
};

const buildHelpers = (source: SecureRandomSource): SecureRandomHelpers => {
        const createSecureId = (prefix?: string): string => {
                const core = source.randomUUID().replace(/-/g, '');
                return prefix ? `${prefix}-${core}` : core;
        };

        const createPrefixedId = (prefix: string): string => `${prefix}-${createSecureId()}`;

        const secureInt = (minimum: number, maximum: number): number => {
                if (maximum <= minimum) {
                        return minimum;
                }

                return source.randomInt(minimum, maximum);
        };

        const secureRatio = (): number => {
                const buffer = source.randomBytes(6).readUIntBE(0, 6);
                return buffer / 0x1000000000000;
        };

        const secureDelay = (minimum: number, maximum: number): number => {
                const span = Math.max(0, maximum - minimum);
                return minimum + secureInt(0, span === 0 ? 1 : span);
        };

        return {
                createSecureId,
                createPrefixedId,
                secureInt,
                secureRatio,
                secureDelay,
        };
};

const buildIdentifierFactory = (helpers: SecureRandomHelpers): IdentifierFactory => ({
        generateMemoryId: (prefix = 'mem'): string => {
                const secureSegment = helpers.createSecureId().slice(0, 11);
                return `${prefix}-${Date.now()}-${secureSegment}`;
        },
        generateColdStorageId: (): string => {
                const secureSegment = helpers.createSecureId().slice(0, 9);
                return `cold-${Date.now()}-${secureSegment}`;
        },
        generateCompactionId: (): string => {
                const secureSegment = helpers.createSecureId().slice(0, 9);
                return `compacted_${Date.now()}_${secureSegment}`;
        },
        generateAuditId: (): string => {
                const secureSegment = helpers.createSecureId().slice(0, 9);
                return `audit_${Date.now()}_${secureSegment}`;
        },
        generateSubscriptionId: (): string => {
                const secureSegment = helpers.createSecureId().slice(0, 24);
                return `subscription-${secureSegment}`;
        },
});

let activeSource: SecureRandomSource = defaultSource;
let activeHelpers: SecureRandomHelpers = buildHelpers(activeSource);
let activeIdentifiers: IdentifierFactory = buildIdentifierFactory(activeHelpers);

export const setSecureRandomSource = (overrides: Partial<SecureRandomSource>): void => {
        activeSource = {
                ...defaultSource,
                ...overrides,
        };
        activeHelpers = buildHelpers(activeSource);
        activeIdentifiers = buildIdentifierFactory(activeHelpers);
};

export const resetSecureRandomSource = (): void => {
        activeSource = defaultSource;
        activeHelpers = buildHelpers(activeSource);
        activeIdentifiers = buildIdentifierFactory(activeHelpers);
};

export const withSecureRandomSource = async <T>(
        overrides: Partial<SecureRandomSource>,
        run: (helpers: SecureRandomHelpers, identifiers: IdentifierFactory) => Promise<T> | T,
): Promise<T> => {
        const previousSource = activeSource;
        const previousHelpers = activeHelpers;
        const previousIdentifiers = activeIdentifiers;

        setSecureRandomSource(overrides);

        try {
                return await run(activeHelpers, activeIdentifiers);
        } finally {
                activeSource = previousSource;
                activeHelpers = previousHelpers;
                activeIdentifiers = previousIdentifiers;
        }
};

export const createSecureId = (prefix?: string): string => activeHelpers.createSecureId(prefix);
export const createPrefixedId = (prefix: string): string => activeHelpers.createPrefixedId(prefix);
export const secureInt = (minimum: number, maximum: number): number => activeHelpers.secureInt(minimum, maximum);
export const secureRatio = (): number => activeHelpers.secureRatio();
export const secureDelay = (minimum: number, maximum: number): number => activeHelpers.secureDelay(minimum, maximum);

export const getIdentifierFactory = (): IdentifierFactory => activeIdentifiers;
export const createIdentifierFactory = (source?: SecureRandomSource): IdentifierFactory => {
        if (!source) {
                return activeIdentifiers;
        }

        const helpers = buildHelpers(source);
        return buildIdentifierFactory(helpers);
};
