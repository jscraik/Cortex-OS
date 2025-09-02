import { promises as fs } from "node:fs";
import path from "node:path";

const STORE =
	process.env.CORTEX_HITL_STORE ||
	path.join(process.cwd(), "data", "events", "hitl.jsonl");

async function appendJsonl(file: string, obj: any) {
	await fs.mkdir(path.dirname(file), { recursive: true });
	await fs.appendFile(file, `${JSON.stringify(obj)}\n`, "utf8");
}

async function readJsonl(file: string): Promise<any[]> {
	try {
		const text = await fs.readFile(file, "utf8");
		return text
			.split(/\n+/)
			.filter(Boolean)
			.map((l) => JSON.parse(l));
	} catch (e: any) {
		if (e?.code === "ENOENT") return [];
		throw e;
	}
}

export async function waitForApproval(
	runId: string,
	node: string,
	proposal: unknown,
): Promise<boolean> {
	const id = crypto.randomUUID();
	const request = {
		id,
		type: "request",
		runId,
		node,
		proposal,
		ts: new Date().toISOString(),
	};
	await appendJsonl(STORE, request);

	const deadline =
		Date.now() + (Number(process.env.CORTEX_HITL_TIMEOUT_MS) || 5 * 60_000);
	while (Date.now() < deadline) {
		const rows = await readJsonl(STORE);
		const decision = rows.find(
			(r) => r.type === "decision" && r.requestId === id,
		);
		if (decision) return Boolean(decision.approved);
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error("HITL approval timeout");
}
export function requiresApproval(proposal: unknown) {
	// naive heuristic: if proposal includes dataClass === 'sensitive' or path outside workspace
	try {
		const p = proposal as any;
		if (p?.dataClass === "sensitive") return true;
		if (p?.path && typeof p.path === "string") {
			const cwd = process.cwd();
			return !p.path.startsWith(cwd);
		}
	} catch {}
	return false;
}
