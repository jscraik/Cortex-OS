import { promises as fs } from 'node:fs';
import path from 'node:path';

const STORE =
	process.env.CORTEX_HITL_STORE ||
	path.join(process.cwd(), 'data', 'events', 'hitl.jsonl');

type ProposalLike = {
	dataClass?: unknown;
	path?: unknown;
};

const isNodeErrorWithCode = (error: unknown, code: string): boolean =>
	typeof error === 'object' &&
	error !== null &&
	'code' in error &&
	typeof (error as { code?: unknown }).code === 'string' &&
	(error as { code: string }).code === code;

async function appendJsonl(file: string, obj: unknown) {
	await fs.mkdir(path.dirname(file), { recursive: true });
	await fs.appendFile(file, `${JSON.stringify(obj)}\n`, 'utf8');
}

async function readJsonl(file: string): Promise<Array<Record<string, unknown>>> {
	try {
		const text = await fs.readFile(file, 'utf8');
		return text
			.split(/\n+/)
			.filter(Boolean)
			.map((l) => JSON.parse(l) as Record<string, unknown>);
	} catch (error) {
		if (isNodeErrorWithCode(error, 'ENOENT')) return [];
		throw error;
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
		type: 'request',
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
			(r) => r.type === 'decision' && r.requestId === id,
		) as (Record<string, unknown> & { approved?: unknown }) | undefined;
		if (decision) return Boolean(decision.approved);
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error('HITL approval timeout');
}
export function requiresApproval(proposal: unknown) {
	// naive heuristic: if proposal includes dataClass === 'sensitive' or path outside workspace
	if (typeof proposal !== 'object' || proposal === null) {
		return false;
	}

	const candidate = proposal as ProposalLike;
	if (candidate.dataClass === 'sensitive') {
		return true;
	}

	if (typeof candidate.path === 'string') {
		const cwd = process.cwd();
		return !candidate.path.startsWith(cwd);
	}

	return false;
}
