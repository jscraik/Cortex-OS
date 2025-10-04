export function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
	const result = { ...base };
	for (const key of Object.keys(override) as Array<keyof T>) {
		const value = override[key];
		const current = result[key];
		if (value === undefined) {
			continue; // Skip undefined values
		}
		if (Array.isArray(current) && Array.isArray(value)) {
			(result[key] as unknown[]) = [...current, ...value];
		} else if (
			value != null &&
			current != null &&
			typeof value === 'object' &&
			typeof current === 'object' &&
			!Array.isArray(value) &&
			!Array.isArray(current)
		) {
			result[key] = deepMerge(
				current as Record<string, unknown>,
				value as Record<string, unknown>,
			) as T[keyof T];
		} else {
			result[key] = value as T[keyof T];
		}
	}
	return result;
}
