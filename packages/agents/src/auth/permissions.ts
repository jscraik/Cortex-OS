import type { Permission, Role, UserContext } from './types';

// Define permissions
export const PERMISSIONS: Record<string, Permission> = {
	'read:agents': {
		name: 'read:agents',
		description: 'Read agent information',
		resource: 'agents',
		action: 'read',
	},
	'execute:agents': {
		name: 'execute:agents',
		description: 'Execute agents',
		resource: 'agents',
		action: 'execute',
	},
	'manage:agents': {
		name: 'manage:agents',
		description: 'Manage agents (create, update, delete)',
		resource: 'agents',
		action: 'manage',
	},
	'read:metrics': {
		name: 'read:metrics',
		description: 'Read system metrics',
		resource: 'metrics',
		action: 'read',
	},
	'manage:users': {
		name: 'manage:users',
		description: 'Manage users and permissions',
		resource: 'users',
		action: 'manage',
	},
};

// Define roles with their permissions
export const ROLES: Record<string, Role> = {
	user: {
		name: 'user',
		description: 'Regular user with basic permissions',
		permissions: ['read:agents', 'execute:agents'],
	},
	operator: {
		name: 'operator',
		description: 'Operator with extended permissions',
		permissions: ['read:agents', 'execute:agents', 'read:metrics'],
		inherits: ['user'],
	},
	admin: {
		name: 'admin',
		description: 'Administrator with full permissions',
		permissions: ['read:agents', 'execute:agents', 'manage:agents', 'read:metrics', 'manage:users'],
		inherits: ['operator'],
	},
};

/**
 * Check if a user has a specific permission
 * @param user The user context
 * @param permission The permission to check
 * @returns True if the user has the permission
 */
export function checkPermission(user: UserContext, permission: string): boolean {
	// Check direct permissions
	if (user.permissions.includes(permission)) {
		return true;
	}

	// Check role-based permissions
	for (const roleName of user.roles) {
		const role = ROLES[roleName];
		if (role && hasRolePermission(role, permission)) {
			return true;
		}
	}

	return false;
}

/**
 * Check if a role has a specific permission (including inherited permissions)
 * @param role The role to check
 * @param permission The permission to check
 * @returns True if the role has the permission
 */
export function hasRolePermission(role: Role, permission: string): boolean {
	// Check direct permissions
	if (role.permissions.includes(permission)) {
		return true;
	}

	// Check inherited roles
	if (role.inherits) {
		for (const inheritedRoleName of role.inherits) {
			const inheritedRole = ROLES[inheritedRoleName];
			if (inheritedRole && hasRolePermission(inheritedRole, permission)) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Check if a user has a specific role
 * @param user The user context
 * @param role The role to check
 * @returns True if the user has the role
 */
export function hasRole(user: UserContext, role: string): boolean {
	return user.roles.includes(role);
}

/**
 * Get all permissions for a user (including inherited from roles)
 * @param user The user context
 * @returns Array of all permissions the user has
 */
export function getUserPermissions(user: UserContext): string[] {
	const permissions = new Set<string>();

	// Add direct permissions
	user.permissions.forEach((permission) => permissions.add(permission));

	// Add role-based permissions
	for (const roleName of user.roles) {
		const role = ROLES[roleName];
		if (role) {
			addRolePermissions(role, permissions);
		}
	}

	return Array.from(permissions);
}

/**
 * Add all permissions from a role (including inherited) to a set
 * @param role The role
 * @param permissions The set to add permissions to
 */
function addRolePermissions(role: Role, permissions: Set<string>): void {
	// Add direct permissions
	role.permissions.forEach((permission) => permissions.add(permission));

	// Add inherited permissions
	if (role.inherits) {
		for (const inheritedRoleName of role.inherits) {
			const inheritedRole = ROLES[inheritedRoleName];
			if (inheritedRole) {
				addRolePermissions(inheritedRole, permissions);
			}
		}
	}
}

/**
 * Check if a user is an admin
 * @param user The user context
 * @returns True if the user is an admin
 */
export function isAdmin(user: UserContext): boolean {
	return hasRole(user, 'admin');
}

/**
 * Check if a user can manage a resource
 * @param user The user context
 * @param resource The resource type
 * @returns True if the user can manage the resource
 */
export function canManage(user: UserContext, resource: string): boolean {
	return checkPermission(user, `manage:${resource}`);
}

/**
 * Check if a user can execute an agent
 * @param user The user context
 * @returns True if the user can execute agents
 */
export function canExecuteAgent(user: UserContext): boolean {
	return checkPermission(user, 'execute:agents');
}

/**
 * Create a user context from API key information
 * @param apiKey The API key information
 * @returns The user context
 */
export function createUserContextFromAPIKey(apiKey: {
	id: string;
	roles: string[];
	permissions: string[];
}): UserContext {
	return {
		id: apiKey.id,
		roles: apiKey.roles,
		permissions: apiKey.permissions,
		apiKeyId: apiKey.id,
	};
}
