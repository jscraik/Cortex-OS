import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
    generateApiKey,
    listApiKeys,
    resolveRoleForKey,
    revokeApiKey,
} from '../../src/security/api-keys';

const TMP_FILE = path.resolve(process.cwd(), 'tmp/api-keys.test.json');

afterEach(() => {
    if (fs.existsSync(TMP_FILE)) fs.unlinkSync(TMP_FILE);
});

describe('API Key Management', () => {
    it('generates and lists keys', () => {
        const rec = generateApiKey('admin', 'test-admin', TMP_FILE);
        expect(rec.key).toMatch(/^key_/);
        const all = listApiKeys(TMP_FILE);
        expect(all.find((r) => r.key === rec.key)?.role).toBe('admin');
    });

    it('revokes keys and resolveRoleForKey respects revocation', () => {
        const user = generateApiKey('user', 'user', TMP_FILE);
        expect(resolveRoleForKey(user.key, TMP_FILE)).toBe('user');
        const ok = revokeApiKey(user.key, TMP_FILE);
        expect(ok).toBe(true);
        expect(resolveRoleForKey(user.key, TMP_FILE)).toBeUndefined();
    });
});
