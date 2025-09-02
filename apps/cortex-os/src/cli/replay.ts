#!/usr/bin/env tsx
import yargs from "yargs";
import { loadCheckpoint } from "../../../packages/memories/src/checkpointer";
import { graph } from "../../../packages/orchestration/src/lib/supervisor";

const { thread, at, trace } = yargs(process.argv.slice(2))
	.option("thread", { type: "string", demandOption: true })
	.option("at", { type: "string", default: "synthesize" })
	.option("trace", { type: "string" })
	.parseSync();

const state = await loadCheckpoint(thread);
await graph.resume({
	state,
	node: at,
	metadata: { runId: thread, traceId: trace },
});
