import { Command } from "commander";

export default new Command("bench")
  .description("Run N episodes and summarize (stub)")
  .option("--runs <n>", "number of runs", "10")
  .action(async (opts) => {
    const runs = Number(opts.runs) || 10;
    process.stdout.write(JSON.stringify({ ok: true, runs, note: "bench stub" }) + "\n");
  });

