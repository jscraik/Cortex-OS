import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import type { ServerInfo } from '@cortex-os/mcp-core';
import { ServerInfoSchema } from '@cortex-os/mcp-core';

export interface RegistryMemoryCacheOptions {
	registryPath: string;
	flushIntervalMs?: number;
	logger?: {
		info: (...args: unknown[]) => void;
		warn: (...args: unknown[]) => void;
	};
}

const defaultLogger = {
	info: () => {},
	warn: () => {},
};

interface RegistryFileShape {
	servers: ServerInfo[];
}

export class RegistryMemoryCache {
	private readonly cache = new Map<string, ServerInfo>();
	private dirty = false;
	private flushing = false;
	private flushTimer: NodeJS.Timeout | null = null;
	private readonly options: Required<RegistryMemoryCacheOptions>;

	constructor(options: RegistryMemoryCacheOptions) {
		this.options = {
			flushIntervalMs: options.flushIntervalMs ?? 5_000,
			logger: options.logger ?? defaultLogger,
			registryPath: options.registryPath,
		};
	}

	async init(): Promise<void> {
		await this.loadFromDisk();

		if (this.options.flushIntervalMs > 0) {
			this.flushTimer = setInterval(() => {
				void this.flush();
			}, this.options.flushIntervalMs);
			this.flushTimer.unref?.();
		}
	}

	getAll(): ServerInfo[] {
		return Array.from(this.cache.values());
	}

	upsert(info: ServerInfo): void {
		const normalized = ServerInfoSchema.parse(info);
		this.cache.set(normalized.name, normalized);
		this.dirty = true;
	}

	remove(name: string): boolean {
		const existed = this.cache.delete(name);
		if (existed) {
			this.dirty = true;
		}
		return existed;
	}

	async flush(): Promise<void> {
		if (!this.dirty || this.flushing) {
			return;
		}

		this.flushing = true;

		try {
			const payload: RegistryFileShape = { servers: this.getAll() };
			await fs.mkdir(dirname(this.options.registryPath), { recursive: true });
			const tmp = `${this.options.registryPath}.tmp-${process.pid}-${Date.now()}`;
			await fs.writeFile(tmp, JSON.stringify(payload, null, 2));
			await fs.rename(tmp, this.options.registryPath);
			this.dirty = false;
			this.options.logger.info(
				{ brand: 'brAInwav', serverCount: payload.servers.length },
				'Flushed MCP registry cache to disk',
			);
		} catch (error) {
			this.options.logger.warn(
				{
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : error,
				},
				'Failed to flush MCP registry cache',
			);
		} finally {
			this.flushing = false;
		}
	}

	async close(): Promise<void> {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
			this.flushTimer = null;
		}

		await this.flush();
	}

	private async loadFromDisk(): Promise<void> {
		try {
			const raw = await fs.readFile(this.options.registryPath, 'utf8');
			const parsed = JSON.parse(raw) as Partial<RegistryFileShape>;
			const servers = Array.isArray(parsed.servers) ? parsed.servers : [];

			this.cache.clear();
			for (const entry of servers) {
				const normalized = ServerInfoSchema.parse(entry);
				this.cache.set(normalized.name, normalized);
			}
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				return;
			}

			this.cache.clear();
			this.options.logger.warn(
				{
					brand: 'brAInwav',
					error: error instanceof Error ? error.message : error,
				},
				'Failed to load MCP registry cache',
			);
		}
	}
}
