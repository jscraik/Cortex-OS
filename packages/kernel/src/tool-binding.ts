import fs from 'node:fs/promises';
import path from 'node:path';
import { execAsync } from './utils/exec.js';
import { z } from 'zod';

export interface BoundKernelTool<Result = unknown> {
        name: string;
        description: string;
        schema: z.ZodTypeAny;
        execute: (input: unknown) => Promise<Result>;
}

export interface BindKernelToolsOptions {
        cwd?: string;
        shell?: {
                allow?: string[];
                timeoutMs?: number;
        };
        filesystem?: {
                allow?: string[];
                maxBytes?: number;
        };
        http?: {
                allow?: string[];
                timeoutMs?: number;
                maxBytes?: number;
        };
}

export function bindKernelTools(options: BindKernelToolsOptions = {}): BoundKernelTool[] {
        const cwd = options.cwd ?? process.cwd();
        const shellAllow = options.shell?.allow ?? [];
        const shellTimeout = options.shell?.timeoutMs ?? 30_000;
        const fsAllow = options.filesystem?.allow ?? [];
        const fsMaxBytes = options.filesystem?.maxBytes;
        const httpAllow = options.http?.allow ?? [];
        const httpTimeout = options.http?.timeoutMs ?? 10_000;
        const httpMaxBytes = options.http?.maxBytes;

        const shellSchema = z.object({ command: z.string().min(1) });
        const fileSchema = z.object({ path: z.string().min(1) });
        const httpSchema = z.object({
                url: z.string().url(),
                method: z.string().optional(),
                headers: z.record(z.string()).optional(),
                body: z.string().optional(),
        });

        const shellTool: BoundKernelTool<{ stdout: string; stderr: string; exitCode: number }> = {
                name: 'shell.exec',
                description: 'Execute a shell command permitted by the brAInwav allowlist.',
                schema: shellSchema,
                async execute(input) {
                        const { command } = shellSchema.parse(input);
                        if (!isCommandAllowed(command, shellAllow)) {
                                throw new Error(`brAInwav shell deny: command not allowed (${command})`);
                        }
                        const result = await execAsync(command, { cwd, timeout: shellTimeout });
                        if (result.exitCode !== 0) {
                                throw new Error(
                                        `brAInwav shell error: ${result.stderr || `exit ${result.exitCode}`}`,
                                );
                        }
                        return {
                                stdout: result.stdout.trim(),
                                stderr: result.stderr.trim(),
                                exitCode: result.exitCode,
                        };
                },
        };

        const readFileTool: BoundKernelTool<{ path: string; content: string }> = {
                name: 'fs.read',
                description: 'Read a text file within the brAInwav filesystem allowlist.',
                schema: fileSchema,
                async execute(input) {
                        const { path: target } = fileSchema.parse(input);
                        const absolute = path.isAbsolute(target) ? target : path.join(cwd, target);
                        if (!isPathAllowed(absolute, fsAllow, cwd)) {
                                throw new Error(`brAInwav filesystem deny: ${absolute}`);
                        }
                        const data = await fs.readFile(absolute, 'utf8');
                        const content = typeof fsMaxBytes === 'number' ? data.slice(0, fsMaxBytes) : data;
                        return { path: absolute, content };
                },
        };

        const httpTool: BoundKernelTool<{ status: number; ok: boolean; body: string }> = {
                name: 'http.fetch',
                description: 'Perform an HTTP request constrained by the brAInwav allowlist.',
                schema: httpSchema,
                async execute(input) {
                        const { url, method = 'GET', headers, body } = httpSchema.parse(input);
                        const target = new URL(url);
                        if (!isUrlAllowed(target, httpAllow)) {
                                throw new Error(`brAInwav http deny: ${url}`);
                        }
                        const controller = new AbortController();
                        const timer = setTimeout(() => controller.abort(), httpTimeout);
                        try {
                                const response = await fetch(target, {
                                        method,
                                        headers,
                                        body,
                                        signal: controller.signal,
                                });
                                const text = await response.text();
                                const truncated = typeof httpMaxBytes === 'number' ? text.slice(0, httpMaxBytes) : text;
                                return { status: response.status, ok: response.ok, body: truncated };
                        } catch (error) {
                                const message = error instanceof Error ? error.message : String(error);
                                throw new Error(`brAInwav http error: ${message}`);
                        } finally {
                                clearTimeout(timer);
                        }
                },
        };

        return [shellTool, readFileTool, httpTool];
}

function isCommandAllowed(command: string, allowlist: string[]): boolean {
        if (!allowlist.length) return false;
        const [bin] = command.trim().split(/\s+/);
        return allowlist.some((allowed) => allowed === bin || command.startsWith(`${allowed} `));
}

function isPathAllowed(target: string, allowlist: string[], cwd: string): boolean {
        if (!allowlist.length) return false;
        const normalizedTarget = path.resolve(target);
        return allowlist.some((entry) => {
                        const base = path.resolve(entry.startsWith('.') ? path.join(cwd, entry) : entry);
                        const relative = path.relative(base, normalizedTarget);
                        return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
        });
}

function isUrlAllowed(url: URL, allowlist: string[]): boolean {
        if (!allowlist.length) return false;
        return allowlist.some((allowed) => {
                try {
                        const allowedUrl = new URL(allowed);
                        if (allowedUrl.origin !== url.origin) return false;
                        return url.pathname.startsWith(allowedUrl.pathname);
                } catch {
                        return url.href.startsWith(allowed);
                }
        });
}
