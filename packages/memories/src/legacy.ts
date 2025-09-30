export function legacyMemoryAdapterRemoved<T = never>(adapter: string): T {
	throw new Error(
		`[@cortex-os/memories] ${adapter} has been removed. Migrate to @cortex-os/memory-core for canonical memory operations.`,
	);
}

export type LegacyNever<T = never> = T;
