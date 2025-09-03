import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Request, Response } from 'express';

const STORE =
	process.env.CORTEX_HITL_STORE ||
	path.join(process.cwd(), 'data', 'events', 'hitl.jsonl');

type HitlRow =
	| { kind: 'request'; id: string; node?: string; proposal?: unknown }
	| {
			kind: 'decision';
			id: string;
			requestId: string;
			decision: string;
			by: string;
			at: string;
	  };

async function readAll(): Promise<HitlRow[]> {
	try {
		const txt = await fs.readFile(STORE, 'utf8');
		return txt
			.split('\n')
			.filter(Boolean)
			.map((l) => JSON.parse(l) as HitlRow);
	} catch {
		return [];
	}
}

export async function getApprovals(_req: Request, res: Response) {
	const rows = await readAll();
	const pending = rows.filter(
		(r) =>
			r.kind === 'request' &&
			!rows.find((d) => d.kind === 'decision' && d.requestId === r.id),
	);
	res.json(pending);
}

export async function postApproval(req: Request, res: Response) {
	const body = (req.body || {}) as {
		requestId?: string;
		id?: string;
		decision?: string;
		approved?: boolean;
	};
	const requestId = body.requestId ?? body.id;
	const decision =
		body.decision ?? (body.approved === true ? 'approve' : 'reject');
	const row: HitlRow = {
		kind: 'decision',
		id: crypto.randomUUID(),
		requestId: String(requestId),
		decision: String(decision),
		by: 'web',
		at: new Date().toISOString(),
	} as const;
	await fs.mkdir(path.dirname(STORE), { recursive: true });
	await fs.appendFile(STORE, `${JSON.stringify(row)}\n`, 'utf8');
	res.json({ ok: true });
}
