import { Command } from "commander";
import { Scenario, Scenario as S } from "@cortex-os/simlab-contracts/scenario";
import { counterEnv } from "@cortex-os/simlab-env/local-counter";
import { greedyToTarget } from "@cortex-os/simlab-agents/rule-agent";
import { runScenario } from "@cortex-os/simlab-core/runner";
import { tracer } from "@cortex-os/telemetry";

export default new Command("run")
  .description("Run a simlab scenario")
  .requiredOption("--id <id>")
  .option("--steps <n>", "max steps", "50")
  .option("--seed <n>", "seed", "42")
  .option("--json", "JSON output")
  .action(async (opts) => {
    const span = tracer.startSpan('cli.simlab.run');
    const scenario: S = Scenario.parse({
      id: opts.id, steps: Number(opts.steps), seed: { value: Number(opts.seed) },
      agent: { id: "rule1", kind: "rule" }, env: { id: "counter", kind: "local-counter" }
    });
    try {
      const res = await runScenario(scenario, counterEnv(), greedyToTarget());
      process.stdout.write(JSON.stringify(res, null, 2) + "\n");
    } finally {
      span.end();
    }
  });
