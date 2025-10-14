import type { RouteDecision } from "../routing/engine";

type RunResult = {
  output: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
};

export async function run(input: string, route: RouteDecision): Promise<RunResult> {
  const outputTokens = Math.max(route.stats.out_tokens, route.stats.in_tokens);
  return {
    output: `[ollama] ${input}`.trim(),
    usage: {
      input_tokens: route.stats.in_tokens,
      output_tokens: outputTokens,
      total_tokens: route.stats.in_tokens + outputTokens,
    },
  };
}
