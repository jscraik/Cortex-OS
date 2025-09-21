import fs from 'node:fs';
import path from 'node:path';

export interface ApiKeyRecord {
	key: string;
	role: 'admin' | 'user';
	label?: string;
	createdAt: string;
	revoked?: boolean;
}

const DEFAULT_PATH =
	process.env.PRP_API_KEYS_FILE || path.resolve(process.cwd(), 'data/api-keys.json');

function ensureDir(p: string): void {
	const dir = path.dirname(p);
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readAll(filePath = DEFAULT_PATH): ApiKeyRecord[] {
	try {
		const raw = fs.readFileSync(filePath, 'utf8');
		return JSON.parse(raw) as ApiKeyRecord[];
	} catch {
		return [];
	}
}

function writeAll(records: ApiKeyRecord[], filePath = DEFAULT_PATH): void {
	ensureDir(filePath);
	fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf8');
}

export function listApiKeys(filePath = DEFAULT_PATH): ApiKeyRecord[] {
	return readAll(filePath);
}

export function generateApiKey(
	role: 'admin' | 'user',
	label?: string,
	filePath = DEFAULT_PATH,
): ApiKeyRecord {
	const key = `key_${Math.random().toString(36).slice(2)}_${Date.now()}`;
	const rec: ApiKeyRecord = { key, role, label, createdAt: new Date().toISOString() };
	const all = readAll(filePath);
	all.push(rec);
	writeAll(all, filePath);
	return rec;
}

export function revokeApiKey(key: string, filePath = DEFAULT_PATH): boolean {
	const all = readAll(filePath);
	const idx = all.findIndex((r) => r.key === key);
	if (idx === -1) return false;
	all[idx].revoked = true;
	writeAll(all, filePath);
	return true;
}

export function resolveRoleForKey(
	key?: string,
	filePath = DEFAULT_PATH,
): 'admin' | 'user' | undefined {
	if (!key) return undefined;
	const rec = readAll(filePath).find((r) => r.key === key && !r.revoked);
	return rec?.role;
}
