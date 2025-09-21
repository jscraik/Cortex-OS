import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InMemoryStore } from '../../src/adapters/store.memory.js';
import { SecureMemoryStore } from '../../src/adapters/store.secure.js';
import { createMemory } from '../test-utils.js';

describe('SecureMemoryStore with RBAC', () => {
	let baseStore: InMemoryStore;
	let secureStore: SecureMemoryStore;
	let namespace: string;

	beforeEach(() => {
		baseStore = new InMemoryStore();
		secureStore = new SecureMemoryStore(baseStore);
		namespace = `test-${Math.random().toString(36).substring(7)}`;
	});

	afterEach(async () => {
		// Clean up
		const allMemories = await baseStore.list(namespace);
		for (const memory of allMemories) {
			await baseStore.delete(memory.id, namespace);
		}
	});

	describe('Role-Based Access Control', () => {
		it('should enforce read permissions based on roles', async () => {
			// Create a memory with restricted read access
			const memory = createMemory({
				text: 'Confidential information',
				metadata: {
					access: {
						read: ['admin', 'manager'],
						write: ['admin'],
					},
				},
			});

			// Store as admin (should succeed)
			await secureStore.upsert(memory, namespace, { role: 'admin', subject: 'user1' });

			// Try to read as regular user (should fail)
			await expect(
				secureStore.get(memory.id, namespace, { role: 'user', subject: 'user2' }),
			).rejects.toThrow('Access denied');

			// Try to read as manager (should succeed)
			const result = await secureStore.get(memory.id, namespace, {
				role: 'manager',
				subject: 'user3',
			});
			expect(result).toBeTruthy();
			expect(result?.text).toBe('Confidential information');
		});

		it('should enforce write permissions based on roles', async () => {
			const memory = createMemory({
				text: 'Important document',
				metadata: {
					access: {
						read: ['user', 'manager', 'admin'],
						write: ['manager', 'admin'],
					},
				},
			});

			// Try to write as regular user (should fail)
			await expect(
				secureStore.upsert(memory, namespace, { role: 'user', subject: 'user1' }),
			).rejects.toThrow('Access denied');

			// Try to write as manager (should succeed)
			await expect(
				secureStore.upsert(memory, namespace, { role: 'manager', subject: 'user2' }),
			).resolves.toBeDefined();
		});

		it('should support wildcard permissions', async () => {
			const memory = createMemory({
				text: 'Public information',
				metadata: {
					access: {
						read: ['*'], // Anyone can read
						write: ['admin'],
					},
				},
			});

			// Store as admin
			await secureStore.upsert(memory, namespace, { role: 'admin', subject: 'admin1' });

			// Anyone should be able to read
			const result = await secureStore.get(memory.id, namespace, {
				role: 'guest',
				subject: 'guest1',
			});
			expect(result).toBeTruthy();
		});

		it('should default to allow if no permissions specified', async () => {
			const memory = createMemory({
				text: 'Default access memory',
				// No access metadata
			});

			// Should be accessible by anyone
			await expect(
				secureStore.upsert(memory, namespace, { role: 'guest', subject: 'guest1' }),
			).resolves.toBeDefined();

			const result = await secureStore.get(memory.id, namespace, {
				role: 'guest',
				subject: 'guest1',
			});
			expect(result).toBeTruthy();
		});

		it('should handle ownership-based permissions', async () => {
			const memory = createMemory({
				text: 'Personal memory',
				metadata: {
					owner: 'user1',
					access: {
						read: ['owner', 'admin'],
						write: ['owner'],
					},
				},
			});

			// Store as owner
			await secureStore.upsert(memory, namespace, { role: 'user', subject: 'user1' });

			// Owner should be able to read and write
			const result = await secureStore.get(memory.id, namespace, {
				role: 'user',
				subject: 'user1',
			});
			expect(result).toBeTruthy();

			// Different user should not be able to access
			await expect(
				secureStore.get(memory.id, namespace, { role: 'user', subject: 'user2' }),
			).rejects.toThrow('Access denied');
		});

		it('should enforce permissions on search operations', async () => {
			// Create memories with different access levels
			const publicMemory = createMemory({
				text: 'Public info',
				metadata: {
					access: {
						read: ['*'],
						write: ['admin'],
					},
				},
			});

			const privateMemory = createMemory({
				text: 'Private info',
				metadata: {
					access: {
						read: ['admin'],
						write: ['admin'],
					},
				},
			});

			// Store both memories
			await secureStore.upsert(publicMemory, namespace, { role: 'admin', subject: 'admin1' });
			await secureStore.upsert(privateMemory, namespace, { role: 'admin', subject: 'admin1' });

			// Regular user should only see public memory
			const results = await secureStore.searchByText({ text: 'info' }, namespace, {
				role: 'user',
				subject: 'user1',
			});

			expect(results).toHaveLength(1);
			expect(results[0].text).toBe('Public info');
		});

		it('should enforce permissions on delete operations', async () => {
			const memory = createMemory({
				text: 'Deletable memory',
				metadata: {
					access: {
						read: ['user', 'admin'],
						write: ['admin'],
						delete: ['admin'],
					},
				},
			});

			// Store as admin
			await secureStore.upsert(memory, namespace, { role: 'admin', subject: 'admin1' });

			// Regular user should not be able to delete
			await expect(
				secureStore.delete(memory.id, namespace, { role: 'user', subject: 'user1' }),
			).rejects.toThrow('Access denied');

			// Admin should be able to delete
			await expect(
				secureStore.delete(memory.id, namespace, { role: 'admin', subject: 'admin1' }),
			).resolves.toBeUndefined();
		});

		it('should support hierarchical roles', async () => {
			const memory = createMemory({
				text: 'Hierarchy test',
				metadata: {
					access: {
						read: ['admin'], // Only admin
						write: ['admin'],
					},
				},
			});

			// Store as admin
			await secureStore.upsert(memory, namespace, { role: 'admin', subject: 'admin1' });

			// Super admin should inherit admin permissions
			const result = await secureStore.get(memory.id, namespace, {
				role: 'superadmin',
				subject: 'super1',
			});
			expect(result).toBeTruthy();
		});
	});

	describe('Role Management', () => {
		it('should allow dynamic role assignment', async () => {
			// Initially user has no permissions
			const memory = createMemory({
				text: 'Dynamic roles',
				metadata: {
					access: {
						read: ['editor'],
						write: ['editor'],
					},
				},
			});

			// Store as admin
			await secureStore.upsert(memory, namespace, { role: 'admin', subject: 'admin1' });

			// User cannot access initially
			await expect(
				secureStore.get(memory.id, namespace, { role: 'user', subject: 'user1' }),
			).rejects.toThrow('Access denied');

			// Grant editor role to user
			await secureStore.grantRole('user1', 'editor');

			// Now user should be able to access
			const result = await secureStore.get(memory.id, namespace, {
				role: 'user',
				subject: 'user1',
			});
			expect(result).toBeTruthy();
		});

		it('should support role revocation', async () => {
			const memory = createMemory({
				text: 'Revoke test',
				metadata: {
					access: {
						read: ['editor'],
						write: ['editor'],
					},
				},
			});

			// Store and grant role
			await secureStore.upsert(memory, namespace, { role: 'admin', subject: 'admin1' });
			await secureStore.grantRole('user1', 'editor');

			// User can access
			const result = await secureStore.get(memory.id, namespace, {
				role: 'user',
				subject: 'user1',
			});
			expect(result).toBeTruthy();

			// Revoke role
			await secureStore.revokeRole('user1', 'editor');

			// User can no longer access
			await expect(
				secureStore.get(memory.id, namespace, { role: 'user', subject: 'user1' }),
			).rejects.toThrow('Access denied');
		});

		it('should list user roles', async () => {
			// Grant multiple roles
			await secureStore.grantRole('user1', 'editor');
			await secureStore.grantRole('user1', 'reviewer');

			const roles = await secureStore.getUserRoles('user1', false); // Get only explicit roles
			expect(roles).toContain('editor');
			expect(roles).toContain('reviewer');
			expect(roles).toHaveLength(2);
		});
	});

	describe('Policy Evaluation', () => {
		it('should evaluate complex policies', async () => {
			const memory = createMemory({
				text: 'Complex policy',
				metadata: {
					department: 'finance',
					sensitivity: 'high',
					access: {
						read: ['finance-manager', 'cfo'],
						write: ['finance-manager'],
					},
				},
			});

			await secureStore.upsert(memory, namespace, { role: 'admin', subject: 'admin1' });

			// User with finance-manager role can access
			const result = await secureStore.get(memory.id, namespace, {
				role: 'finance-manager',
				subject: 'user1',
				attributes: { department: 'finance' },
			});
			expect(result).toBeTruthy();

			// User from different department cannot access
			await expect(
				secureStore.get(memory.id, namespace, {
					role: 'finance-manager',
					subject: 'user2',
					attributes: { department: 'hr' },
				}),
			).rejects.toThrow('Access denied');
		});

		it('should support time-based policies', async () => {
			const memory = createMemory({
				text: 'Time-based access',
				metadata: {
					access: {
						read: ['auditor'],
						write: ['admin'],
						timeRestriction: {
							allowedHours: [9, 10, 11, 12, 13, 14, 15, 16, 17], // 9 AM to 5 PM
							timezone: 'UTC',
						},
					},
				},
			});

			await secureStore.upsert(memory, namespace, { role: 'admin', subject: 'admin1' });

			// Mock time to 2 PM (should allow access)
			const mockDate = new Date('2023-01-01T14:00:00Z');
			jest.useFakeTimers().setSystemTime(mockDate);

			const result = await secureStore.get(memory.id, namespace, {
				role: 'auditor',
				subject: 'user1',
			});
			expect(result).toBeTruthy();

			// Clean up
			jest.useRealTimers();
		});

		it('should evaluate attribute-based policies', async () => {
			const memory = createMemory({
				text: 'Attribute-based access',
				metadata: {
					project: 'secret-project',
					clearanceLevel: 3,
					access: {
						read: ['employee'],
						write: ['manager'],
						attributes: {
							required: ['clearance:3', 'project:secret-project'],
						},
					},
				},
			});

			await secureStore.upsert(memory, namespace, { role: 'admin', subject: 'admin1' });

			// User with matching attributes can access
			const result = await secureStore.get(memory.id, namespace, {
				role: 'employee',
				subject: 'user1',
				attributes: {
					clearance: 3,
					project: 'secret-project',
				},
			});
			expect(result).toBeTruthy();

			// User without required attributes cannot access
			await expect(
				secureStore.get(memory.id, namespace, {
					role: 'employee',
					subject: 'user2',
					attributes: {
						clearance: 2,
						project: 'other-project',
					},
				}),
			).rejects.toThrow('Access denied');
		});
	});

	describe('Audit Logging', () => {
		it('should log all access attempts', async () => {
			const memory = createMemory({
				text: 'Audit test',
				metadata: {
					access: {
						read: ['admin'],
						write: ['admin'],
					},
				},
			});

			// Store memory
			await secureStore.upsert(memory, namespace, { role: 'admin', subject: 'admin1' });

			// Attempt access from unauthorized user
			try {
				await secureStore.get(memory.id, namespace, { role: 'user', subject: 'user1' });
			} catch (_e) {
				// Expected to fail
			}

			// Check audit logs
			const logs = await secureStore.getAuditLogs(memory.id);
			// Filter to only upsert and get operations
			const filteredLogs = logs.filter((log) => log.action === 'upsert' || log.action === 'get');
			expect(filteredLogs).toHaveLength(2); // upsert + failed get

			const failedAccess = logs.find((log) => log.action === 'get' && log.success === false);
			expect(failedAccess).toBeTruthy();
			expect(failedAccess?.subject).toBe('user1');
			expect(failedAccess?.reason).toContain('Access denied');
		});

		it('should log successful operations', async () => {
			const memory = createMemory({
				text: 'Success audit',
			});

			// Perform successful operations
			await secureStore.upsert(memory, namespace, { role: 'admin', subject: 'admin1' });
			await secureStore.get(memory.id, namespace, { role: 'admin', subject: 'admin1' });

			// Check audit logs
			const logs = await secureStore.getAuditLogs(memory.id);
			expect(logs).toHaveLength(2);

			logs.forEach((log) => {
				expect(log.success).toBe(true);
				expect(log.subject).toBe('admin1');
			});
		});

		it('should support audit log queries', async () => {
			const memory1 = createMemory({ text: 'Memory 1' });
			const memory2 = createMemory({ text: 'Memory 2' });

			// Perform operations
			await secureStore.upsert(memory1, namespace, { role: 'admin', subject: 'admin1' });
			await secureStore.upsert(memory2, namespace, { role: 'user', subject: 'user2' });

			// Query logs by subject
			const adminLogs = await secureStore.queryAuditLogs({ subject: 'admin1' });
			expect(adminLogs).toHaveLength(1);
			expect(adminLogs[0].subject).toBe('admin1');

			// Query logs by action
			const upsertLogs = await secureStore.queryAuditLogs({ action: 'upsert' });
			expect(upsertLogs).toHaveLength(2);
		});
	});

	describe('Security Configuration', () => {
		it('should allow custom deny messages', async () => {
			const secureStoreWithCustomMessage = new SecureMemoryStore(baseStore, {
				denyMessage: 'Custom: Access not permitted',
			});

			const memory = createMemory({
				text: 'Custom message test',
				metadata: {
					access: {
						read: ['admin'],
					},
				},
			});

			await secureStoreWithCustomMessage.upsert(memory, namespace, {
				role: 'admin',
				subject: 'admin1',
			});

			await expect(
				secureStoreWithCustomMessage.get(memory.id, namespace, { role: 'user', subject: 'user1' }),
			).rejects.toThrow('Custom: Access not permitted');
		});

		it('should support audit trail retention', async () => {
			const secureStoreWithRetention = new SecureMemoryStore(baseStore, {
				auditRetentionDays: 30,
			});

			const memory = createMemory({ text: 'Retention test' });

			await secureStoreWithRetention.upsert(memory, namespace, {
				role: 'admin',
				subject: 'admin1',
			});

			// Should have audit logs
			const logs = await secureStoreWithRetention.getAuditLogs(memory.id);
			expect(logs).toHaveLength(1);
		});

		it('should allow permission caching', async () => {
			const secureStoreWithCache = new SecureMemoryStore(baseStore, {
				enablePermissionCache: true,
				cacheTTL: 60000, // 1 minute
			});

			const memory = createMemory({
				text: 'Cache test',
				metadata: {
					access: {
						read: ['admin'],
					},
				},
			});

			await secureStoreWithCache.upsert(memory, namespace, { role: 'admin', subject: 'admin1' });

			// First access (should be cached)
			await secureStoreWithCache.get(memory.id, namespace, { role: 'admin', subject: 'admin1' });

			// Second access (should use cache)
			const result = await secureStoreWithCache.get(memory.id, namespace, {
				role: 'admin',
				subject: 'admin1',
			});
			expect(result).toBeTruthy();
		});
	});
});
