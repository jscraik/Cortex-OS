export function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    const current = result[key];
    if (
      Array.isArray(current) && Array.isArray(value)
    ) {
      result[key] = [...current, ...value];
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      current !== null &&
      typeof current === 'object' &&
      !Array.isArray(current)
    ) {
      result[key] = deepMerge(
        current as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }
  return result as T;
}
