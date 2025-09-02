process.env.CORTEX_GATEWAY_URL =
	process.env.CORTEX_GATEWAY_URL || "https://gateway.test";
process.env.CORTEX_LOCAL_BRIDGE_URL =
	process.env.CORTEX_LOCAL_BRIDGE_URL || "http://localhost:4321";

// Isolate HOME to a temp dir so tests don't read/write real user config
if (!process.env.HOME?.includes("mcp-bridge-test-")) {
	try {
		const { mkdtempSync } = await import("node:fs");
		const { tmpdir } = await import("node:os");
		const { join } = await import("node:path");
		const dir = mkdtempSync(join(tmpdir(), "mcp-bridge-test-"));
		process.env.HOME = dir;
	} catch {
		// ignore if tmp dir setup fails
	}
}
