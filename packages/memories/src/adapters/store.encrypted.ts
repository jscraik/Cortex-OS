import type { Memory, MemoryId } from '../domain/types.js';
import type { EncryptionService } from '../ports/Encryption.js';
import type {
	MemoryStore,
	TextQuery,
	VectorQuery,
} from '../ports/MemoryStore.js';

// Fields we encrypt at-rest: text (string) and provenance (object serialized)
function isEncrypted(value: unknown): value is string {
	return typeof value === 'string' && value.startsWith('enc:');
}

async function encryptText(es: EncryptionService, text?: string) {
	if (!text) return undefined;
	const c = await es.encrypt(text);
	return `enc:${c}`;
}

async function decryptText(es: EncryptionService, text?: string) {
	if (!text) return undefined;
	if (!isEncrypted(text)) return text; // backward compatibility
	const body = text.slice(4);
	return es.decrypt(body);
}

export type EncryptedOptions = {
	encryptVectors?: boolean;
	encryptTags?: boolean;
};

export class EncryptedStore implements MemoryStore {
	constructor(
		private readonly inner: MemoryStore,
		private readonly crypto: EncryptionService,
		private readonly opts: EncryptedOptions = {},
	) {}

	private async toEncrypted(m: Memory): Promise<Memory> {
		const encText = await encryptText(this.crypto, m.text);
		const encProv = m.provenance
			? await encryptText(this.crypto, JSON.stringify(m.provenance))
			: undefined;
		const out: any = {
			...m,
			text: encText,
			provenance: encProv as unknown as Memory['provenance'],
		};
		if (this.opts.encryptVectors && m.vector) {
			out.vector = await encryptText(this.crypto, JSON.stringify(m.vector));
		}
		if (this.opts.encryptTags && m.tags) {
			out.tags = (await encryptText(
				this.crypto,
				JSON.stringify(m.tags),
			)) as unknown as string[];
		}
		return out as Memory;
	}

	private async toDecrypted(m: Memory): Promise<Memory> {
		const decText = await decryptText(this.crypto, m.text);
		let prov: Memory['provenance'] | undefined;
		if (typeof m.provenance === 'string') {
			const dec = await decryptText(this.crypto, m.provenance);
			prov = dec ? (JSON.parse(dec) as Memory['provenance']) : undefined;
		} else {
			prov = m.provenance;
		}
		const out: any = { ...m, text: decText, provenance: prov ?? m.provenance };
		if (this.opts.encryptVectors && typeof m.vector === 'string') {
			const dec = await decryptText(this.crypto, m.vector);
			out.vector = dec ? (JSON.parse(dec) as number[]) : undefined;
		}
		if (
			this.opts.encryptTags &&
			Array.isArray(m.tags) === false &&
			typeof (m as any).tags === 'string'
		) {
			const dec = await decryptText(this.crypto, (m as any).tags);
			out.tags = dec ? (JSON.parse(dec) as string[]) : [];
		}
		return out as Memory;
	}

	async upsert(m: Memory, namespace?: string): Promise<Memory> {
		const enc = await this.toEncrypted(m);
		await this.inner.upsert(enc, namespace);
		// Return logical view
		return m;
	}

	async get(id: MemoryId, namespace?: string): Promise<Memory | null> {
		const got = await this.inner.get(id, namespace);
		if (!got) return null;
		return this.toDecrypted(got);
	}

	async delete(id: MemoryId, namespace?: string): Promise<void> {
		return this.inner.delete(id, namespace);
	}

	async searchByText(q: TextQuery, namespace?: string): Promise<Memory[]> {
		const res = await this.inner.searchByText(q, namespace);
		return Promise.all(res.map((m) => this.toDecrypted(m)));
	}

	async searchByVector(q: VectorQuery, namespace?: string): Promise<Memory[]> {
		const res = await this.inner.searchByVector(q, namespace);
		return Promise.all(res.map((m) => this.toDecrypted(m)));
	}

	async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
		return this.inner.purgeExpired(nowISO, namespace);
	}
}
