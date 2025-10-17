import { oauth2Scheme } from '@cortex-os/mcp-auth';
import { withSpan } from '@cortex-os/mcp-bridge/runtime/telemetry/tracing';
import { execa } from 'execa';
import type { FastMCP } from 'fastmcp';
import path from 'node:path';
import { z } from 'zod';
import { createBrandedLog } from '../utils/brand.js';

const PATCH_TOOL_NAME = 'code.patch';
const CODEBASE_ROOT = process.env.CODEBASE_ROOT || process.cwd();
const MAX_PATCH_BYTES = Number.parseInt(process.env.MCP_MAX_PATCH_BYTES ?? '20000', 10);
const MAX_FILES_PER_PATCH = Number.parseInt(process.env.MCP_MAX_PATCH_FILES ?? '10', 10);

const StructuredPatchInputSchema = z.object({
	patch: z
		.string()
		.min(1, 'Patch payload is required')
		.max(MAX_PATCH_BYTES, `Patch exceeds ${MAX_PATCH_BYTES} bytes`),
	dryRun: z.boolean().optional().default(false),
	allowCreate: z.boolean().optional().default(false),
	allowDelete: z.boolean().optional().default(false),
});

type StructuredPatchInput = z.infer<typeof StructuredPatchInputSchema>;

type PatchTarget = {
	original: string;
	resolved: string;
	isNewFile: boolean;
	isDeletion: boolean;
};

export function registerStructuredPatchTool(server: FastMCP, logger: any) {
	server.addTool({
		name: PATCH_TOOL_NAME,
		description:
			'Apply a unified diff to the repository. Validates with git apply before mutating the workspace.',
		parameters: StructuredPatchInputSchema,
		securitySchemes: [oauth2Scheme(['code.write'])],
		annotations: {
			readOnlyHint: false,
			idempotentHint: false,
			title: 'brAInwav Structured Patch',
		},
		async execute(args: StructuredPatchInput) {
			return withSpan('mcp.tool.code.patch', { 'mcp.tool': PATCH_TOOL_NAME }, async () => {
				const { patch, dryRun, allowCreate, allowDelete } = args;
				logger.info(
					createBrandedLog('code.patch_attempt', { dryRun, allowCreate, allowDelete }),
					'Validating patch request',
				);
				const targets = extractTargets(patch, allowCreate, allowDelete);
				await runGitApply('--check', patch, targets, logger);
				if (dryRun) {
					return JSON.stringify(
						{
							applied: false,
							dryRun: true,
							targets: targets.map((target) => ({
								path: target.original,
								newFile: target.isNewFile,
								deleted: target.isDeletion,
							})),
							message: 'Patch validated successfully (dry run).',
						},
						null,
						2,
					);
				}

				await runGitApply(undefined, patch, targets, logger);
				const status = await git(['status', '--short', '--', ...targets.map((t) => t.original)]);
				const diff = await git(['diff', '--', ...targets.map((t) => t.original)]);
				logger.info(
					createBrandedLog('code.patch_applied', { files: targets.length }),
					'Patch applied successfully',
				);
				return JSON.stringify(
					{
						applied: true,
						filesChanged: targets.map((target) => ({
							path: target.original,
							newFile: target.isNewFile,
							deleted: target.isDeletion,
						})),
						gitStatus: status.trim(),
						diff: diff.slice(0, 8000),
						message: 'Patch applied. Review git status and diff before committing.',
					},
					null,
					2,
				);
			});
		},
	});
}

function extractTargets(patch: string, allowCreate: boolean, allowDelete: boolean): PatchTarget[] {
	const targets = new Map<string, PatchTarget>();
	const lines = patch.split(/\r?\n/);
	let pendingOldPath: string | undefined;
	for (const line of lines) {
		if (line.startsWith('--- ')) {
			pendingOldPath = normalizePatchPath(line.slice(4));
			continue;
		}
		if (!line.startsWith('+++ ')) {
			continue;
		}
		const newPath = normalizePatchPath(line.slice(4));
		const oldPath = pendingOldPath;
		pendingOldPath = undefined;
		if (oldPath && newPath && oldPath !== newPath) {
			throw new Error('Patch attempts to rename files; renames are not supported by code.patch.');
		}
		const targetPath = newPath ?? oldPath;
		if (!targetPath) {
			continue;
		}
		const resolved = resolveSafePath(targetPath);
		const key = targetPath;
		let entry = targets.get(key);
		if (!entry) {
			entry = {
				original: targetPath,
				resolved,
				isNewFile: Boolean(newPath && !oldPath),
				isDeletion: Boolean(oldPath && !newPath),
			};
			targets.set(key, entry);
		} else {
			entry.isNewFile = entry.isNewFile || Boolean(newPath && !oldPath);
			entry.isDeletion = entry.isDeletion || Boolean(oldPath && !newPath);
		}
	}

	if (targets.size === 0) {
		throw new Error('Patch did not include any file paths. Ensure it is a unified diff.');
	}
	if (targets.size > MAX_FILES_PER_PATCH) {
		throw new Error(`Patch touches ${targets.size} files, exceeding limit of ${MAX_FILES_PER_PATCH}.`);
	}
	if (!allowCreate) {
		const creates = Array.from(targets.values()).filter((target) => target.isNewFile);
		if (creates.length > 0) {
			throw new Error('Patch would create new files, but allowCreate is false.');
		}
	}
	if (!allowDelete) {
		const deletions = Array.from(targets.values()).filter((target) => target.isDeletion);
		if (deletions.length > 0) {
			throw new Error('Patch would delete files, but allowDelete is false.');
		}
	}
	return Array.from(targets.values());
}

function normalizePatchPath(label: string): string | undefined {
	const trimmed = label.trim();
	if (trimmed === '/dev/null') {
		return undefined;
	}
	const withoutPrefix = trimmed.replace(/^[ab]\//, '');
	return withoutPrefix;
}

function resolveSafePath(relativePath: string): string {
	if (path.isAbsolute(relativePath)) {
		throw new Error('Patch paths must be relative.');
	}
	if (relativePath.includes('..')) {
		throw new Error(`Patch path '${relativePath}' contains parent directory traversal.`);
	}
	const resolved = path.resolve(CODEBASE_ROOT, relativePath);
	const relative = path.relative(CODEBASE_ROOT, resolved);
	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		throw new Error(`Patch path '${relativePath}' resolves outside of repository root.`);
	}
	return resolved;
}

async function runGitApply(
	mode: '--check' | undefined,
	patch: string,
	targets: PatchTarget[],
	logger: any,
): Promise<void> {
	const args = ['apply', '--whitespace=nowarn'];
	if (mode) {
		args.push(mode);
	}
	try {
		await execa('git', args, {
			cwd: CODEBASE_ROOT,
			input: patch,
			reject: true,
		});
	} catch (error) {
		logger.error(
			createBrandedLog('code.patch_failed', {
				error: error instanceof Error ? error.message : String(error),
				mode: mode ?? 'apply',
				files: targets.map((target) => target.original),
			}),
			'git apply failed',
		);
		throw new Error(
			`git apply ${mode ?? ''} rejected the patch. Ensure the diff is up to date and clean. Message: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

async function git(args: string[]): Promise<string> {
	const { stdout } = await execa('git', args, { cwd: CODEBASE_ROOT, reject: false });
	return stdout;
}
