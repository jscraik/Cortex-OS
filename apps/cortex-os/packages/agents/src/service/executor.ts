import { taskZ } from "../schemas/task.zod.js";
import type { Agent } from "../ports/Agent.js";
import type { Task, Result, Budget } from "../domain/types.js";

export type Executor = (agent: Agent, rawTask: unknown) => Promise<Result>;

export const createExecutor = (
  wrap: (h: (t: Task) => Promise<Result>) => (t: Task) => Promise<Result>
): Executor => async (agent, rawTask) => {
  const task = taskZ.parse(rawTask);
  const handler = wrap(async (t: Task) => {
    const started = Date.now();
    let steps = 0;
    const budget: Budget = t.budget;
    if (agent.plan) {
      const subs = await agent.plan(t);
      for (const st of subs) {
        steps++;
        if (steps > budget.maxSteps)
          return budgetExhausted(t, started, steps);
        await agent.act(st);
      }
    }
    const res = await agent.act(t);
    res.usage = {
      ...(res.usage ?? {}),
      steps,
      durationMs: Date.now() - started,
    };
    return res;
  });
  return handler(task);
};

function budgetExhausted(t: Task, started: number, steps: number): Result {
  return {
    taskId: t.id,
    ok: false,
    error: { code: "BUDGET_EXHAUSTED", message: "maxSteps reached" },
    usage: { steps, durationMs: Date.now() - started },
  };
};

