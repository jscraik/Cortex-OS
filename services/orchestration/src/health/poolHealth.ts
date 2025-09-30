export interface ResourcePoolSnapshot {
	available: number;
	busy: number;
	capacity: number;
}

export interface ResourcePoolIntrospector {
	id: string;
	describe(): Promise<ResourcePoolSnapshot>;
}

export interface PoolHealth {
	id: string;
	available: number;
	busy: number;
	capacity: number;
	saturation: number;
}

export const getResourcePoolHealth = async (
	pools: ResourcePoolIntrospector[],
): Promise<PoolHealth[]> => {
	const results: PoolHealth[] = [];

	for (const pool of pools) {
		const snapshot = await pool.describe();
		const saturation = snapshot.capacity === 0 ? 0 : snapshot.busy / snapshot.capacity;
		results.push({
			id: pool.id,
			available: snapshot.available,
			busy: snapshot.busy,
			capacity: snapshot.capacity,
			saturation,
		});
	}

	return results;
};
