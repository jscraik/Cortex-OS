import { decideRoute } from "./routing/engine";
import { piiScrub } from "./privacy/pii";
import { withBudgets } from "./budget/budgets";
import { withCircuitBreakers } from "./budget/circuits";
import { tracer, meter } from "@cortex/telemetry";

export async function routeByTier(req: {
  id: string;
  model_hint?: string;
  input: string;
  tools?: string[];
  context?: Record<string, unknown>;
}, cfg: any) {
  const span = tracer.startSpan("route.request", { attributes: {
    "gen_ai.request.model_hint": req.model_hint ?? "auto",
    "gen_ai.request.input_size": req.input?.length ?? 0
  }});

  try {
    const t0 = performance.now();

    const scrubbed = cfg.routing?.privacy?.pii_scrub
      ? await piiScrub(req.input, cfg)
      : req.input;

    const route = decideRoute({ ...req, input: scrubbed }, cfg);

    const invoke = withCircuitBreakers(withBudgets(async () => {
      switch (route.tier) {
        case "mlx":
          const mlx = await import("./tiers/mlx");
          return mlx.run(scrubbed, route);
        case "ollama":
          const oll = await import("./tiers/ollama");
          return oll.run(scrubbed, route);
        default:
          const cloud = await import("./tiers/cloud");
          return cloud.run(scrubbed, route);
      }
    }, cfg), cfg);

    const res = await invoke();

    const dt = performance.now() - t0;
    span.setAttribute("gen_ai.latency.last_token_ms", Math.round(dt));
    meter.createCounter("gen_ai.tokens.in").add(route.stats.in_tokens);
    meter.createCounter("gen_ai.tokens.out").add(route.stats.out_tokens);
    span.end();
    return { ...res, route };
  } catch (e: any) {
    span.recordException(e);
    span.end();
    throw e;
  }
}
