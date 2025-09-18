import { createHash, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { getConfigPath, ensureConfigDir, pathExists } from '../platform/xdg';

export interface TokenInfo {
	id: string;
	tokenHash: string;
	scopes: string[];
	expiresAt: string;
	createdAt: string;
	lastUsed?: string;
}

export interface GeneratedToken extends TokenInfo {
	token: string;
}

interface TokensFile {
	tokens: TokenInfo[];
	version: string;
}

const TOKENS_FILENAME = 'tokens.json';
const TOKEN_FILE_VERSION = '1.0.0';

export class AuthHttpError extends Error {
	constructor(
		public readonly statusCode: number,
		public readonly code: string,
		message: string,
		public readonly body: Record<string, unknown> = {},
	) {
		super(message);
	}
}

function getTokensPath(): string {
	return getConfigPath(TOKENS_FILENAME);
}

async function loadTokens(): Promise<TokenInfo[]> {
	const path = getTokensPath();
	if (!(await pathExists(path))) {
		return [];
	}
	const raw = await readFile(path, 'utf-8');
	const parsed = JSON.parse(raw) as TokensFile;
	return parsed.tokens ?? [];
}

async function saveTokens(tokens: TokenInfo[]): Promise<void> {
	await ensureConfigDir();
	const file: TokensFile = { tokens, version: TOKEN_FILE_VERSION };
	await writeFile(getTokensPath(), JSON.stringify(file, null, 2), 'utf-8');
}

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export async function generateToken(
	scopes: string[],
	ttlHours = 24,
): Promise<GeneratedToken> {
	const tokenBytes = randomBytes(32);
	const token = tokenBytes.toString('base64url');
	const tokenHash = hashToken(token);
	const id = tokenHash.substring(0, 16);

	const now = new Date();
	const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

	const tokenInfo: TokenInfo = {
		id,
		tokenHash,
		scopes: [...scopes],
		expiresAt: expiresAt.toISOString(),
		createdAt: now.toISOString(),
	};

	const tokens = await loadTokens();
	tokens.push(tokenInfo);
	await saveTokens(tokens);

	return { ...tokenInfo, token };
}

export async function initializeAuth(): Promise<GeneratedToken> {
	await ensureConfigDir();
	const tokens = await loadTokens();

	const now = new Date();
	const filtered = tokens.filter((t) => !(t.scopes.includes('*') && new Date(t.expiresAt) > now));
	if (filtered.length !== tokens.length) {
		await saveTokens(filtered);
	}

	return generateToken(['*'], 24 * 30);
}

export async function validateToken(token: string): Promise<TokenInfo> {
	const tokens = await loadTokens();
	const hashed = hashToken(token);
	const match = tokens.find((t) => t.tokenHash === hashed);

	if (!match) {
		throw new AuthHttpError(401, 'AUTHENTICATION_ERROR', 'Invalid token');
	}

	if (new Date(match.expiresAt) <= new Date()) {
		await revokeToken(match.id);
		throw new AuthHttpError(401, 'AUTHENTICATION_ERROR', 'Token expired');
	}

	return match;
}

export async function revokeToken(tokenId: string): Promise<void> {
	const tokens = await loadTokens();
	const filtered = tokens.filter((t) => t.id !== tokenId);
	await saveTokens(filtered);
}

export async function cleanupExpiredTokens(): Promise<number> {
	const tokens = await loadTokens();
	const now = new Date();
	const active = tokens.filter((t) => new Date(t.expiresAt) > now);
	const removed = tokens.length - active.length;
	if (removed > 0) {
		await saveTokens(active);
	}
	return removed;
}

async function updateTokenUsage(tokenId: string): Promise<void> {
	const tokens = await loadTokens();
	const token = tokens.find((t) => t.id === tokenId);
	if (!token) return;
	token.lastUsed = new Date().toISOString();
	await saveTokens(tokens);
}

export function isLoopbackAddress(ip: string): boolean {
	if (!ip) return false;
	const clean = ip.replace(/^::ffff:/, '');
	return (
		clean === '127.0.0.1' ||
		clean.startsWith('127.') ||
		clean === '::1' ||
		clean === 'localhost'
	);
}

interface AuthenticateParams {
	authorizationHeader?: string;
	clientIp: string;
	requiredScopes?: string[];
}

export async function authenticateRequest({
	authorizationHeader,
	clientIp,
	requiredScopes = [],
}: AuthenticateParams): Promise<{ tokenId: string; scopes: string[] }> {
	if (!isLoopbackAddress(clientIp)) {
		throw new AuthHttpError(403, 'LOOPBACK_REQUIRED', 'Access restricted to loopback clients');
	}

	if (!authorizationHeader?.startsWith('Bearer ')) {
		throw new AuthHttpError(401, 'AUTHENTICATION_ERROR', 'Authentication required');
	}

	const token = authorizationHeader.substring(7);
	const info = await validateToken(token);
	await updateTokenUsage(info.id);

	const missing = requiredScopes.filter((scope) => !info.scopes.includes(scope) && !info.scopes.includes('*'));
	if (missing.length > 0) {
		throw new AuthHttpError(403, 'AUTHORIZATION_ERROR', 'Insufficient privileges', {
			required: requiredScopes,
			available: info.scopes,
		});
	}

	return { tokenId: info.id, scopes: info.scopes };
}
