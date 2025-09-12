import { PyEmbedder } from "@cortex-os/rag/embed/python-client";
import { query as doQuery } from "@cortex-os/rag/pipeline/query";
import { memoryStore } from "@cortex-os/rag/store/memory";
import { Command } from "commander";

interface QueryOptions {
	q: string;
	endpoint?: string;
}

export const ragQuery = new Command("query")
	.requiredOption("-q, --q <text>")
	.option("--endpoint <url>", "embedder URL", "http://127.0.0.1:8000")
	.action(async (opts: QueryOptions) => {
		const hits = await doQuery(
			{ q: opts.q, topK: 5 },
			new PyEmbedder(opts.endpoint || "http://127.0.0.1:8000"),
			memoryStore(),
		);
		process.stdout.write(`${JSON.stringify(hits, null, 2)}\n`);
	});

// no default export
