import type { Memory } from '../domain/types.js';
import type { EncryptionService } from '../ports/Encryption.js';
import type { MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';
import { type EncryptedOptions, EncryptedStore } from './store.encrypted.js';

export type EncryptionSelector = (namespace: string, m?: Memory) => boolean;

/**
 * PolicyEncryptedStore wraps a base store and conditionally applies encryption
 * per namespace using EncryptedStore.
 */
export class PolicyEncryptedStore implements MemoryStore {
	private readonly encCache = new Map<string, EncryptedStore>();

	constructor(
		private readonly base: MemoryStore,
		private readonly enc: EncryptionService,
		private readonly shouldEncrypt: EncryptionSelector,
		private readonly encOpts: EncryptedOptions = {},
	) { }

	private select(namespace: string, sample?: Memory): MemoryStore {
		if (this.shouldEncrypt(namespace, sample)) {
			let s = this.encCache.get(namespace);
			if (!s) {
				s = new EncryptedStore(this.base, this.enc, this.encOpts);
				this.encCache.set(namespace, s);
			}
			return s;
		}
		return this.base;
	}

	async upsert(m: Memory, namespace = 'default'): Promise<Memory> {
		return this.select(namespace, m).upsert(m, namespace);
	}
	async get(id: string, namespace = 'default'): Promise<Memory | null> {
		return this.select(namespace).get(id, namespace);
	}
	async delete(id: string, namespace = 'default'): Promise<void> {
		return this.select(namespace).delete(id, namespace);
	}
	async searchByText(q: TextQuery, namespace = 'default'): Promise<Memory[]> {
		return this.select(namespace).searchByText(q, namespace);
	}
	async searchByVector(q: VectorQuery, namespace = 'default'): Promise<Memory[]> {
		return this.select(namespace).searchByVector(q, namespace);
	}
	async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
		if (namespace) return this.select(namespace).purgeExpired(nowISO, namespace);
		// If no namespace provided, just delegate to base
		return this.base.purgeExpired(nowISO);
	}
}
