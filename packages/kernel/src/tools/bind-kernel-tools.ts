/**
 * @file bind-kernel-tools.ts
 * @description Assemble guarded kernel tool surfaces with brAInwav branding
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { z } from 'zod';
import { execAsync } from '../utils/exec.js';

type CompiledPattern = { raw: string; regex: RegExp };

type ToolSurface = 'bash' | 'filesystem' | 'network';

const SecurityToolDescriptorSchema = z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        allow: z.array(z.string().min(1)).default([]),
});

const OptionsSchema = z.object({
        cwd: z.string().min(1),
        bashAllow: z.array(z.string().min(1)).min(1),
        fsAllow: z.array(z.string().min(1)).min(1),
        netAllow: z.array(z.string().min(1)).optional(),
        timeoutMs: z.number().int().positive().optional(),
        maxReadBytes: z.number().int().positive().optional(),
        defaultModel: z.string().min(1).optional(),
        securityTools: z.array(SecurityToolDescriptorSchema).optional(),
});

const BashInputSchema = z.object({
        command: z.string().min(1),
        cwd: z.string().optional(),
});

const ReadFileInputSchema = z.object({
        path: z.string().min(1),
        encoding: z.string().optional(),
        maxBytes: z.number().int().positive().optional(),
});

const FetchInputSchema = z.object({
        url: z.string().url(),
        method: z.string().optional(),
        headers: z.record(z.string()).optional(),
        body: z.union([z.string(), z.record(z.any())]).optional(),
});

type SecurityToolDescriptor = z.infer<typeof SecurityToolDescriptorSchema>;

export type BindKernelToolsOptions = z.infer<typeof OptionsSchema>;

export type KernelBashInput = z.infer<typeof BashInputSchema>;
export interface KernelBashResult {
        stdout: string;
        stderr: string;
        exitCode: number;
        elapsedMs: number;
}

export type KernelReadFileInput = z.infer<typeof ReadFileInputSchema>;
export interface KernelReadFileResult {
        content: string;
        truncated: boolean;
        bytesRead: number;
        encoding: BufferEncoding;
}

export type KernelFetchInput = z.infer<typeof FetchInputSchema>;
export interface KernelFetchResult {
        status: number;
        ok: boolean;
        body: string;
        headers: Record<string, string>;
        elapsedMs: number;
}

export interface KernelTool<TInput = unknown, TResult = unknown> {
        name: string;
        description: string;
        schema: z.ZodTypeAny;
        metadata: {
                surface: ToolSurface;
                allowList: string[];
                timeoutMs: number;
        };
        invoke: (input: TInput) => Promise<TResult>;
}

/**
 * @deprecated This type alias is retained for backward compatibility.
 * Please use {@link KernelTool} instead.
 */
export type BoundKernelTool<TInput = unknown, TResult = unknown> = KernelTool<TInput, TResult>;

type KernelToolAny = KernelTool<unknown, unknown>;

export interface KernelToolBinding {
        tools: KernelToolAny[];
        metadata: {
                brand: string;
                cwd: string;
                defaultModel: string;
                allowLists: {
                        bash: string[];
                        filesystem: string[];
                        network: string[];
                };
                timeoutMs: number;
                surfaces: string[];
                security?: {
                        brand: string;
                        tools: Array<{
                                name: string;
                                description: string;
                                allowList: string[];
                        }>;
                };
        };
}

interface ToolBindingContext {
        cwd: string;
        timeoutMs: number;
        maxReadBytes: number;
        bashPatterns: CompiledPattern[];
        fsPatterns: CompiledPattern[];
        netPatterns: CompiledPattern[];
        bashAllow: string[];
        fsAllow: string[];
        netAllow: string[];
        securityTools: SecurityToolDescriptor[];
}

