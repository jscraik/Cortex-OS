import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import type { Logger } from 'pino';
import { z } from 'zod';
import { createBrandedLog } from '../utils/brand.js';

const StrategySchema = z.object({
	hybrid_routing_strategy: z
		.object({
			routing_rules: z
				.object({
					tool_calling_tasks: z
						.object({
							primary: z.string().optional(),
							models: z.array(z.string()).optional(),
						})
						.optional(),
					embedding_tasks: z
						.object({
							primary: z.string().optional(),
							models: z.array(z.string()).optional(),
						})
						.optional(),
					chat_tasks: z
						.object({
							primary: z.string().optional(),
							models: z.array(z.string()).optional(),
						})
						.optional(),
				})
				.partial()
				.optional(),
		})
		.optional(),
});

const EnforcementSchema = z.object({
	deployment_enforcement: z
		.object({
			required_models: z
				.object({
					ollama: z.array(z.string()).optional(),
				})
				.optional(),
			health_checks: z
				.object({
					ollama_service: z.string().optional(),
				})
				.optional(),
		})
		.optional(),
});

export type HybridConfig = {
	strategy: z.infer<typeof StrategySchema> | null;
	enforcement: z.infer<typeof EnforcementSchema> | null;
};

const STRATEGY_PATH = process.env.CORTEX_HYBRID_STRATEGY ?? 'config/hybrid-model-strategy.json';
const ENFORCEMENT_PATH =
	process.env.CORTEX_HYBRID_ENFORCEMENT ?? 'config/hybrid-model-enforcement.json';

function resolveConfigPath(path: string): string | null {
	if (isAbsolute(path) && existsSync(path)) {
		return path;
	}
	const candidates = [
		process.cwd(),
		resolve(process.cwd(), '..'),
		resolve(process.cwd(), '..', '..'),
		process.env.CORTEX_REPO_ROOT,
	].filter(Boolean) as string[];

	for (const base of candidates) {
		const candidate = resolve(base, path);
		if (existsSync(candidate)) {
			return candidate;
		}
	}
	return null;
}

function readOptionalJson(path: string, logger?: Logger) {
	try {
		const resolved = resolveConfigPath(path);
		if (!resolved) {
			logger?.debug(
				createBrandedLog('hybrid_config_missing', { path }),
				'Hybrid configuration file not found',
			);
			return null;
		}
		const contents = readFileSync(resolved, 'utf8');
		return JSON.parse(contents) as unknown;
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
			logger?.debug(
				createBrandedLog('hybrid_config_missing', { path }),
				'Hybrid configuration file not found',
			);
			return null;
		}
		throw error;
	}
}

export function loadHybridConfig(logger?: Logger): HybridConfig {
	const rawStrategy = readOptionalJson(STRATEGY_PATH, logger);
	const rawEnforcement = readOptionalJson(ENFORCEMENT_PATH, logger);

	const strategy = rawStrategy ? StrategySchema.safeParse(rawStrategy) : { success: false };
	if (strategy.success === false && rawStrategy) {
		logger?.warn(
			createBrandedLog('hybrid_strategy_invalid'),
			'Hybrid routing strategy JSON failed validation',
		);
	}

	const enforcement = rawEnforcement
		? EnforcementSchema.safeParse(rawEnforcement)
		: { success: false };
	if (enforcement.success === false && rawEnforcement) {
		logger?.warn(
			createBrandedLog('hybrid_enforcement_invalid'),
			'Hybrid enforcement JSON failed validation',
		);
	}

	return {
		strategy: strategy.success ? strategy.data : null,
		enforcement: enforcement.success ? enforcement.data : null,
	};
}

export function deriveOllamaPrewarmModels(config: HybridConfig): string[] {
	const required = config.enforcement?.deployment_enforcement?.required_models?.ollama ?? [];
	const toolModels =
		config.strategy?.hybrid_routing_strategy?.routing_rules?.tool_calling_tasks?.models ?? [];
	const embeddingModels =
		config.strategy?.hybrid_routing_strategy?.routing_rules?.embedding_tasks?.models ?? [];
	return Array.from(new Set([...required, ...toolModels, ...embeddingModels])).filter(Boolean);
}

export function selectOllamaModelForTask(
	config: HybridConfig | null,
	task: 'tool_calling' | 'embedding' | 'chat',
): string | undefined {
	if (!config) {
		return undefined;
	}
	const rules = config.strategy?.hybrid_routing_strategy?.routing_rules;
	if (!rules) {
		return undefined;
	}
	if (task === 'tool_calling') {
		return rules.tool_calling_tasks?.primary ?? rules.tool_calling_tasks?.models?.[0];
	}
	if (task === 'embedding') {
		return rules.embedding_tasks?.primary ?? rules.embedding_tasks?.models?.[0];
	}
	return rules.chat_tasks?.primary ?? rules.chat_tasks?.models?.[0];
}

export function resolveOllamaHealthEndpoint(config: HybridConfig): string | undefined {
	return config.enforcement?.deployment_enforcement?.health_checks?.ollama_service;
}
