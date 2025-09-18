// Minimal typed stub that delegates to the real package at runtime.
type Options = { cwd?: string; dot?: boolean; onlyFiles?: boolean };
type FgType = (patterns: string[] | string, options?: Options) => Promise<string[]>;
type FastGlobModule = { default: FgType };

const fg: FgType = (async (patterns: string[] | string, options?: Options) => {
	const real: FastGlobModule = await import('fast-glob');
	return real.default(patterns, options);
}) as FgType;

export default fg;
