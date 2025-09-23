import { beforeEach, describe, expect, it } from 'vitest';
import { container } from '../../src/boot';
import type { ArtifactRepository } from '../../src/persistence/artifact-repository';
import type { EvidenceRepository } from '../../src/persistence/evidence-repository';
import type { ProfileRepository } from '../../src/persistence/profile-repository';
import type { TaskRepository } from '../../src/persistence/task-repository';
import { TOKENS } from '../../src/tokens';

describe('brAInwav Repository Contract Implementation', () => {
	describe('brAInwav TaskRepository', () => {
		let taskRepo: TaskRepository;

		beforeEach(() => {
			taskRepo = container.get<TaskRepository>(TOKENS.TaskRepository);
		});

		it('should implement CRUD operations', async () => {
			const task = {
				id: 'task-123',
				status: 'pending',
				title: 'Test Task',
				description: 'A test task for validation',
				createdAt: new Date().toISOString(),
			};

			// Create
			const savedTask = await taskRepo.save(task);
			expect(savedTask.record).toMatchObject(task);
			expect(savedTask.digest).toBeDefined();

			// Read
			const retrieved = await taskRepo.get('task-123');
			expect(retrieved).toBeDefined();
			expect(retrieved!.record).toMatchObject(task);
			expect(retrieved!.digest).toBe(savedTask.digest);

			// Update
			const updateResult = await taskRepo.update('task-123', { status: 'completed' });
			expect(updateResult).toBeDefined();
			expect(updateResult!.record.status).toBe('completed');
			expect(updateResult!.record.id).toBe('task-123');

			// Verify update
			const updated = await taskRepo.get('task-123');
			expect(updated!.record.status).toBe('completed');

			// Delete
			await taskRepo.delete('task-123');
			const deleted = await taskRepo.get('task-123');
			expect(deleted).toBeUndefined();
		});

		it('should handle optimistic locking', async () => {
			const task = {
				id: 'task-lock-test',
				status: 'pending',
				title: 'Lock Test Task',
			};

			const saved = await taskRepo.save(task);

			// Should succeed with correct digest
			await expect(
				taskRepo.update(
					'task-lock-test',
					{ status: 'in-progress' },
					{ expectedDigest: saved.digest },
				),
			).resolves.toBeDefined();

			// Should fail with wrong digest
			await expect(
				taskRepo.update('task-lock-test', { status: 'failed' }, { expectedDigest: 'wrong-digest' }),
			).rejects.toThrow();

			// Cleanup
			await taskRepo.delete('task-lock-test');
		});

		it('should list all tasks', async () => {
			// Save multiple tasks
			const tasks = [
				{ id: 'task-list-1', status: 'pending', title: 'Task 1' },
				{ id: 'task-list-2', status: 'completed', title: 'Task 2' },
			];

			for (const task of tasks) {
				await taskRepo.save(task);
			}

			const allTasks = await taskRepo.list();
			const ourTasks = allTasks.filter((t) => t.record.id.startsWith('task-list-'));

			expect(ourTasks).toHaveLength(2);
			expect(ourTasks.map((t) => t.record.id)).toContain('task-list-1');
			expect(ourTasks.map((t) => t.record.id)).toContain('task-list-2');

			// Cleanup
			for (const task of tasks) {
				await taskRepo.delete(task.id);
			}
		});
	});

	describe('brAInwav ProfileRepository', () => {
		let profileRepo: ProfileRepository;

		beforeEach(() => {
			profileRepo = container.get<ProfileRepository>(TOKENS.ProfileRepository);
		});

		it('should implement CRUD operations', async () => {
			const profile = {
				id: 'profile-123',
				label: 'Test Profile',
				scopes: ['read', 'write'],
				metadata: { category: 'test' },
			};

			// Create
			const savedProfile = await profileRepo.save(profile);
			expect(savedProfile.record).toMatchObject(profile);
			expect(savedProfile.digest).toBeDefined();

			// Read
			const retrieved = await profileRepo.get('profile-123');
			expect(retrieved).toBeDefined();
			expect(retrieved!.record).toMatchObject(profile);

			// Update
			const updateResult = await profileRepo.update('profile-123', {
				label: 'Updated Profile',
				scopes: ['read', 'write', 'admin'],
			});
			expect(updateResult).toBeDefined();
			expect(updateResult!.record.label).toBe('Updated Profile');
			expect(updateResult!.record.scopes).toEqual(['read', 'write', 'admin']);

			// Delete
			await profileRepo.delete('profile-123');
			const deleted = await profileRepo.get('profile-123');
			expect(deleted).toBeUndefined();
		});

		it('should handle scopes properly in updates', async () => {
			const profile = {
				id: 'profile-scopes-test',
				label: 'Scopes Test',
				scopes: ['read'],
			};

			await profileRepo.save(profile);

			// Update without changing scopes should preserve them
			const result1 = await profileRepo.update('profile-scopes-test', { label: 'New Label' });
			expect(result1!.record.scopes).toEqual(['read']);

			// Update with new scopes should replace them
			const result2 = await profileRepo.update('profile-scopes-test', {
				scopes: ['read', 'write'],
			});
			expect(result2!.record.scopes).toEqual(['read', 'write']);

			// Cleanup
			await profileRepo.delete('profile-scopes-test');
		});
	});

	describe('brAInwav ArtifactRepository', () => {
		let artifactRepo: ArtifactRepository;

		beforeEach(() => {
			artifactRepo = container.get<ArtifactRepository>(TOKENS.ArtifactRepository);
		});

		it('should implement basic operations', async () => {
			const artifactInput = {
				id: 'artifact-123',
				filename: 'test-document.txt',
				contentType: 'text/plain',
				binary: Buffer.from('Hello, world!'),
				tags: ['test'],
				taskId: 'task-456',
			};

			// Create
			const saved = await artifactRepo.save(artifactInput);
			expect(saved.id).toBe('artifact-123');
			expect(saved.filename).toBe('test-document.txt');
			expect(saved.contentType).toBe('text/plain');
			expect(saved.tags).toEqual(['test']);

			// Read
			const retrieved = await artifactRepo.get('artifact-123');
			expect(retrieved).toBeDefined();
			expect(retrieved!.metadata.filename).toBe('test-document.txt');
			expect(retrieved!.binary.toString()).toBe('Hello, world!');

			// List
			const artifacts = await artifactRepo.list({ taskId: 'task-456' });
			expect(artifacts.length).toBeGreaterThan(0);
			expect(artifacts.find((a) => a.id === 'artifact-123')).toBeDefined();

			// Delete
			await artifactRepo.delete('artifact-123');
			const deleted = await artifactRepo.get('artifact-123');
			expect(deleted).toBeUndefined();
		});
	});

	describe('EvidenceRepository', () => {
		let evidenceRepo: EvidenceRepository;

		beforeEach(() => {
			evidenceRepo = container.get<EvidenceRepository>(TOKENS.EvidenceRepository);
		});

		it('should implement basic operations', async () => {
			const evidenceInput = {
				id: 'evidence-123',
				taskId: 'task-456',
				type: 'screenshot',
				timestamp: new Date().toISOString(),
				payload: { url: 'https://example.com/screenshot.png', width: 1920, height: 1080 },
				tags: ['test', 'automation'],
			};

			// Create
			const saved = await evidenceRepo.save(evidenceInput);
			expect(saved.record).toMatchObject({
				id: 'evidence-123',
				taskId: 'task-456',
				type: 'screenshot',
			});
			expect(saved.digest).toBeDefined();

			// Read
			const retrieved = await evidenceRepo.get('evidence-123');
			expect(retrieved).toBeDefined();
			expect(retrieved!.record.type).toBe('screenshot');
			expect(retrieved!.record.payload.url).toBe('https://example.com/screenshot.png');

			// List
			const evidences = await evidenceRepo.list({ taskId: 'task-456' });
			expect(evidences.length).toBeGreaterThan(0);
			expect(evidences.find((e) => e.record.id === 'evidence-123')).toBeDefined();

			// Delete
			await evidenceRepo.delete('evidence-123');
			const deleted = await evidenceRepo.get('evidence-123');
			expect(deleted).toBeUndefined();
		});
	});
});

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
// Co-authored-by: brAInwav Development Team
