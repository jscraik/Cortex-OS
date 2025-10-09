import { durationToMs } from '../server/warmup.js';
import type { HybridConfig } from './hybrid.js';
import {
	deriveOllamaPrewarmModels,
	resolveOllamaHealthEndpoint,
	selectOllamaModelForTask,
} from './hybrid.js';

export type OllamaConfig = {
	baseUrl: string;
	defaultModel: string;
	keepAlive: string | number;
	prewarmModels: string[];
	heartbeatInterval: string | number;
	watchdogIdleMs: number;
	requiredModels: string[];
	healthEndpoint?: string;
	defaults: {
		tool_calling?: string;
		embedding?: string;
		chat?: string;
	};
};

const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2';
const DEFAULT_KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE_DEFAULT ?? '5m';
const DEFAULT_HEARTBEAT = process.env.OLLAMA_PING_EVERY ?? '4m30s';
const DEFAULT_WATCHDOG_IDLE = durationToMs(process.env.OLLAMA_STREAM_IDLE ?? '2s') || 2_000;

function collectEnvPrewarm(): string[] {
	const fromEnv = process.env.OLLAMA_PREWARM_MODELS;
	if (!fromEnv) {
		return [];
	}
	return fromEnv
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

export function loadOllamaConfig(hybrid?: HybridConfig | null): OllamaConfig {
	const hybridConfig = hybrid ?? null;
	const derived = hybridConfig ? deriveOllamaPrewarmModels(hybridConfig) : [];
	const envOverrides = collectEnvPrewarm();
	const prewarmModels = Array.from(new Set([...derived, ...envOverrides]));
	const requiredModels =
		hybridConfig?.enforcement?.deployment_enforcement?.required_models?.ollama ?? [];
	const healthEndpoint = hybridConfig ? resolveOllamaHealthEndpoint(hybridConfig) : undefined;

	return {
		baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
		defaultModel: DEFAULT_MODEL,
		keepAlive: DEFAULT_KEEP_ALIVE,
		prewarmModels,
		heartbeatInterval: DEFAULT_HEARTBEAT,
		watchdogIdleMs: DEFAULT_WATCHDOG_IDLE,
		requiredModels,
		healthEndpoint,
		defaults: {
			tool_calling: selectOllamaModelForTask(hybridConfig ?? null, 'tool_calling'),
			embedding: selectOllamaModelForTask(hybridConfig ?? null, 'embedding'),
			chat: selectOllamaModelForTask(hybridConfig ?? null, 'chat'),
		},
	};
}
