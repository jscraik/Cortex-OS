import { Command } from "commander";
import { toMarkdown } from "@cortex-os/simlab-report/markdown";

export default new Command("report")
  .description("Render a Markdown report from a JSON RunResult (stdin)")
  .action(async () => {
    const chunks: Buffer[] = [];
    for await (const c of process.stdin) chunks.push(c as Buffer);
    const input = Buffer.concat(chunks).toString("utf8");
    const run = JSON.parse(input);
    process.stdout.write(toMarkdown(run) + "\n");
  });

