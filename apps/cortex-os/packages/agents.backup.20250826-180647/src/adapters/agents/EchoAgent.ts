import type { Agent } from "../../ports/Agent.js";
import type { AgentSpec, Task, Result } from "../../domain/types.js";

export class EchoAgent implements Agent {
  spec(): AgentSpec {
    return {
      id: "agent.echo",
      version: "0.1.0",
      capabilities: ["echo"],
      inputs: "about:blank#echo.in",
      outputs: "about:blank#echo.out",
    };
  }
  async act(t: Task): Promise<Result> {
    return { taskId: t.id, ok: true, output: { echoed: t.input } };
  }
}

