import type { LocalEnv } from "@cortex-os/simlab-env/local-counter";
export type RuleAgent = { decide(s: unknown): Promise<"inc"|"dec"> };
export function greedyToTarget(): RuleAgent {
  return { async decide(s) { const { n, target } = s as LocalEnv["reset"] extends ()=>Promise<infer X> ? X : never; return n < target ? "inc" : "dec"; } };
}

