/**
 * Environment utilities for runtime detection.
 * No side effects outside reading provided process/env objects.
 */
export declare function hasTty(proc?: Pick<NodeJS.Process, 'stdin' | 'stdout'>): boolean;
export declare function isCi(env?: NodeJS.ProcessEnv): boolean;
type DotenvLoaderModule = typeof import('../../../../scripts/utils/dotenv-loader.mjs');
export type LoadDotenvOptions = Parameters<DotenvLoaderModule['loadDotenv']>[0];
export type LoadDotenvResult = Awaited<ReturnType<DotenvLoaderModule['loadDotenv']>>;
export declare const loadDotenv: (options?: LoadDotenvOptions) => Promise<LoadDotenvResult>;
export {};
