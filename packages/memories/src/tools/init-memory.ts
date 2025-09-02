#!/usr/bin/env node
import "dotenv/config";
import { MemoryService } from "../MemoryService.js";

(async () => {
	const embedder = {
		embed: async (t: string[]) =>
			t.map(() =>
				new Array(Number(process.env.VECTOR_SIZE || "1536")).fill(0.001),
			),
	};
	const svc = await MemoryService.fromEnv(embedder);
	await svc.upsertKGNode({
		id: "healthcheck",
		label: "Health",
		props: { ok: true },
	});
	// eslint-disable-next-line no-console
	console.log("Init OK");
})();
