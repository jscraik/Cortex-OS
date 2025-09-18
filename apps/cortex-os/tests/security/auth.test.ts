import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { ensureConfigDir, getConfigPath } from '../../src/platform/xdg';
import {
	AuthHttpError,
	authenticateRequest,
	cleanupExpiredTokens,
	generateToken,
	initializeAuth,
	validateToken,
} from '../../src/security/auth';

let tempDir: string;

beforeEach(async () => {
	const root = process.env.CORTEX_OS_TMP ?? tmpdir();
	tempDir = await mkdtemp(join(root, 'auth-'));
	process.env.XDG_CONFIG_HOME = join(tempDir, 'config');
	process.env.XDG_STATE_HOME = join(tempDir, 'state');
	await ensureConfigDir();
});

afterEach(async () => {
	delete process.env.XDG_CONFIG_HOME;
	delete process.env.XDG_STATE_HOME;
	await rm(tempDir, { recursive: true, force: true });
});

describe('token lifecycle', () => {
	test('initializeAuth writes admin token and persists hash', async () => {
		const { token, tokenHash, id } = await initializeAuth();
		expect(token).toBeTruthy();
		expect(tokenHash).toBeDefined();
		expect(id).toHaveLength(16);

		const file = await readFile(getConfigPath('tokens.json'), 'utf-8');
		expect(file).not.toContain(token);

		const info = await validateToken(token);
		expect(info.id).toBe(id);
		expect(info.scopes).toContain('*');
	});

	test('cleanupExpiredTokens prunes stale entries', async () => {
		const { token } = await initializeAuth();
		const info = await validateToken(token);
		await generateToken(['read'], -1);
		const removed = await cleanupExpiredTokens();
		expect(removed).toBeGreaterThanOrEqual(1);

		const stillValid = await validateToken(token);
		expect(stillValid.id).toBe(info.id);
	});
});

describe('authenticateRequest', () => {
	test('rejects non-loopback clients', async () => {
		await initializeAuth();
		await expect(
			authenticateRequest({
				authorizationHeader: 'Bearer token',
				clientIp: '192.168.0.1',
			}),
		).rejects.toMatchObject({ statusCode: 403, code: 'LOOPBACK_REQUIRED' });
	});

	test('rejects missing Authorization header', async () => {
		await initializeAuth();
		await expect(authenticateRequest({ clientIp: '127.0.0.1' })).rejects.toMatchObject({
			statusCode: 401,
			code: 'AUTHENTICATION_ERROR',
		});
	});

	test('accepts valid token and enforces scopes', async () => {
		const { token } = await initializeAuth();
		const result = await authenticateRequest({
			authorizationHeader: `Bearer ${token}`,
			clientIp: '127.0.0.1',
			requiredScopes: ['*'],
		});
		expect(result.tokenId).toBeDefined();

		const limited = await generateToken(['read'], 1);
		await expect(
			authenticateRequest({
				authorizationHeader: `Bearer ${limited.token}`,
				clientIp: '127.0.0.1',
				requiredScopes: ['write'],
			}),
		).rejects.toMatchObject({ statusCode: 403, code: 'AUTHORIZATION_ERROR' });
	});

	test('throws informative error for malformed header', async () => {
		await initializeAuth();
		await expect(
			authenticateRequest({
				authorizationHeader: 'token without bearer prefix',
				clientIp: '127.0.0.1',
			}),
		).rejects.toBeInstanceOf(AuthHttpError);
	});
});
