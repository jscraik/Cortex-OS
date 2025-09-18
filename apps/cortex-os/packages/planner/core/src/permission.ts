import { hasTty } from '@cortex-os/utils';
import chalk from 'chalk';
import { configManager } from './config.js';

/**
 * Permission engine controlling privileged operations such as shell execution
 * and file writes. Communication is limited to ConfigManager and provided
 * context objects.
 */

export type PermissionMode = 'plan' | 'ask' | 'auto';

export interface GuardContext {
	modeOverride?: PermissionMode;
	prompter?: (message: string) => Promise<boolean>;
	logger?: {
		info: (msg: string) => void;
		warn: (msg: string) => void;
	};
}

async function getModeFromConfig(): Promise<PermissionMode> {
	const cfgMode = (await configManager.getValue('permissions.mode')) as PermissionMode | undefined;
	const env = String(
		(globalThis as { process?: NodeJS.Process }).process?.env?.CORTEX_PERMISSION_MODE || '',
	).toLowerCase();
	const envMode = (['plan', 'ask', 'auto'] as const).includes(env as PermissionMode)
		? (env as PermissionMode)
		: undefined;
	return envMode || cfgMode || 'ask';
}

async function defaultPrompt(message: string): Promise<boolean> {
	const proc = (globalThis as { process?: NodeJS.Process }).process;
	// Check for Node.js process, interactive TTY, and required methods
	if (
		!proc?.stdin ||
		!proc?.stdout ||
		typeof proc.stdin.once !== 'function' ||
		typeof proc.stdin.off !== 'function' ||
		typeof proc.stdout.write !== 'function' ||
		!hasTty(proc)
	) {
		return false;
	}
	return await new Promise<boolean>((resolve) => {
		try {
			proc.stdout.write(`${message} (y/N) `);
			const onData = (chunk: unknown) => {
				const ans = String(chunk ?? '').trim();
				proc.stdin.off?.('data', onData);
				resolve(/^y(es)?$/i.test(ans));
			};
			proc.stdin.once('data', onData);
		} catch {
			resolve(false);
		}
	});
}

export async function getMode(ctx?: GuardContext): Promise<PermissionMode> {
	if (ctx?.modeOverride) return ctx.modeOverride;
	return getModeFromConfig();
}

export async function setMode(mode: PermissionMode): Promise<void> {
	await configManager.set('permissions.mode', mode);
}

export async function guardShell<T>(
	description: string,
	exec: () => Promise<T>,
	ctx?: GuardContext,
): Promise<{ executed: boolean; result?: T }> {
	const logger = ctx?.logger || { info: console.log, warn: console.warn };
	const mode = await getMode(ctx);
	if (mode === 'plan') {
		logger.warn(chalk.yellow(`PLAN MODE – would execute: ${description}`));
		return { executed: false };
	}
	if (mode === 'ask') {
		const prompt = ctx?.prompter || defaultPrompt;
		const ok = await prompt(`Execute: ${description}?`);
		if (!ok) {
			logger.warn(chalk.yellow('Operation cancelled by user'));
			return { executed: false };
		}
	}
	const result = await exec();
	return { executed: true, result };
}

export async function guardWrite<T>(
	preview: string,
	apply: () => Promise<T>,
	ctx?: GuardContext,
): Promise<{ executed: boolean; result?: T }> {
	const logger = ctx?.logger || { info: console.log, warn: console.warn };
	const mode = await getMode(ctx);
	if (mode === 'plan') {
		logger.warn(chalk.yellow('PLAN MODE – would write changes:'));
		logger.info(preview);
		return { executed: false };
	}
	if (mode === 'ask') {
		const prompt = ctx?.prompter || defaultPrompt;
		const ok = await prompt('Apply these changes?');
		if (!ok) {
			logger.warn(chalk.yellow('Write cancelled by user'));
			return { executed: false };
		}
	}
	const result = await apply();
	return { executed: true, result };
}
