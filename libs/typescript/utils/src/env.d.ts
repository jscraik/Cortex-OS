/**
 * Environment utilities for runtime detection.
 * No side effects outside reading provided process/env objects.
 */
export declare function hasTty(
	proc?: Pick<NodeJS.Process, 'stdin' | 'stdout'>,
): boolean;
export declare function isCi(env?: NodeJS.ProcessEnv): boolean;
//# sourceMappingURL=env.d.ts.map
