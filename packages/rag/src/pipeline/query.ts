import type { Embedder, Store } from '../lib';

export async function query(args: { q: string; topK?: number }, E: Embedder, S: Store) {
	const [emb] = await E.embed([args.q]);
	const anyS = S as unknown as {
		queryWithText?: (e: number[], q: string, k?: number) => Promise<ReturnType<Store['query']>>;
	};
	const hits =
		typeof anyS.queryWithText === 'function'
			? await anyS.queryWithText(emb, args.q, args.topK ?? 5)
			: await S.query(emb, args.topK ?? 5);
	return hits;
}
