import { describe, expect, it } from 'vitest';
import { getSecret, redactSecrets } from '../../../src/lib/secret-store.js';

describe('secret-store', () => {
    it('gets secret from env', () => {
        process.env.TEST_SECRET_KEY = 'shhh';
        expect(getSecret('TEST_SECRET_KEY')).toBe('shhh');
    });

    it('redacts sensitive patterns', () => {
        const text =
            'api=abcdabcdabcdabcdabcdabcdabcdabcd token=eyJ.xxx.yyy password=secret=1234';
        const redacted = redactSecrets(text);
        expect(redacted).not.toContain('abcdabcd');
        expect(redacted).not.toContain('eyJ.');
    });
});
