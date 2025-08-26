import type { Task } from "../domain/types.js";

export interface Planner {
  plan(t: Task): Promise<Task[]>;
}

