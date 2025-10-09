export type StoreMemoryInput = {
	id?: string;
	text: string;
	tags?: string[];
	meta?: Record<string, unknown>;
};
export type StoreMemoryResult = { id: string; createdAt: string };
export type SearchMemoryInput = { query: string; topK?: number; filterTags?: string[] };
export type SearchMemoryResult = {
	hits: Array<{ id: string; text: string; score: number; source: 'local' | 'pieces' }>;
	tookMs: number;
};
export type GetMemoryInput = { id: string };
export type GetMemoryResult = {
	id: string;
	text: string;
	tags: string[];
	meta?: Record<string, unknown>;
};
export type DeleteMemoryInput = { id: string };
export type DeleteMemoryResult = { id: string; deleted: boolean };
export type HealthStatus = { brand: 'brAInwav'; ok: true; details?: Record<string, unknown> };

export interface MemoryProvider {
	store(input: StoreMemoryInput, signal?: AbortSignal): Promise<StoreMemoryResult>;
	search(input: SearchMemoryInput, signal?: AbortSignal): Promise<SearchMemoryResult>;
	get(input: GetMemoryInput, signal?: AbortSignal): Promise<GetMemoryResult>;
	remove(input: DeleteMemoryInput, signal?: AbortSignal): Promise<DeleteMemoryResult>;
	health(): Promise<HealthStatus>;
}
