export interface ExecOptions {
        timeout?: number;
        maxBuffer?: number;
        cwd?: string;
        env?: NodeJS.ProcessEnv;
        throwOnError?: boolean;
}

export interface ExecResult {
        stdout: string;
        stderr: string;
        exitCode?: number;
}

export interface ExecWithRetryOptions extends ExecOptions {
        retries?: number;
        backoffMs?: number;
}

export declare function safeExecFile(command: string, args: string[], options?: ExecOptions): Promise<ExecResult>;
export declare function safeExecFileWithRetry(
        command: string,
        args: string[],
        options?: ExecWithRetryOptions,
): Promise<ExecResult>;
export declare function validateCommandAllowlist(command: string, allowlist: string[]): void;

export { isPrivateHostname, safeFetch } from '../src/utils/network-utils.js';
