import { randomUUID } from 'node:crypto';
import path from 'node:path';

// Dynamic import to avoid TS rootDir cross-package issues
type SimpleLogger = {
	info: (obj: unknown, msg?: string) => void;
	error: (obj: unknown, msg?: string) => void;
};
const dynImport = new Function('m', 'return import(m)') as (m: string) => Promise<unknown>;
async function getLogger(): Promise<SimpleLogger> {
	try {
		const obs = (await dynImport('@cortex-os/observability')) as {
			createLogger: (c: string) => SimpleLogger;
		};
		return obs.createLogger('commands');
	} catch {
		// Fallback console-like logger
		return {
			info: (obj: unknown, msg?: string) => console.log('[commands][info]', msg ?? '', obj),
			error: (obj: unknown, msg?: string) => console.error('[commands][error]', msg ?? '', obj),
		} satisfies SimpleLogger;
	}
}
function generateRunIdLight(): string {
	const suffix = randomUUID().split('-')[0];
	return `run-${Date.now().toString(36)}-${suffix}`;
}

import { isBashAllowed, isFileAllowed } from './security.js';
import type { LoadedCommand, RenderContext, RunResult } from './types.js';

const DEFAULT_INCLUDE_LIMIT = 100 * 1024; // 100KB per file
const DEFAULT_TOTAL_LIMIT = 1024 * 1024; // 1MB total

export async function renderTemplate(
	template: string,
	args: string[],
	ctx: RenderContext,
	allowTools?: string[],
): Promise<string> {
	// 1) Substitute arguments
	let out = substituteArgs(template, args);

	// 2) Expand !`cmd` blocks
	out = await expandBangs(out, ctx, allowTools);

	// 3) Expand @path inclusions
	out = await expandAtRefs(out, ctx);

	return out;
}

function substituteArgs(tpl: string, args: string[]): string {
	let out = tpl.replaceAll('$ARGUMENTS', args.join(' '));
	for (let i = 0; i < args.length; i++) {
		const token = `$${i + 1}`;
		out = out.split(token).join(args[i]);
	}
	return out;
}

async function expandBangs(
	tpl: string,
	ctx: RenderContext,
	allowTools?: string[],
): Promise<string> {
	const re = /!`([^`]+)`/g;
	if (!ctx.runBashSafe) return tpl.replace(re, (_full, cmd: string) => `<bash-denied:${cmd}>`);
	const chunks: Array<Promise<string> | string> = [];
	let lastIndex = 0;
	for (const match of Array.from(tpl.matchAll(re))) {
		const full = match[0];
		const cmd = match[1] ?? '';
		const mIndex = match.index ?? 0;
		chunks.push(tpl.slice(lastIndex, mIndex));
		lastIndex = mIndex + full.length;
		if (!isBashAllowed(cmd, allowTools)) {
			chunks.push(`<bash-denied:${cmd}>`);
			continue;
		}
		chunks.push(
			(async () => {
				if (!ctx.runBashSafe) return '<bash-disabled>';
				const res = await ctx.runBashSafe(cmd, allowTools || []);
				return res.stdout.trim();
			})(),
		);
	}
	chunks.push(tpl.slice(lastIndex));
	const resolved = await Promise.all(
		chunks.map(async (c) => (typeof c === 'string' ? c : await c)),
	);
	return resolved.join('');
}

async function expandAtRefs(tpl: string, ctx: RenderContext): Promise<string> {
	const re = /@([^\s`]+)(?:`|\b)/g; // matches @path or @path`
	if (!ctx.readFileCapped) return tpl;
	const maxPer = ctx.timeoutMs ?? DEFAULT_INCLUDE_LIMIT;
	const totalCap = ctx.maxIncludeBytes ?? DEFAULT_TOTAL_LIMIT;
	let consumed = 0;

	const chunks: Array<Promise<string> | string> = [];
	let lastIndex = 0;
	for (const match of Array.from(tpl.matchAll(re))) {
		const full = match[0];
		const ref = match[1] ?? '';
		const mIndex = match.index ?? 0;
		chunks.push(tpl.slice(lastIndex, mIndex));
		lastIndex = mIndex + full.length;
		const abs = path.resolve(ctx.cwd, ref);
		if (!isFileAllowed(abs, ctx.fileAllowlist)) {
			chunks.push(`<file-denied:${ref}>`);
			continue;
		}
		chunks.push(
			(async () => {
				const remaining = totalCap - consumed;
				if (remaining <= 0) return '<file-limit-exceeded>';
				const cap = Math.min(maxPer, remaining);
				if (!ctx.readFileCapped) return '<file-disabled>';
				const content = await ctx.readFileCapped(abs, cap, ctx.fileAllowlist || []);
				consumed += Math.min(Buffer.byteLength(content), cap);
				return content;
			})(),
		);
	}
	chunks.push(tpl.slice(lastIndex));
	const resolved = await Promise.all(
		chunks.map(async (c) => (typeof c === 'string' ? c : await c)),
	);
	return resolved.join('');
}

export async function runCommand(
	cmd: LoadedCommand,
	args: string[],
	ctx: RenderContext,
): Promise<RunResult> {
	const logger = await getLogger();
	const runId = generateRunIdLight();
	const startedAt = Date.now();
	logger.info({ runId, command: cmd.name, scope: cmd.scope, args }, 'command.start');
	const commandMetadata = {
		name: cmd.name,
		description: cmd.description,
		argumentHint: cmd.argumentHint,
		model: cmd.model,
		allowedTools: cmd.allowedTools,
		scope: cmd.scope,
		filePath: cmd.filePath,
	} satisfies Record<string, unknown>;
	const mergeMetadata = (existing?: Record<string, unknown>): Record<string, unknown> => {
		const merged: Record<string, unknown> = existing ? { ...existing } : {};
		const existingCommandRaw = existing?.['command'];
		const existingCommand =
			typeof existingCommandRaw === 'object' &&
			existingCommandRaw &&
			!Array.isArray(existingCommandRaw)
				? (existingCommandRaw as Record<string, unknown>)
				: undefined;
		merged.command = {
			...commandMetadata,
			...existingCommand,
		};
		return merged;
	};
	try {
		if (cmd.execute) {
			const res = await cmd.execute(args, ctx);
			const metadata = mergeMetadata(res.metadata);
			logger.info({ runId, durationMs: Date.now() - startedAt }, 'command.success');
			return {
				...res,
				metadata,
			};
		}
		const template = cmd.template ?? '';
		const prompt = await renderTemplate(template, args, ctx, cmd.allowedTools);
		logger.info({ runId, durationMs: Date.now() - startedAt }, 'command.success');
		return { text: prompt, metadata: mergeMetadata() };
	} catch (err) {
		logger.error({ runId, durationMs: Date.now() - startedAt, err }, 'command.error');
		throw err;
	}
}
