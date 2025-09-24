import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createRuntimeHttpServer } from '../../src/http/runtime-server.js';
import { ArtifactRepository } from '../../src/persistence/artifact-repository.js';
import { EvidenceRepository } from '../../src/persistence/evidence-repository.js';
import { ProfileRepository } from '../../src/persistence/profile-repository.js';
import { TaskRepository } from '../../src/persistence/task-repository.js';
import { initializeAuth } from '../../src/security/auth.js';

interface ApiServerContext {
	server: ReturnType<typeof createRuntimeHttpServer>;
	baseUrl: string;
	authHeader: string;
}

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

let context: ApiServerContext | undefined;
let tempRoot: string | undefined;
const originalTmp = process.env.CORTEX_OS_TMP;

beforeEach(async () => {
	tempRoot = await mkdtemp(join(tmpdir(), 'cortex-os-http-api-'));
	process.env.CORTEX_OS_TMP = tempRoot;

	const server = createRuntimeHttpServer({
		tasks: new TaskRepository(),
		profiles: new ProfileRepository(),
		artifacts: new ArtifactRepository(),
		evidence: new EvidenceRepository(),
	});
	const { port } = await server.listen(0, '127.0.0.1');
	// Initialize auth and capture the bearer token
	const token = await initializeAuth();
	context = { server, baseUrl: `http://127.0.0.1:${port}`, authHeader: `Bearer ${token.token}` };
});

afterEach(async () => {
	if (context) {
		await context.server.close();
		context = undefined;
	}
	if (tempRoot) {
		await rm(tempRoot, { recursive: true, force: true });
		tempRoot = undefined;
	}
	if (originalTmp) {
		process.env.CORTEX_OS_TMP = originalTmp;
	} else {
		delete process.env.CORTEX_OS_TMP;
	}
});

