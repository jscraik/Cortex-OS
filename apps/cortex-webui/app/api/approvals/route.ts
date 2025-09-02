import { promises as fs } from "node:fs";
import path from "node:path";

const STORE =
	process.env.CORTEX_HITL_STORE ||
	path.join(process.cwd(), "data", "events", "hitl.jsonl");

type HitlRow =
	| { kind: "request"; id: string; node?: string; proposal?: unknown }
	| {
			kind: "decision";
			id: string;
			requestId: string;
			decision: string;
			by: string;
			at: string;
	  };

async function readAll(): Promise<HitlRow[]> {
	try {
		const txt = await fs.readFile(STORE, "utf8");
		return txt
			.split("\n")
			.filter(Boolean)
			.map((l) => JSON.parse(l));
	} catch {
		return [];
	}
}

export async function GET() {
	const rows = await readAll();
	const pending = rows.filter(
		(r) =>
			r.kind === "request" &&
			!rows.find((d) => d.kind === "decision" && d.requestId === r.id),
	);
	// Return array directly to match UI expectation
	return new Response(JSON.stringify(pending), {
		headers: { "content-type": "application/json" },
	});
}

export async function POST(req: Request) {
	const body = await req.json();
	// Accept both { requestId, decision } and UI's { id, approved }
	const requestId = body.requestId ?? body.id;
	const decision =
		body.decision ?? (body.approved === true ? "approve" : "reject");
	const row = {
		kind: "decision",
		id: crypto.randomUUID(),
		requestId,
		decision,
		by: "web",
		at: new Date().toISOString(),
	};
	await fs.mkdir(path.dirname(STORE), { recursive: true });
	await fs.appendFile(STORE, `${JSON.stringify(row)}\n`, "utf8");
	return new Response(JSON.stringify({ ok: true }), {
		headers: { "content-type": "application/json" },
	});
}
