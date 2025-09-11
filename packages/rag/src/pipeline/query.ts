import type { Embedder, Store } from '../lib';

export async function query(
	args: { q: string; topK?: number },
	E: Embedder,
	S: Store,
) {
	const [emb] = await E.embed([args.q]);
	const hits = await S.query(emb, args.topK ?? 5);
	return hits;
}