describe('HTTP API', () => {
	test('tasks endpoint supports CRUD with optimistic locking', async () => {
		const { baseUrl, authHeader } = ensureContext();

		const createRes = await fetch(`${baseUrl}/v1/tasks`, {
			method: 'POST',
			headers: { ...JSON_HEADERS, Authorization: authHeader },
			body: JSON.stringify({
				task: { id: 'task-http-1', status: 'pending', details: { note: 'test' } },
			}),
		});
		expect(createRes.status).toBe(201);
		const created = (await createRes.json()) as { task: Record<string, unknown>; digest: string };
		expect(created.task).toEqual({
			id: 'task-http-1',
			status: 'pending',
			details: { note: 'test' },
		});
		expect(created.digest).toMatch(/^[a-f0-9]{64}$/);

		const listRes = await fetch(`${baseUrl}/v1/tasks`, { headers: { Authorization: authHeader } });
		expect(listRes.status).toBe(200);
		const listJson = (await listRes.json()) as {
			tasks: { record: Record<string, unknown>; digest: string }[];
		};
		expect(listJson.tasks).toHaveLength(1);
		expect(listJson.tasks[0]?.record).toEqual(created.task);

		const getRes = await fetch(`${baseUrl}/v1/tasks/task-http-1`, {
			headers: { Authorization: authHeader },
		});
		expect(getRes.status).toBe(200);
		const fetched = (await getRes.json()) as { task: Record<string, unknown>; digest: string };
		expect(fetched.task).toEqual(created.task);
		expect(fetched.digest).toBe(created.digest);

		const updateRes = await fetch(`${baseUrl}/v1/tasks/task-http-1`, {
			method: 'PUT',
			headers: { ...JSON_HEADERS, Authorization: authHeader },
			body: JSON.stringify({ patch: { status: 'completed' }, expectedDigest: created.digest }),
		});
		expect(updateRes.status).toBe(200);
		const updated = (await updateRes.json()) as { task: Record<string, unknown>; digest: string };
		expect(updated.task).toEqual({
			id: 'task-http-1',
			status: 'completed',
			details: { note: 'test' },
		});
		expect(updated.digest).not.toBe(created.digest);

		const conflictRes = await fetch(`${baseUrl}/v1/tasks/task-http-1`, {
			method: 'PUT',
			headers: { ...JSON_HEADERS, Authorization: authHeader },
			body: JSON.stringify({ patch: { status: 'stale' }, expectedDigest: 'deadbeef' }),
		});
		expect(conflictRes.status).toBe(409);

		const deleteRes = await fetch(`${baseUrl}/v1/tasks/task-http-1`, {
			method: 'DELETE',
			headers: { Authorization: authHeader },
		});
		expect(deleteRes.status).toBe(204);

		const getMissingRes = await fetch(`${baseUrl}/v1/tasks/task-http-1`, {
			headers: { Authorization: authHeader },
		});
		expect(getMissingRes.status).toBe(404);
	});

	test('profiles endpoint supports CRUD with optimistic locking', async () => {
		const { baseUrl, authHeader } = ensureContext();

		const createRes = await fetch(`${baseUrl}/v1/profiles`, {
			method: 'POST',
			headers: { ...JSON_HEADERS, Authorization: authHeader },
			body: JSON.stringify({
				profile: { id: 'profile-http-1', label: 'Primary', scopes: ['tasks:read'] },
			}),
		});
		const created = await createRes.json();
		expect(createRes.status).toBe(201);
		expect(created.profile).toEqual({
			id: 'profile-http-1',
			label: 'Primary',
			scopes: ['tasks:read'],
		});

		const updateRes = await fetch(`${baseUrl}/v1/profiles/profile-http-1`, {
			method: 'PUT',
			headers: { ...JSON_HEADERS, Authorization: authHeader },
			body: JSON.stringify({ patch: { label: 'Primary Updated' }, expectedDigest: created.digest }),
		});
		expect(updateRes.status).toBe(200);
		const updated = await updateRes.json();
		expect(updated.profile.label).toBe('Primary Updated');

		const conflictRes = await fetch(`${baseUrl}/v1/profiles/profile-http-1`, {
			method: 'PUT',
			headers: { ...JSON_HEADERS, Authorization: authHeader },
			body: JSON.stringify({ patch: { label: 'stale' }, expectedDigest: 'deadbeef' }),
		});
		expect(conflictRes.status).toBe(409);

		const listRes = await fetch(`${baseUrl}/v1/profiles`, {
			headers: { Authorization: authHeader },
		});
		expect(listRes.status).toBe(200);
		const listJson = await listRes.json();
		expect(listJson.profiles).toHaveLength(1);

		const deleteRes = await fetch(`${baseUrl}/v1/profiles/profile-http-1`, {
			method: 'DELETE',
			headers: { Authorization: authHeader },
		});
		expect(deleteRes.status).toBe(204);
	});

	test('artifacts endpoint persists binary payloads with digests', async () => {
		const { baseUrl, authHeader } = ensureContext();
		const payload = Buffer.from('artifact-http');

		const createRes = await fetch(`${baseUrl}/v1/artifacts`, {
			method: 'POST',
			headers: { ...JSON_HEADERS, Authorization: authHeader },
			body: JSON.stringify({
				artifact: {
					filename: 'artifact.txt',
					contentType: 'text/plain',
					base64Payload: payload.toString('base64'),
					taskId: 'task-artifact',
					tags: ['log'],
				},
			}),
		});
		expect(createRes.status).toBe(201);
		const created = await createRes.json();
		const artifactId = created.metadata.id as string;

		const getRes = await fetch(`${baseUrl}/v1/artifacts/${artifactId}`, {
			headers: { Authorization: authHeader },
		});
		expect(getRes.status).toBe(200);
		const fetched = await getRes.json();
		expect(Buffer.from(fetched.base64Payload, 'base64').toString()).toBe('artifact-http');

		const updateRes = await fetch(`${baseUrl}/v1/artifacts/${artifactId}`, {
			method: 'PUT',
			headers: { ...JSON_HEADERS, Authorization: authHeader },
			body: JSON.stringify({
				artifact: {
					filename: 'artifact.txt',
					contentType: 'text/plain',
					base64Payload: Buffer.from('artifact-updated').toString('base64'),
					taskId: 'task-artifact',
					tags: ['log'],
				},
				expectedDigest: created.digest,
			}),
		});
		expect(updateRes.status).toBe(200);
		const updated = await updateRes.json();
		expect(updated.metadata.digest).not.toBe(created.digest);

		const listRes = await fetch(`${baseUrl}/v1/artifacts?taskId=task-artifact`, {
			headers: { Authorization: authHeader },
		});
		expect(listRes.status).toBe(200);
		const listJson = await listRes.json();
		expect(listJson.artifacts).toHaveLength(1);

		const deleteRes = await fetch(`${baseUrl}/v1/artifacts/${artifactId}`, {
			method: 'DELETE',
			headers: { Authorization: authHeader },
		});
		expect(deleteRes.status).toBe(204);
	});

	test('evidence endpoint enforces optimistic locking', async () => {
		const { baseUrl, authHeader } = ensureContext();
		const createRes = await fetch(`${baseUrl}/v1/evidence`, {
			method: 'POST',
			headers: { ...JSON_HEADERS, Authorization: authHeader },
			body: JSON.stringify({
				evidence: {
					taskId: 'task-evidence',
					type: 'audit',
					timestamp: new Date('2025-09-18T12:00:00Z').toISOString(),
					payload: { step: 1 },
				},
			}),
		});
		expect(createRes.status).toBe(201);
		const created = await createRes.json();

		const updateRes = await fetch(`${baseUrl}/v1/evidence/${created.evidence.id}`, {
			method: 'PUT',
			headers: { ...JSON_HEADERS, Authorization: authHeader },
			body: JSON.stringify({
				evidence: {
					taskId: 'task-evidence',
					type: 'audit',
					timestamp: created.evidence.timestamp,
					payload: { step: 2 },
				},
				expectedDigest: created.digest,
			}),
		});
		expect(updateRes.status).toBe(200);
		const updated = await updateRes.json();
		expect(updated.evidence.payload).toEqual({ step: 2 });

		const conflictRes = await fetch(`${baseUrl}/v1/evidence/${created.evidence.id}`, {
			method: 'PUT',
			headers: { ...JSON_HEADERS, Authorization: authHeader },
			body: JSON.stringify({
				evidence: {
					taskId: 'task-evidence',
					type: 'audit',
					timestamp: created.evidence.timestamp,
					payload: { step: 3 },
				},
				expectedDigest: 'deadbeef',
			}),
		});
		expect(conflictRes.status).toBe(409);
	});
});

function ensureContext(): ApiServerContext {
	if (!context) throw new Error('Test server context not initialized');
	return context;
}
