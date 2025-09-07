import { z } from "zod";
import { ragSuite, type RagDeps } from "./suites/rag";
import { routerSuite, type Router } from "./suites/router";
import { GateConfigSchema, type GateResult, type SuiteOutcome } from "./types";

interface SuiteDef<O, D> {
        optionsSchema: z.ZodType<O>;
        run: (name: string, opts: O, deps: D) => Promise<SuiteOutcome>;
}

const suiteRegistry = {
        rag: ragSuite,
        router: routerSuite,
} as const;

type SuiteDeps = {
        rag: RagDeps;
        router: Router;
};

export async function runGate(
        config: unknown,
        deps: SuiteDeps,
): Promise<GateResult> {
        const startedAt = new Date().toISOString();
        const cfg = GateConfigSchema.parse(config);

        const outcomes: SuiteOutcome[] = [];
        for (const s of cfg.suites.filter((x) => x.enabled)) {
                const suite = (suiteRegistry as Record<string, SuiteDef<unknown, unknown>>)[s.name];
                if (!suite) throw new Error(`Unknown suite: ${s.name}`);
                const rawOptions: Record<string, unknown> = { ...s.options, thresholds: s.thresholds };
                if (s.name === "rag") {
                        rawOptions.dataset = rawOptions.dataset ?? cfg.dataset;
                }
                const parsed = suite.optionsSchema.parse(rawOptions);
                const dep = (deps as Record<string, unknown>)[s.name];
                if (dep === undefined) {
                        throw new Error(`Missing required dependency for suite: ${s.name}`);
                }
                outcomes.push(
                        await suite.run(s.name, parsed as never, dep),
                );
        }

        const pass = outcomes.every((o) => o.pass);
        const finishedAt = new Date().toISOString();
        return { pass, outcomes, startedAt, finishedAt } satisfies GateResult;
}

export type { GateConfig, GateResult } from "./types";
