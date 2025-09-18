import type { Memory } from '../domain/types.js';
import type { MemoryStore } from '../ports/MemoryStore.js';

export type ConsolidationOptions = {
	minAgeMs?: number; // minimum age in ms to be eligible
	batchSize?: number; // fetch size via text search
	filter?: (m: Memory) => boolean; // additional predicate
	namespace?: string;
};

export async function consolidateShortToLong(
	shortTerm: MemoryStore,
	longTerm: MemoryStore,
	opts: ConsolidationOptions = {},
): Promise<{ promoted: number }> {
	const batchSize = opts.batchSize ?? 1000;
	const ns = opts.namespace;
	let promoted = 0;
	let movedInPass = 0;
	do {
		movedInPass = 0;
		const now = Date.now();
		const candidates = await shortTerm.searchByText({ text: '', topK: batchSize }, ns);
		if (candidates.length === 0) break;
		for (const m of candidates) {
			const age = now - new Date(m.createdAt).getTime();
			const eligibleByAge = opts.minAgeMs ? age >= opts.minAgeMs : true;
			const eligibleByScope = m.policy?.scope === 'session';
			const eligibleByFilter = opts.filter ? opts.filter(m) : true;
			if (eligibleByScope && eligibleByAge && eligibleByFilter) {
				await longTerm.upsert({ ...m, policy: { ...m.policy, scope: 'user' } }, ns);
				await shortTerm.delete(m.id, ns);
				promoted++;
				movedInPass++;
			}
		}
	} while (movedInPass > 0);
	return { promoted };
}
