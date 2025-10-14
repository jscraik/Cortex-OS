import type { RouterConfig } from "../schemas";

export function withBudgets<T>(executor: () => Promise<T>, cfg: RouterConfig) {
  return async () => {
    const result = await executor();
    if (typeof result === "object" && result && "usage" in (result as any)) {
      const usage = (result as any).usage;
      const max = cfg.routing.budgets.request.max_output_tokens;
      if (typeof usage?.output_tokens === "number" && usage.output_tokens > max) {
        usage.output_tokens = max;
      }
    }
    return result;
  };
}