export function bindKernelTools(rawOptions: BindKernelToolsOptions): KernelToolBinding {
        const options = OptionsSchema.parse(rawOptions);
        const context: ToolBindingContext = {
                cwd: path.resolve(options.cwd),
                timeoutMs: options.timeoutMs ?? 30000,
                maxReadBytes: options.maxReadBytes ?? 65536,
                bashPatterns: compilePatterns(options.bashAllow),
                fsPatterns: compilePatterns(options.fsAllow),
                netPatterns: compilePatterns(options.netAllow ?? []),
                bashAllow: [...options.bashAllow],
                fsAllow: [...options.fsAllow],
                netAllow: [...(options.netAllow ?? [])],
                securityTools: [...(options.securityTools ?? [])],
        };

        const tools = [
                createBashTool(context),
                createReadFileTool(context),
                createFetchTool(context),
        ] as KernelToolAny[];

        const securityMetadata = context.securityTools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                allowList: [...tool.allow],
        }));

        return {
                tools,
                metadata: {
                        brand: 'brAInwav kernel toolkit',
                        cwd: context.cwd,
                        defaultModel: options.defaultModel ?? 'inherit',
                        allowLists: {
                                bash: [...context.bashAllow],
                                filesystem: [...context.fsAllow],
                                network: [...context.netAllow],
                        },
                        timeoutMs: context.timeoutMs,
                        surfaces: tools.map((tool) => tool.name),
                        security: securityMetadata.length
                                ? {
                                          brand: 'brAInwav cortex-sec',
                                          tools: securityMetadata,
                                  }
                                : undefined,
                },
        };
}

function createBashTool(
        context: ToolBindingContext,
): KernelTool<KernelBashInput, KernelBashResult> {
        return {
                name: 'kernel.bash',
                description: 'Execute shell commands guarded by brAInwav kernel policy',
                schema: BashInputSchema,
                metadata: {
                        surface: 'bash',
                        allowList: [...context.bashAllow],
                        timeoutMs: context.timeoutMs,
                },
                invoke: async (rawInput) => {
                        const input = BashInputSchema.parse(rawInput);
                        const command = input.command.trim();
                        ensureAllowed(command, context.bashPatterns, 'bash');
                        const executionCwd = input.cwd ? resolveWithin(context.cwd, input.cwd) : context.cwd;
                        const started = Date.now();
                        const result = await execAsync(command, {
                                cwd: executionCwd,
                                timeout: context.timeoutMs,
                        });
                        return {
                                stdout: result.stdout,
                                stderr: result.stderr,
                                exitCode: result.exitCode,
                                elapsedMs: Date.now() - started,
                        };
                },
        };
}

function createReadFileTool(
        context: ToolBindingContext,
): KernelTool<KernelReadFileInput, KernelReadFileResult> {
        return {
                name: 'kernel.readFile',
                description: 'Read file contents within brAInwav filesystem guardrails',
                schema: ReadFileInputSchema,
                metadata: {
                        surface: 'filesystem',
                        allowList: [...context.fsAllow],
                        timeoutMs: context.timeoutMs,
                },
                invoke: async (rawInput) => {
                        const input = ReadFileInputSchema.parse(rawInput);
                        const resolved = resolveWithin(context.cwd, input.path);
                        const relative = toPosixPath(path.relative(context.cwd, resolved));
                        ensureAllowed(relative, context.fsPatterns, 'filesystem');
                        const bytes = await fs.readFile(resolved);
                        const limit = Math.min(input.maxBytes ?? context.maxReadBytes, context.maxReadBytes);
                        const truncated = bytes.length > limit;
                        const encoding = (input.encoding ?? 'utf8') as BufferEncoding;
                        return {
                                content: bytes.subarray(0, limit).toString(encoding),
                                truncated,
                                bytesRead: Math.min(bytes.length, limit),
                                encoding,
                        };
                },
        };
}

