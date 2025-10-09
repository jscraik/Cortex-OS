/**
 * Environment utilities for runtime detection.
 * No side effects outside reading provided process/env objects.
 */
export function hasTty(proc: Pick<NodeJS.Process, 'stdin' | 'stdout'> = process): boolean {
	return Boolean(proc.stdin && proc.stdout && proc.stdin.isTTY && proc.stdout.isTTY);
}

export function isCi(env: NodeJS.ProcessEnv = process.env): boolean {
	return env.CI === 'true';
}

type DotenvLoaderModule = typeof import('../../../../scripts/utils/dotenv-loader.mjs');

export type LoadDotenvOptions = Parameters<DotenvLoaderModule['loadDotenv']>[0];
export type LoadDotenvResult = Awaited<ReturnType<DotenvLoaderModule['loadDotenv']>>;

const DOTENV_LOADER_SPECIFIER = new URL(
	'../../../../scripts/utils/dotenv-loader.mjs',
	import.meta.url,
);

let loaderPromise: Promise<DotenvLoaderModule> | undefined;

const ensureLoader = (): Promise<DotenvLoaderModule> => {
	loaderPromise ??= import(DOTENV_LOADER_SPECIFIER.href) as Promise<DotenvLoaderModule>;
	return loaderPromise;
};

export const loadDotenv = async (options: LoadDotenvOptions = {}): Promise<LoadDotenvResult> => {
	const loader = await ensureLoader();
	return loader.loadDotenv(options);
};
