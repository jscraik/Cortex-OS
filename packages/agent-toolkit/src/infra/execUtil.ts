import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export type ExecOptions = {
    timeoutMs?: number;
    retries?: number;
    backoffMs?: number;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
};

export async function execWithRetry(command: string, opts: ExecOptions = {}): Promise<{ stdout: string; stderr: string }> {
    const timeout = opts.timeoutMs ?? 30_000;
    const retries = Math.max(0, opts.retries ?? 1);
    const backoff = Math.max(0, opts.backoffMs ?? 250);
    let attempt = 0;
    while (true) {
        try {
            const res = await execAsync(command, { timeout, cwd: opts.cwd, env: opts.env, encoding: 'utf8' });
            return { stdout: res.stdout, stderr: res.stderr ?? '' };
        } catch (err) {
            attempt += 1;
            if (attempt > retries) throw summarizeExecError(command, err);
            await delay(backoff * attempt);
        }
    }
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeExecError(cmd: string, err: unknown): Error {
    if (err instanceof Error) {
        if (err.message.includes('timeout')) return new Error(`Command timed out (${cmd})`);
        if (err.message.includes('ENOENT')) return new Error(`Command not found: ${cmd}`);
        return new Error(`Command failed: ${cmd} :: ${err.message}`);
    }
    return new Error(`Command failed: ${cmd}`);
}