function createFetchTool(
        context: ToolBindingContext,
): KernelTool<KernelFetchInput, KernelFetchResult> {
        return {
                name: 'kernel.fetchJson',
                description: 'Perform HTTP fetch guarded by brAInwav network policy',
                schema: FetchInputSchema,
                metadata: {
                        surface: 'network',
                        allowList: [...context.netAllow],
                        timeoutMs: context.timeoutMs,
                },
                invoke: async (rawInput) => {
                        const input = FetchInputSchema.parse(rawInput);
                        const parsedUrl = new URL(input.url);
                        const matchValue = `${parsedUrl.origin}${parsedUrl.pathname}`;
                        ensureAllowed(matchValue, context.netPatterns, 'network');
                        const controller = new AbortController();
                        const timer = setTimeout(() => controller.abort(), context.timeoutMs);
                        const started = Date.now();
                        try {
                                const response = await fetch(input.url, {
                                        method: input.method ?? 'GET',
                                        headers: input.headers,
                                        body: serializeRequestBody(input.body),
                                        signal: controller.signal,
                                });
                                const bodyText = await response.text();
                                if (!response.ok) {
                                        throw new Error(
                                                `brAInwav kernel fetch error: ${response.status} ${response.statusText || 'Unknown status'}`,
                                        );
                                }
                                return {
                                        status: response.status,
                                        ok: response.ok,
                                        body: bodyText,
                                        headers: headersToObject(response.headers.entries()),
                                        elapsedMs: Date.now() - started,
                                };
                        } catch (error) {
                                throw new Error(`brAInwav kernel policy violation: ${extractErrorMessage(error)}`);
                        } finally {
                                clearTimeout(timer);
                        }
                },
        };
}

function serializeRequestBody(body: KernelFetchInput['body']): string | undefined {
        if (body === undefined) {
                        return undefined;
        }
        return typeof body === 'string' ? body : JSON.stringify(body);
}

function headersToObject(entries: Iterable<[string, string]>): Record<string, string> {
        return Object.fromEntries(entries);
}

function extractErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : 'Unknown fetch error';
}

function ensureAllowed(value: string, allow: CompiledPattern[], surface: ToolSurface): void {
        if (!allow.length) {
                throw new Error(`brAInwav kernel policy violation: ${surface} usage is disabled`);
        }
        const permitted = allow.some((pattern) => pattern.regex.test(value));
        if (!permitted) {
                throw new Error(
                        `brAInwav kernel policy violation: ${surface} request "${value}" is not in the allow list`,
                );
        }
}

function compilePatterns(patterns: string[]): CompiledPattern[] {
        return patterns.map((raw) => ({ raw, regex: globToRegex(raw) }));
}

function globToRegex(glob: string): RegExp {
        const normalized = toPosixPath(glob.trim());
        let pattern = '^';
        let index = 0;
        while (index < normalized.length) {
                const char = normalized[index];
                if (char === '*') {
                        const next = normalized[index + 1];
                        if (next === '*') {
                                const afterDouble = normalized[index + 2];
                                if (afterDouble === '/') {
                                        pattern += '(?:.*/)?';
                                        index += 3;
                                        continue;
                                }
                                pattern += '.*';
                                index += 2;
                                continue;
                        }
                        pattern += '[^/]*';
                        index += 1;
                        continue;
                }
                if (char === '?') {
                        pattern += '[^/]';
                        index += 1;
                        continue;
                }
                pattern += escapeRegexChar(char);
                index += 1;
        }
        pattern += '$';
        return new RegExp(pattern);
}

function escapeRegexChar(char: string): string {
        return /[.+^${}()|[\]\\]/.test(char) ? `\\${char}` : char;
}

function toPosixPath(value: string): string {
        return value.replace(/\\/g, '/');
}

function resolveWithin(base: string, candidate: string): string {
        const resolved = path.resolve(base, candidate);
        const normalizedBase = path.resolve(base);
        const baseWithSep = normalizedBase.endsWith(path.sep)
                ? normalizedBase
                : `${normalizedBase}${path.sep}`;
        if (resolved !== normalizedBase && !resolved.startsWith(baseWithSep)) {
                throw new Error(
                        `brAInwav kernel policy violation: filesystem request resolved outside permitted root`,
                );
        }
        return resolved;
}
