// Minimal typed stub that delegates to the real package at runtime.
type Options = { cwd?: string; dot?: boolean; onlyFiles?: boolean };
type FgType = (patterns: string[] | string, options?: Options) => Promise<string[]>;

const fg: FgType = ((patterns: string[] | string, options?: Options) => {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const real = require("fast-glob");
	return real(patterns, options);
}) as unknown as FgType;

export default fg;
