import type { Scenario, Transition } from "@cortex-os/simlab-contracts/scenario";
import { mulberry32 } from "./rng.js";

export type EnvLike = { reset(): Promise<any>; step(a:any): Promise<{ ctx:any; reward:number; done:boolean }> };
export type AgentLike = { decide(s:any): Promise<any> };
export type RunResult = { scenarioId: string; transitions: Transition[]; totalReward: number; seed: number };

export async function runScenario(s: Scenario, env: EnvLike, agent: AgentLike): Promise<RunResult> {
  const rnd = mulberry32(s.seed.value); rnd(); // burn one for parity
  const transitions: Transition[] = [] as any;
  let state = await env.reset(); let total = 0;
  for (let t = 0; t < s.steps; t++) {
    const action = await agent.decide(state);
    const { ctx, reward, done } = await env.step(action);
    transitions.push({ t, state, action, reward, done } as any);
    total += reward; state = ctx; if (done) break;
  }
  return { scenarioId: s.id, transitions, totalReward: Number(total.toFixed(6)), seed: s.seed.value };
}

