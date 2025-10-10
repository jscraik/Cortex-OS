import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/config.js', () => ({
	loadServerConfig: () => ({ resourcesEnabled: true }),
}));

describe('resources registry', () => {
	const addSpy = vi.fn();
	const serverStub = { resources: { add: addSpy } };
	const logger = { info: vi.fn() };

	beforeEach(() => {
		addSpy.mockClear();
	});

	it('registers four resources when enabled', async () => {
		const { createResources } = await import('../resources/index.js');
		createResources(serverStub as any, logger);
		expect(addSpy).toHaveBeenCalledTimes(4);
		expect(addSpy.mock.calls.map(([entry]: any[]) => entry.uriTemplate)).toEqual([
			'memory://cortex-local/{id}',
			'memory://cortex-local/search{?query,limit}',
			'repo://cortex-os/file{?path}',
			'metrics://cortex-os/health',
		]);
	});

	it('reads repository file with allowlist enforcement', async () => {
		const { readRepoFile } = await import('../resources/repo-provider.js');
		const uri = new URL('repo://cortex-os/file?path=src/index.ts');
		const result = await readRepoFile(uri);
		expect(result.mimeType).toBe('text/plain');
		expect(result.text.length).toBeGreaterThan(0);
		expect(result.text).toContain('export');
	});

	it('blocks disallowed repository paths', async () => {
		const { readRepoFile } = await import('../resources/repo-provider.js');
		const uri = new URL('repo://cortex-os/file?path=.env');
		await expect(readRepoFile(uri)).rejects.toThrow(/Access denied/);
	});

	it('produces branded health metrics snapshot', async () => {
		const { readHealthMetrics } = await import('../resources/metrics-provider.js');
		const snapshot = await readHealthMetrics();
		expect(snapshot.mimeType).toBe('application/json');
		const parsed = JSON.parse(snapshot.text);
		expect(parsed.brand).toBe('brAInwav');
		expect(typeof parsed.processUptimeSeconds).toBe('number');
	});
});
