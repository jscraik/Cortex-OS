export type Check = {
	name: string;
	run: () => Promise<{ ok: boolean; detail?: string }>;
};

export async function health(checks: Check[]) {
	const results = await Promise.all(
		checks.map(async (c) => ({ name: c.name, ...(await c.run()) })),
	);
	const ok = results.every((r) => r.ok);
	return { ok, results, timestamp: new Date().toISOString() };
}
