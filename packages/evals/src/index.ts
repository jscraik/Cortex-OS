import type { z } from 'zod';
import { type RagDeps, ragSuite } from './suites/rag.js';
import { type RedteamDeps, redteamSuite } from './suites/redteam.js';
import { type PromptDeps, promptSuite } from './suites/promptfoo.js';
import { type McpToolsDeps, mcpToolsSuite } from './suites/mcp-tools.js';
import { type Router, routerSuite } from './suites/router.js';
import { GateConfigSchema, type GateResult, type SuiteOutcome } from './types.js';

interface SuiteDef<O, D> {
	optionsSchema: z.ZodType<O>;
	run: (name: string, opts: O, deps: D) => Promise<SuiteOutcome>;
}

const suiteRegistry = {
        rag: ragSuite,
        router: routerSuite,
        prompt: promptSuite,
        redteam: redteamSuite,
        mcpTools: mcpToolsSuite,
} as const;

type SuiteDeps = {
        rag: RagDeps;
        router: Router;
        prompt: PromptDeps;
        redteam: RedteamDeps;
        mcpTools: McpToolsDeps;
};

export async function runGate(config: unknown, deps: SuiteDeps): Promise<GateResult> {
	const startedAt = new Date().toISOString();
	const cfg = GateConfigSchema.parse(config);

	const outcomes: SuiteOutcome[] = [];
	for (const s of cfg.suites.filter((x) => x.enabled)) {
		const suite = (suiteRegistry as Record<string, SuiteDef<unknown, unknown>>)[s.name];
		if (!suite) throw new Error(`Unknown suite: ${s.name}`);
		const rawOptions: Record<string, unknown> = {
			...s.options,
			thresholds: s.thresholds,
		};
		if (s.name === 'rag') {
			rawOptions.dataset = rawOptions.dataset ?? cfg.dataset;
		}
		const parsed = suite.optionsSchema.parse(rawOptions);
		const dep = (deps as Record<string, unknown>)[s.name];
		if (dep === undefined) {
			throw new Error(`Missing required dependency for suite: ${s.name}`);
		}
		outcomes.push(await suite.run(s.name, parsed as never, dep));
	}

	const pass = outcomes.every((o) => o.pass);
	const finishedAt = new Date().toISOString();
	return { pass, outcomes, startedAt, finishedAt } satisfies GateResult;
}

// A2A Bus for native communication
export {
	createEvalsBus,
	createEvalsSchemaRegistry,
	type EvalsBusConfig,
} from './a2a.js';
// A2A Events
export {
	type BenchmarkResultEvent,
	createEvalsEvent,
	type EvaluationCompletedEvent,
	type EvaluationStartedEvent,
	type TestCaseExecutedEvent,
} from './events/evals-events.js';

// MCP Integration
export { evalsMcpTools } from './mcp/tools.js';
export type { GateConfig, GateResult } from './types.js';
