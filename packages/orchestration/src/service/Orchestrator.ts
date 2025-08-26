import type { Queue } from "../ports/Queue.js";
import type { Locker } from "../ports/Locker.js";
import type { Store } from "../ports/Store.js";
import type { Clock } from "../ports/Clock.js";
import type { RunState, Step } from "../domain/types.js";
import { workflowZ } from "../schemas/workflow.zod.js";

export class Orchestrator {
  constructor(
    private deps: {
      q: Queue<any>;
      lock: Locker;
      store: Store;
      clock: Clock;
      execStep: (rs: RunState, step: Step) => Promise<RunState>;
    }
  ) {}

  async start(wfRaw: unknown, input?: unknown) {
    const wf = workflowZ.parse(wfRaw);
    await this.deps.store.saveWorkflow(wf);
    const run = await this.deps.store.createRun(wf);
    if (input) run.context["input"] = input;
    await this.deps.q.enqueue({ runId: run.runId });
    return run.runId;
  }

  async tick() {
    const msg = await this.deps.q.reserve(this.deps.clock.nowMs());
    if (!msg) return false;
    const { runId } = msg.body as { runId: string };
    try {
      await this.deps.lock.withLock(`run:${runId}`, 10_000, async () => {
        const rs = await this.deps.store.getRun(runId);
        if (!rs) return;
        if (rs.status === "succeeded" || rs.status === "failed") return;
        const step = rs.wf.steps[rs.cursor];
        const nextRs = await this.deps.execStep(rs, step);
        await this.deps.store.updateRun(runId, nextRs);
        if (nextRs.status === "running" || nextRs.status === "pending")
          await this.deps.q.enqueue({ runId });
      });
      await this.deps.q.ack(msg.id);
    } catch (e) {
      await this.deps.q.nack(msg.id, 1000); // minimal backoff; make configurable
    }
    return true;
  }
}

