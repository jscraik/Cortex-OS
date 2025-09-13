import { PyEmbedder } from "@cortex-os/rag/embed/python-client";
import { ingestText } from "@cortex-os/rag/pipeline/ingest";
import { memoryStore } from "@cortex-os/rag/store/memory";
import { Command } from "commander";
import { readFile } from "node:fs/promises";

interface IngestOptions {
	endpoint?: string;
	json?: boolean;
}

export const ragIngest = new Command("ingest")
	.argument("<file>")
	.option("--endpoint <url>", "embedder URL", "http://127.0.0.1:8000")
	.option("--json", "JSON output")
	.action(async (file: string, opts: IngestOptions) => {
		const text = await readFile(file, "utf8");
		await ingestText({
			source: `file://${file}`,
			text,
			embedder: new PyEmbedder(opts.endpoint || "http://127.0.0.1:8000"),
			store: memoryStore(),
		});
		if (opts.json) {
			process.stdout.write(`${JSON.stringify({ success: true, message: "ingested" }, null, 2)}\n`);
		} else {
			process.stdout.write("ingested\n");
		}
	});

// no default export
