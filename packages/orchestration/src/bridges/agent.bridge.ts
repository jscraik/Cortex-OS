import { Executor } from "@cortex-os/agents";
import type { Agent } from "@cortex-os/agents";
import type { Step } from "../domain/types.js";

export class AgentBridge {
  constructor(private exec: Executor, private getAgent: (id: string) => Agent | undefined) {}
  async run(step: Step, taskId: string, input: unknown) {
    const agent = this.getAgent(step.agentId!);
    if (!agent) throw new Error(`AGENT_NOT_FOUND:${step.agentId}`);
    return this.exec.run(agent, {
      id: taskId,
      kind: "custom",
      input,
      budget: { wallClockMs: step.timeoutMs ?? 30_000, maxSteps: 16 },
    });
  }
}

