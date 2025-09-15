import { describe, expect, it } from 'vitest';

import {
        ErrorType,
        classifyError,
        getErrorDescription,
        isRetryableError,
} from '../src/lib/error-classifier.js';

describe('error classifier', () => {
        it('classifies null-like input using the default retryable strategy', () => {
                const classification = classifyError(null);

                expect(classification.type).toBe(ErrorType.RETRYABLE);
                expect(classification.retryable).toBe(true);
                expect(isRetryableError(null)).toBe(true);
        });

        it('prefers HTTP status information when available', () => {
                const classification = classifyError({ status: 429 });

                expect(classification.type).toBe(ErrorType.RATE_LIMITED);
                expect(classification.retryable).toBe(true);
        });

        it('produces descriptive text for surfaced errors', () => {
                const description = getErrorDescription({ message: 'validation failed' });

                expect(description).toContain('Type: validation_error');
                expect(description).toContain('Retryable: false');
        });
});
