/**
 * Environment utilities for runtime detection.
 * No side effects outside reading provided process/env objects.
 */
export function hasTty(proc = process) {
    return Boolean(proc.stdin && proc.stdout && proc.stdin.isTTY && proc.stdout.isTTY);
}
export function isCi(env = process.env) {
    return env.CI === 'true';
}
const DOTENV_LOADER_SPECIFIER = new URL('../../../../scripts/utils/dotenv-loader.mjs', import.meta.url);
let loaderPromise;
const ensureLoader = () => {
    loaderPromise ??= import(DOTENV_LOADER_SPECIFIER.href);
    return loaderPromise;
};
export const loadDotenv = async (options = {}) => {
    const loader = await ensureLoader();
    return loader.loadDotenv(options);
};
