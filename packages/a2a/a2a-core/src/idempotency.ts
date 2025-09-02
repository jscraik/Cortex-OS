export interface IdempotencyStore {
	seen(id: string): Promise<boolean>;
	remember(id: string, ttlSec: number): Promise<void>;
}
export async function once<T>(
	store: IdempotencyStore,
	id: string,
	ttlSec: number,
	fn: () => Promise<T>,
): Promise<T | undefined> {
	if (await store.seen(id)) return undefined;
	const res = await fn();
	await store.remember(id, ttlSec);
	return res;
}
