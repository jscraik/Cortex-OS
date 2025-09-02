import { PyEmbedder } from "@cortex-os/rag/embed/python-client";
import { ingestText } from "@cortex-os/rag/pipeline/ingest";
import { query } from "@cortex-os/rag/pipeline/query";
import { memoryStore } from "@cortex-os/rag/store/memory";
import { expect, it } from "vitest";

async function isUp(url: string) {
	try {
		const r = await fetch(url, { method: "HEAD" });
		return r.ok || r.status === 405;
	} catch {
		return false;
	}
}

it("ingests and queries (skips if embedder down)", async () => {
	const endpoint = "http://127.0.0.1:8000";
	if (!(await isUp(endpoint))) return;
	const E = new PyEmbedder(endpoint);
	const S = memoryStore();
	await ingestText("mem://demo", "Paris is the capital of France.", E, S);
	const hits = await query(
		{ q: "What is the capital of France?", topK: 1 } as any,
		E,
		S,
	);
	expect(hits[0].text.toLowerCase()).toContain("paris");
});
