import { randomUUID } from 'node:crypto';

export type SecureRandomSource = () => string;

let activeSource: SecureRandomSource = randomUUID;

export const setSecureRandomSource = (source: SecureRandomSource): void => {
        activeSource = source;
};

export const resetSecureRandomSource = (): void => {
        activeSource = randomUUID;
};

export const withSecureRandomSource = async <T>(
        source: SecureRandomSource,
        run: () => Promise<T> | T,
): Promise<T> => {
        const previous = activeSource;
        setSecureRandomSource(source);

        try {
                return await run();
        } finally {
                activeSource = previous;
        }
};

export const createSecureId = (prefix?: string): string => {
        const core = activeSource().replace(/-/g, '');
        return prefix ? `${prefix}-${core}` : core;
};

export const createPrefixedId = (prefix: string): string => `${prefix}-${createSecureId()}`;

export const createTimestampedId = (prefix: string): string => {
        const secureSegment = createSecureId().slice(0, 9);
        return `${prefix}_${Date.now()}_${secureSegment}`;
};
