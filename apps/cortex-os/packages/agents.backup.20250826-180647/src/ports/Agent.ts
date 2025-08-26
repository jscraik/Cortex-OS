import type { Task, AgentSpec, Result } from "../domain/types.js";

export interface Agent {
  spec(): AgentSpec;
  plan?(t: Task): Promise<Task[]>;
  act(t: Task): Promise<Result>;
}

