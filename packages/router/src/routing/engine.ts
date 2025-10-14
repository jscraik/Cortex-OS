import type { RouterConfig } from "../schemas";

type Tier = "mlx" | "ollama" | "cloud";

interface RouteContext {
  id: string;
  input: string;
  model_hint?: string;
  tools?: string[];
  context?: Record<string, unknown>;
}

interface RouteStats {
  in_tokens: number;
  out_tokens: number;
}

export interface RouteDecision {
  tier: Tier;
  stats: RouteStats;
}

function approximateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function firstAllowedTier(tools: string[] | undefined, cfg: RouterConfig): Tier | undefined {
  if (!tools?.length) return undefined;
  for (const tool of tools) {
    const allowed = cfg.routing.capability.tool_allowed_tiers[tool];
    if (allowed?.length) {
      const [preferred] = allowed as Tier[];
      return preferred;
    }
  }
  return undefined;
}

export function decideRoute(req: RouteContext, cfg: RouterConfig): RouteDecision {
  const tokens = approximateTokens(req.input ?? "");
  const tierFromTools = firstAllowedTier(req.tools, cfg);

  let tier: Tier = tierFromTools ?? "mlx";

  if (!tierFromTools && req.model_hint && !cfg.routing.capability.local_ok_models.includes(req.model_hint)) {
    tier = "ollama";
  }

  if (tokens > cfg.routing.budgets.request.max_input_tokens || tier === "cloud") {
    tier = "cloud";
  } else if (tokens > cfg.routing.budgets.request.max_output_tokens && tier === "mlx") {
    tier = "ollama";
  }

  return {
    tier,
    stats: {
      in_tokens: tokens,
      out_tokens: Math.min(tokens, cfg.routing.budgets.request.max_output_tokens),
    },
  };
}
