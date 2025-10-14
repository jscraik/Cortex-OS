import type { RouterConfig } from "../schemas";

function maxTimeout(cfg: RouterConfig): number {
  const { mlx, ollama, cloud } = cfg.routing.circuit_breakers.timeouts_ms;
  return Math.max(mlx, ollama, cloud);
}

export function withCircuitBreakers<T>(executor: () => Promise<T>, cfg: RouterConfig) {
  const timeoutMs = maxTimeout(cfg);
  return async () => {
    let timer: NodeJS.Timeout | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("route_timeout_exceeded")), timeoutMs);
      });
      return await Promise.race([executor(), timeoutPromise]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  };
}
