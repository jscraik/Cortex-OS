import { existsSync, promises as fs } from 'node:fs';
import * as path from 'node:path';

/**
 * ConfigManager provides typed access to the repository configuration.
 * Module contract: interacts only with filesystem and exposes no side effects
 * outside of reading/writing `cortex-config.json`.
 */

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonObject
	| JsonValue[];
export interface JsonObject {
	[key: string]: JsonValue;
}

function getRepoRoot(): string {
	let dir = path.dirname(new URL(import.meta.url).pathname);
	while (!existsSync(path.join(dir, 'cortex-config.json'))) {
		const parent = path.dirname(dir);
		if (parent === dir) {
			throw new Error('Unable to locate repository root from config.ts');
		}
		dir = parent;
	}
	return dir;
}

function deepGet<T = JsonValue>(
	obj: JsonObject,
	keyPath: string,
): T | undefined {
	if (!keyPath) return obj as unknown as T;
	return keyPath
		.split('.')
		.reduce<JsonValue | undefined>(
			(acc, k) => (acc == null ? undefined : (acc as JsonObject)[k]),
			obj,
		) as T | undefined;
}

function deepSet(
	obj: JsonObject,
	keyPath: string,
	value: JsonValue,
): JsonObject {
	const parts = keyPath.split('.');
	let cur: JsonObject = obj;
	for (let i = 0; i < parts.length - 1; i++) {
		const p = parts[i];
		if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {};
		cur = cur[p] as JsonObject;
	}
	cur[parts[parts.length - 1]] = value;
	return obj;
}

export class ConfigManager {
	private static instance: ConfigManager | null = null;
	private readonly configPath: string;
	private baseline: JsonObject = {};

	private constructor() {
		// Primary config file at repo root
		this.configPath = path.resolve(getRepoRoot(), 'cortex-config.json');
	}

	static getInstance(): ConfigManager {
		if (!ConfigManager.instance) ConfigManager.instance = new ConfigManager();
		return ConfigManager.instance;
	}

	async loadFile(): Promise<JsonObject> {
		try {
			const raw = await fs.readFile(this.configPath, 'utf-8');
			const json: JsonObject = JSON.parse(raw);
			if (Object.keys(this.baseline).length === 0) {
				// Keep the first loaded copy as baseline for reset()
				this.baseline = JSON.parse(raw);
			}
			return json;
		} catch (err: unknown) {
			if (
				typeof err === 'object' &&
				err !== null &&
				(err as { code?: string }).code === 'ENOENT'
			) {
				// Initialize with defaults
				const defaults: JsonObject = {};
				await this.saveFile(defaults);
				this.baseline = { ...defaults };
				return defaults;
			}
			throw err;
		}
	}

	async saveFile(config: JsonObject): Promise<void> {
		const content = `${JSON.stringify(config, null, 2)}\n`;
		await fs.writeFile(this.configPath, content, 'utf-8');
	}

	async getValue<T = JsonValue>(key: string): Promise<T | undefined> {
		const cfg = await this.loadFile();
		return deepGet<T>(cfg, key);
	}

	async set(key: string, value: JsonValue): Promise<void> {
		const cfg = await this.loadFile();
		deepSet(cfg, key, value);
		await this.saveFile(cfg);
	}

	async getAll(): Promise<JsonObject> {
		return this.loadFile();
	}

	async reset(): Promise<void> {
		await this.saveFile(this.baseline || {});
	}
}

export const configManager = ConfigManager.getInstance();
