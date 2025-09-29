import { expect } from 'vitest';

export const PLACEHOLDER_TOKENS = ['Mock', 'not yet implemented', 'TODO'];

export const assertNoPlaceholders = (value: unknown, context: string): void => {
        if (value === undefined || value === null) {
                return;
        }

        const snapshot = typeof value === 'string' ? value : JSON.stringify(value);

        for (const token of PLACEHOLDER_TOKENS) {
                if (snapshot.includes(token)) {
                        expect.fail(
                                `${context} should not include placeholder token "${token}". Snapshot: ${snapshot.substring(0, 200)}`,
                        );
                }
        }
};
