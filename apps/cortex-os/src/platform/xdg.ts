import { constants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_NAMESPACE = ['cortex-os'];
const STATE_NAMESPACE = ['cortex-os'];
const DATA_NAMESPACE = ['cortex-os'];

export function getConfigHome(): string {
	const tmpRoot = process.env.CORTEX_OS_TMP;
	if (tmpRoot) return join(tmpRoot, 'config');
	const base = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
	return join(base, ...CONFIG_NAMESPACE);
}

export function getStateHome(): string {
	const tmpRoot = process.env.CORTEX_OS_TMP;
	if (tmpRoot) return join(tmpRoot, 'state');
	const base = process.env.XDG_STATE_HOME || join(homedir(), '.local', 'state');
	return join(base, ...STATE_NAMESPACE);
}

export function getConfigPath(filename: string): string {
	return join(getConfigHome(), filename);
}

export async function ensureConfigDir(): Promise<void> {
	await mkdir(getConfigHome(), { recursive: true });
}

export function getStatePath(...segments: string[]): string {
	return join(getStateHome(), ...segments);
}

export async function ensureStateDir(): Promise<void> {
	await mkdir(getStateHome(), { recursive: true });
}

export function getDataHome(): string {
	const tmpRoot = process.env.CORTEX_OS_TMP;
	if (tmpRoot) return join(tmpRoot, 'data');
	const base = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
	return join(base, ...DATA_NAMESPACE);
}

export function getDataPath(...segments: string[]): string {
	return join(getDataHome(), ...segments);
}

export async function ensureDataDir(...segments: string[]): Promise<string> {
	const target = segments.length > 0 ? getDataPath(...segments) : getDataHome();
	await mkdir(target, { recursive: true });
	return target;
}

export async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}
