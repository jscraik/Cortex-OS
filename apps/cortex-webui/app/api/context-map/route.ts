import { promises as fs } from "node:fs";
import * as path from "node:path";

type MapFile = { path: string; kind: "repo" | "context" };

export async function GET() {
	const repoRoot = process.cwd();
	const allFilesTxt = path.join(repoRoot, "all-files.txt");
	const contextDir = path.join(repoRoot, ".cortex", "context");

	const files: MapFile[] = [];
	try {
		const txt = await fs.readFile(allFilesTxt, "utf8");
		for (const line of txt.split("\n")) {
			const p = line.trim();
			if (p) files.push({ path: p, kind: "repo" });
		}
	} catch {
		// ignore
	}

	try {
		const entries = await fs.readdir(contextDir);
		for (const f of entries) {
			files.push({ path: path.join(".cortex/context", f), kind: "context" });
		}
	} catch {
		// ignore
	}

	const nodes = files.map((f) => ({ path: f.path, kind: f.kind }));
	return new Response(JSON.stringify({ files: nodes }), {
		headers: { "content-type": "application/json" },
	});
}
