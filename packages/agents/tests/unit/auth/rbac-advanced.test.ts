import { describe, expect, it } from 'vitest';
import {
	canExecuteAgent,
	canManage,
	checkPermission,
	createUserContextFromAPIKey,
	getUserPermissions,
	hasRolePermission,
	isAdmin,
	PERMISSIONS,
	ROLES,
} from '../../../src/auth/permissions';
import type { Role, UserContext } from '../../../src/auth/types';

describe('RBAC (Role-Based Access Control) - Advanced Tests', () => {
	describe('Permission Validation Edge Cases', () => {
		it('should handle empty user permissions gracefully', () => {
			const emptyUser: UserContext = {
				id: 'empty-user',
				roles: [],
				permissions: [],
			};

			expect(checkPermission(emptyUser, 'read:agents')).toBe(false);
			expect(checkPermission(emptyUser, 'execute:agents')).toBe(false);
			expect(checkPermission(emptyUser, 'manage:agents')).toBe(false);
		});

		it('should validate non-existent permissions', () => {
			const user: UserContext = {
				id: 'test-user',
				roles: ['admin'],
				permissions: [],
			};

			expect(checkPermission(user, 'invalid:permission')).toBe(false);
			expect(checkPermission(user, 'delete:universe')).toBe(false);
			expect(checkPermission(user, '')).toBe(false);
		});

		it('should handle malformed permission strings', () => {
			const user: UserContext = {
				id: 'test-user',
				roles: ['user'],
				permissions: ['malformed-permission-without-colon', ':missing-action', 'missing-resource:'],
			};

			expect(checkPermission(user, 'malformed-permission-without-colon')).toBe(true);
			expect(checkPermission(user, ':missing-action')).toBe(true);
			expect(checkPermission(user, 'missing-resource:')).toBe(true);
		});

		it('should be case-sensitive for permissions', () => {
			const user: UserContext = {
				id: 'case-user',
				roles: [],
				permissions: ['read:agents'],
			};

			expect(checkPermission(user, 'read:agents')).toBe(true);
			expect(checkPermission(user, 'READ:AGENTS')).toBe(false);
			expect(checkPermission(user, 'Read:Agents')).toBe(false);
		});

		it('should handle extremely long permission names (DoS protection)', () => {
			const longPermission = `read:${'a'.repeat(10000)}`;
			const user: UserContext = {
				id: 'dos-test-user',
				roles: [],
				permissions: [longPermission],
			};

			expect(checkPermission(user, longPermission)).toBe(true);
			expect(checkPermission(user, `read:${'a'.repeat(9999)}`)).toBe(false);
		});
	});

	describe('Role Inheritance Advanced Tests', () => {
		it('should handle deep role inheritance chains', () => {
			const superUser: Role = {
				name: 'super-user',
				description: 'Super user role',
				permissions: ['manage:universe'],
				inherits: ['admin'],
			};

			expect(hasRolePermission(superUser, 'manage:universe')).toBe(true);
			expect(hasRolePermission(superUser, 'manage:agents')).toBe(true); // From admin
			expect(hasRolePermission(superUser, 'read:agents')).toBe(true); // From user via admin->operator->user
		});

		it('should handle circular inheritance gracefully', () => {
			const roleA: Role = {
				name: 'roleA',
				description: 'Role A',
				permissions: ['permA'],
				inherits: ['roleB'],
			};

			const roleB: Role = {
				name: 'roleB',
				description: 'Role B',
				permissions: ['permB'],
				inherits: ['roleA'], // Creates circular reference
			};

			// Mock ROLES to include circular roles temporarily
			const originalRoles = { ...ROLES };
			(ROLES as any).roleA = roleA;
			(ROLES as any).roleB = roleB;

			// Should not cause infinite loop (implementation dependent)
			expect(() => hasRolePermission(roleA, 'permA')).not.toThrow();
			expect(() => hasRolePermission(roleB, 'permB')).not.toThrow();

			// Restore original roles
			Object.keys(ROLES).forEach((key) => {
				if (key === 'roleA' || key === 'roleB') {
					delete (ROLES as any)[key];
				}
			});
			Object.assign(ROLES, originalRoles);
		});

		it('should handle non-existent inherited roles', () => {
			const brokenRole: Role = {
				name: 'broken-role',
				description: 'Role with broken inheritance',
				permissions: ['valid:permission'],
				inherits: ['non-existent-role', 'another-missing-role'],
			};

			expect(hasRolePermission(brokenRole, 'valid:permission')).toBe(true);
			expect(hasRolePermission(brokenRole, 'invalid:permission')).toBe(false);
		});

		it('should validate role inheritance for brAInwav hierarchy', () => {
			const user: UserContext = {
				id: 'brAInwav-hierarchy-user',
				roles: ['admin'],
				permissions: [],
			};

			// Admin should inherit from operator
			expect(checkPermission(user, 'read:metrics')).toBe(true); // From operator
			expect(checkPermission(user, 'execute:agents')).toBe(true); // From user via operator
			expect(checkPermission(user, 'manage:agents')).toBe(true); // Direct admin permission
		});
	});

	describe('User Context Validation', () => {
		it('should handle mixed direct and role-based permissions', () => {
			const user: UserContext = {
				id: 'mixed-user',
				roles: ['user'],
				permissions: ['manage:agents', 'read:metrics'], // Direct permissions beyond role
			};

			expect(checkPermission(user, 'read:agents')).toBe(true); // From role
			expect(checkPermission(user, 'execute:agents')).toBe(true); // From role
			expect(checkPermission(user, 'manage:agents')).toBe(true); // Direct permission
			expect(checkPermission(user, 'read:metrics')).toBe(true); // Direct permission
			expect(checkPermission(user, 'manage:users')).toBe(false); // Neither
		});

		it('should handle user with multiple roles', () => {
			const multiRoleUser: UserContext = {
				id: 'multi-role-user',
				roles: ['user', 'operator'],
				permissions: [],
			};

			const allPermissions = getUserPermissions(multiRoleUser);
			expect(allPermissions).toContain('read:agents');
			expect(allPermissions).toContain('execute:agents');
			expect(allPermissions).toContain('read:metrics');

			// Should not duplicate permissions
			const uniquePermissions = new Set(allPermissions);
			expect(uniquePermissions.size).toBe(allPermissions.length);
		});

		it('should handle user with conflicting role hierarchy', () => {
			const user: UserContext = {
				id: 'conflicting-user',
				roles: ['user', 'admin'], // Admin inherits user, so user is redundant
				permissions: [],
			};

			expect(checkPermission(user, 'read:agents')).toBe(true);
			expect(checkPermission(user, 'manage:agents')).toBe(true);
			expect(checkPermission(user, 'manage:users')).toBe(true);
		});

		it('should validate user ID uniqueness tracking', () => {
			const user1: UserContext = {
				id: 'unique-user-1',
				roles: ['admin'],
				permissions: [],
			};

			const user2: UserContext = {
				id: 'unique-user-2',
				roles: ['admin'],
				permissions: [],
			};

			// Same permissions but different users
			expect(checkPermission(user1, 'manage:agents')).toBe(true);
			expect(checkPermission(user2, 'manage:agents')).toBe(true);
			expect(user1.id).not.toBe(user2.id);
		});
	});

	describe('brAInwav Security Requirements', () => {
		it('should enforce brAInwav admin privileges', () => {
			const brAInwavAdmin: UserContext = {
				id: 'brAInwav-admin-user',
				roles: ['admin'],
				permissions: [],
			};

			expect(isAdmin(brAInwavAdmin)).toBe(true);
			expect(canManage(brAInwavAdmin, 'agents')).toBe(true);
			expect(canManage(brAInwavAdmin, 'users')).toBe(true);
			expect(canExecuteAgent(brAInwavAdmin)).toBe(true);
		});

		it('should enforce brAInwav operator restrictions', () => {
			const brAInwavOperator: UserContext = {
				id: 'brAInwav-operator-user',
				roles: ['operator'],
				permissions: [],
			};

			expect(isAdmin(brAInwavOperator)).toBe(false);
			expect(canManage(brAInwavOperator, 'agents')).toBe(false);
			expect(canManage(brAInwavOperator, 'users')).toBe(false);
			expect(canExecuteAgent(brAInwavOperator)).toBe(true);
			expect(checkPermission(brAInwavOperator, 'read:metrics')).toBe(true);
		});

		it('should validate brAInwav user baseline permissions', () => {
			const brAInwavUser: UserContext = {
				id: 'brAInwav-basic-user',
				roles: ['user'],
				permissions: [],
			};

			expect(isAdmin(brAInwavUser)).toBe(false);
			expect(canExecuteAgent(brAInwavUser)).toBe(true);
			expect(checkPermission(brAInwavUser, 'read:agents')).toBe(true);
			expect(checkPermission(brAInwavUser, 'manage:agents')).toBe(false);
			expect(checkPermission(brAInwavUser, 'read:metrics')).toBe(false);
		});

		it('should handle brAInwav API key context creation', () => {
			const apiKeyInfo = {
				id: 'brAInwav-api-key-123',
				roles: ['operator'],
				permissions: ['read:agents', 'execute:agents', 'read:metrics'],
			};

			const userContext = createUserContextFromAPIKey(apiKeyInfo);

			expect(userContext.id).toBe('brAInwav-api-key-123');
			expect(userContext.apiKeyId).toBe('brAInwav-api-key-123');
			expect(userContext.roles).toEqual(['operator']);
			expect(checkPermission(userContext, 'read:agents')).toBe(true);
			expect(checkPermission(userContext, 'execute:agents')).toBe(true);
			expect(checkPermission(userContext, 'read:metrics')).toBe(true);
		});
	});

	describe('Permission System Resilience', () => {
		it('should handle concurrent permission checks', async () => {
			const user: UserContext = {
				id: 'concurrent-test-user',
				roles: ['admin'],
				permissions: [],
			};

			const promises = Array(100)
				.fill(0)
				.map(async () => {
					return Promise.all([
						checkPermission(user, 'read:agents'),
						checkPermission(user, 'manage:agents'),
						checkPermission(user, 'read:metrics'),
						getUserPermissions(user),
					]);
				});

			const results = await Promise.all(promises);

			// All results should be consistent
			results.forEach(([read, manage, metrics, allPerms]) => {
				expect(read).toBe(true);
				expect(manage).toBe(true);
				expect(metrics).toBe(true);
				expect(allPerms.length).toBeGreaterThan(0);
			});
		});

		it('should handle memory-efficient permission enumeration', () => {
			const user: UserContext = {
				id: 'memory-test-user',
				roles: ['admin'],
				permissions: Array(1000)
					.fill(0)
					.map((_, i) => `custom:permission${i}`),
			};

			const allPermissions = getUserPermissions(user);

			// Should include all custom permissions plus role permissions
			expect(allPermissions.length).toBeGreaterThanOrEqual(1000);
			expect(allPermissions).toContain('read:agents'); // From admin role
			expect(allPermissions).toContain('custom:permission0'); // Direct permission
			expect(allPermissions).toContain('custom:permission999'); // Direct permission
		});

		it('should validate permission system consistency', () => {
			// Test all defined permissions exist in at least one role
			const allRolePermissions = new Set<string>();
			Object.values(ROLES).forEach((role) => {
				for (const perm of role.permissions) {
					allRolePermissions.add(perm);
				}
			});

			const definedPermissions = Object.keys(PERMISSIONS);
			definedPermissions.forEach((permission) => {
				expect(allRolePermissions.has(permission)).toBe(true);
			});
		});

		it('should handle brAInwav high-frequency authorization checks', () => {
			const user: UserContext = {
				id: 'high-freq-user',
				roles: ['admin'],
				permissions: [],
			};

			const startTime = Date.now();
			const iterations = 1000;

			for (let i = 0; i < iterations; i++) {
				checkPermission(user, 'read:agents');
				checkPermission(user, 'execute:agents');
				checkPermission(user, 'manage:agents');
				isAdmin(user);
				canExecuteAgent(user);
			}

			const endTime = Date.now();
			const totalTime = endTime - startTime;

			// brAInwav performance requirement: 1000 authorization checks in under 100ms
			expect(totalTime).toBeLessThan(100);
		});
	});

	describe('Resource-Specific Authorization', () => {
		it('should validate resource-specific management permissions', () => {
			const user: UserContext = {
				id: 'resource-user',
				roles: ['admin'],
				permissions: [],
			};

			expect(canManage(user, 'agents')).toBe(true);
			expect(canManage(user, 'users')).toBe(true);
			expect(canManage(user, 'metrics')).toBe(false); // No manage:metrics permission defined
			expect(canManage(user, 'nonexistent')).toBe(false);
		});

		it('should handle dynamic resource permission checking', () => {
			const user: UserContext = {
				id: 'dynamic-user',
				roles: [],
				permissions: ['read:agents', 'execute:agents', 'manage:custom-resource'],
			};

			expect(checkPermission(user, 'read:agents')).toBe(true);
			expect(checkPermission(user, 'execute:agents')).toBe(true);
			expect(canManage(user, 'custom-resource')).toBe(true);
			expect(canManage(user, 'other-resource')).toBe(false);
		});

		it('should validate brAInwav agent execution permissions', () => {
			const executorUser: UserContext = {
				id: 'brAInwav-executor',
				roles: ['user'],
				permissions: [],
			};

			const viewerUser: UserContext = {
				id: 'brAInwav-viewer',
				roles: [],
				permissions: ['read:agents'], // Can read but not execute
			};

			expect(canExecuteAgent(executorUser)).toBe(true);
			expect(canExecuteAgent(viewerUser)).toBe(false);
		});
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle null/undefined user context gracefully', () => {
			// @ts-expect-error Testing null handling
			expect(() => checkPermission(null, 'read:agents')).toThrow();
			// @ts-expect-error Testing undefined handling
			expect(() => checkPermission(undefined, 'read:agents')).toThrow();
		});

		it('should handle malformed user context', () => {
			const malformedUser = {
				id: 'malformed-user',
				// Missing roles and permissions
			} as UserContext;

			expect(() => checkPermission(malformedUser, 'read:agents')).toThrow();
		});

		it('should handle permission checks with empty strings', () => {
			const user: UserContext = {
				id: 'empty-string-user',
				roles: ['user'],
				permissions: [],
			};

			expect(checkPermission(user, '')).toBe(false);
			expect(checkPermission(user, '   ')).toBe(false); // Whitespace
		});

		it('should validate role name consistency', () => {
			const userWithInvalidRole: UserContext = {
				id: 'invalid-role-user',
				roles: ['NonExistentRole', 'AnotherFakeRole'],
				permissions: [],
			};

			expect(checkPermission(userWithInvalidRole, 'read:agents')).toBe(false);
			expect(getUserPermissions(userWithInvalidRole)).toEqual([]);
			expect(isAdmin(userWithInvalidRole)).toBe(false);
		});
	});
});
