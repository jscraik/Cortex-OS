import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { type ServerInfo, ServerInfoSchema } from '@cortex-os/mcp-core';

function registryPath(): string {
	const base =
		process.env.CORTEX_HOME ||
		(process.env.XDG_CONFIG_HOME
			? join(process.env.XDG_CONFIG_HOME, 'cortex-os')
			: join(process.env.HOME || '.', '.config', 'cortex-os'));
	return join(base, 'mcp', 'servers.json');
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
	try {
		const buf = await fs.readFile(file, 'utf8');
		return JSON.parse(buf) as T;
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
			console.error(`Failed to read ${file}:`, err);
		}
		return fallback;
	}
}

async function writeJson(file: string, value: unknown): Promise<void> {
	await fs.mkdir(dirname(file), { recursive: true });
	const lock = `${file}.lock`;
	const handle = await fs.open(lock, 'wx').catch((err) => {
		if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
			return null;
		}
		throw err;
	});
	if (!handle) throw new Error('Registry file is locked');
	try {
		const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
		await fs.writeFile(tmp, JSON.stringify(value, null, 2));
		await fs.rename(tmp, file);
	} finally {
		await handle.close();
		await fs.unlink(lock).catch(() => {});
	}
}

export async function readAll(): Promise<ServerInfo[]> {
	const file = registryPath();
	const data = await readJson<{ servers: ServerInfo[] }>(file, { servers: [] });
	return data.servers.map((s) => ServerInfoSchema.parse(s));
}

export async function upsert(si: ServerInfo): Promise<void> {
	const servers = await readAll();
	const next = servers.filter((s) => s.name !== si.name);
	next.push(ServerInfoSchema.parse(si));
	await writeJson(registryPath(), { servers: next });
}

export async function remove(name: string): Promise<boolean> {
	const servers = await readAll();
	const next = servers.filter((s) => s.name !== name);
	await writeJson(registryPath(), { servers: next });
	return next.length !== servers.length;
}
