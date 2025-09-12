#!/usr/bin/env node
const base = process.env.STAGING_BASE_URL || "http://localhost:3333";
const target = `${base}/mcp`;

async function main() {
	const payload = {
		config: {
			seed: 1,
			maxTokens: 64,
			timeoutMs: 1000,
			memory: { maxItems: 10, maxBytes: 2048 },
		},
		request: { tool: "echo", args: { x: 1 } },
		json: true,
	};
	const res = await fetch(target, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(payload),
	});
	const ok = res.ok;
	let msg = "";
	try {
		const j = await res.json();
		msg = j?.meta?.timestamp || "";
	} catch {
		// Ignore JSON parsing errors for logging
	}
	console.log(`[canary] ${ok ? "OK" : "FAIL"} ${res.status} ${msg}`);
	process.exit(ok ? 0 : 1);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
