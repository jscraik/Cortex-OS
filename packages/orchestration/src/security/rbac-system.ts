/**
 * nO Master Agent Loop - Role-Based Access Control (RBAC) System
 * 
 * Provides comprehensive RBAC with roles, permissions, and policy enforcement
 * Supports hierarchical roles and dynamic permission evaluation.
 * 
 * Co-authored-by: brAInwav Development Team
 */

import { securityMetrics } from '../monitoring/prometheus-metrics.js';
import type { UserClaims } from './oauth-provider.js';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[]; // Permission IDs
  inherits?: string[]; // Parent role IDs
  metadata?: Record<string, unknown>;
}

export interface PolicyContext {
  user: UserClaims;
  resource: string;
  action: string;
  environment?: Record<string, unknown>;
  request?: {
    ip?: string;
    userAgent?: string;
    timestamp?: number;
  };
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  appliedPolicies?: string[];
  missingPermissions?: string[];
}

/**
 * RBAC System Implementation
 */
export class RBACSystem {
  private permissions: Map<string, Permission> = new Map();
  private roles: Map<string, Role> = new Map();
  private userRoles: Map<string, string[]> = new Map(); // userId -> roleIds

  constructor() {
    this.initializeDefaultPermissions();
    this.initializeDefaultRoles();
  }

  /**
   * Add a permission to the system
   */
  addPermission(permission: Permission): void {
    this.permissions.set(permission.id, permission);
  }

  /**
   * Add a role to the system
   */
  addRole(role: Role): void {
    this.roles.set(role.id, role);
  }

  /**
   * Assign role to user
   */
  assignRole(userId: string, roleId: string): boolean {
    if (!this.roles.has(roleId)) {
      return false;
    }

    const userRoles = this.userRoles.get(userId) || [];
    if (!userRoles.includes(roleId)) {
      userRoles.push(roleId);
      this.userRoles.set(userId, userRoles);
    }
    return true;
  }

  /**
   * Remove role from user
   */
  removeRole(userId: string, roleId: string): boolean {
    const userRoles = this.userRoles.get(userId);
    if (!userRoles) {
      return false;
    }

    const index = userRoles.indexOf(roleId);
    if (index > -1) {
      userRoles.splice(index, 1);
      this.userRoles.set(userId, userRoles);
      return true;
    }
    return false;
  }

  /**
   * Check if user is authorized for a specific action
   */
  async authorize(context: PolicyContext): Promise<AuthorizationResult> {
    // Track authorization performance (disabled for now)
    // const _startTime = Date.now();

    try {
      // Get user roles from claims or stored assignments
      const userRoles = this.getUserRoles(context.user);

      // Get all permissions for user roles
      const userPermissions = this.getUserPermissions(userRoles);

      // Check if user has required permission
      const requiredPermission = `${context.resource}:${context.action}`;
      const hasPermission = this.checkPermission(
        userPermissions,
        context.resource,
        context.action,
        context
      );

      // Log authorization attempt
      securityMetrics.authzDecisions
        .labels(context.resource, context.action, hasPermission ? 'allow' : 'deny')
        .inc();

      if (hasPermission) {
        return {
          allowed: true,
          reason: `User has permission: ${requiredPermission}`,
          appliedPolicies: userRoles,
        };
      } else {
        return {
          allowed: false,
          reason: `User lacks permission: ${requiredPermission}`,
          missingPermissions: [requiredPermission],
        };
      }

    } catch (error) {
      securityMetrics.authzDecisions
        .labels(context.resource, context.action, 'error')
        .inc();

      return {
        allowed: false,
        reason: `Authorization error: ${error}`,
      };
    } finally {
      // Authorization check completed
    }
  }

  /**
   * Get user roles from various sources
   */
  private getUserRoles(user: UserClaims): string[] {
    // Combine roles from JWT claims and stored assignments
    const claimRoles = user.roles || [];
    const storedRoles = this.userRoles.get(user.sub) || [];
    const groupRoles = this.getGroupRoles(user.groups || []);

    return [...new Set([...claimRoles, ...storedRoles, ...groupRoles])];
  }

  /**
   * Get roles from user groups
   */
  private getGroupRoles(groups: string[]): string[] {
    const groupRoleMap: Record<string, string[]> = {
      'admin': ['system_admin', 'operator'],
      'operators': ['operator'],
      'developers': ['developer'],
      'users': ['user'],
    };

    const roles: string[] = [];
    groups.forEach(group => {
      const groupRoles = groupRoleMap[group.toLowerCase()];
      if (groupRoles) {
        roles.push(...groupRoles);
      }
    });

    return roles;
  }

  /**
   * Get all permissions for given roles
   */
  private getUserPermissions(roleIds: string[]): Permission[] {
    const permissions: Permission[] = [];
    const processedRoles = new Set<string>();

    const processRole = (roleId: string) => {
      if (processedRoles.has(roleId)) {
        return; // Avoid circular references
      }
      processedRoles.add(roleId);

      const role = this.roles.get(roleId);
      if (!role) return;

      // Add direct permissions
      role.permissions.forEach(permId => {
        const permission = this.permissions.get(permId);
        if (permission) {
          permissions.push(permission);
        }
      });

      // Process inherited roles
      if (role.inherits) {
        role.inherits.forEach(parentRoleId => {
          processRole(parentRoleId);
        });
      }
    };

    roleIds.forEach(roleId => {
      processRole(roleId);
    });

    return permissions;
  }

  /**
   * Check if user has specific permission
   */
  private checkPermission(
    userPermissions: Permission[],
    resource: string,
    action: string,
    context: PolicyContext
  ): boolean {
    return userPermissions.some(permission => {
      // Check resource and action match
      if (permission.resource !== resource && permission.resource !== '*') {
        return false;
      }

      if (permission.action !== action && permission.action !== '*') {
        return false;
      }

      // Check conditions if present
      if (permission.conditions) {
        return this.evaluateConditions(permission.conditions, context);
      }

      return true;
    });
  }

  /**
   * Evaluate permission conditions
   */
  private evaluateConditions(
    conditions: Record<string, unknown>,
    context: PolicyContext
  ): boolean {
    // Simple condition evaluation
    // In production, this would be more sophisticated

    if (conditions.time_range) {
      const timeRange = conditions.time_range as { start: string; end: string };
      const currentHour = new Date().getHours();
      const startHour = parseInt(timeRange.start.split(':')[0]);
      const endHour = parseInt(timeRange.end.split(':')[0]);

      if (currentHour < startHour || currentHour > endHour) {
        return false;
      }
    }

    if (conditions.ip_range && context.request?.ip) {
      const allowedIPs = conditions.ip_range as string[];
      if (!allowedIPs.includes(context.request.ip)) {
        return false;
      }
    }

    if (conditions.environment && context.environment) {
      const envConditions = conditions.environment as Record<string, unknown>;
      for (const [key, value] of Object.entries(envConditions)) {
        if (context.environment[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Initialize default permissions
   */
  private initializeDefaultPermissions(): void {
    const defaultPermissions: Permission[] = [
      // System administration
      {
        id: 'system:admin',
        name: 'System Administration',
        resource: 'system',
        action: '*',
        description: 'Full system administration access',
      },
      {
        id: 'system:read',
        name: 'System Read',
        resource: 'system',
        action: 'read',
        description: 'Read system information',
      },

      // nO orchestration permissions
      {
        id: 'no:execute',
        name: 'Execute nO Requests',
        resource: 'no',
        action: 'execute',
        description: 'Execute nO orchestration requests',
      },
      {
        id: 'no:read',
        name: 'Read nO Status',
        resource: 'no',
        action: 'read',
        description: 'Read nO execution status and history',
      },
      {
        id: 'no:cancel',
        name: 'Cancel nO Executions',
        resource: 'no',
        action: 'cancel',
        description: 'Cancel running nO executions',
      },

      // Agent management
      {
        id: 'agents:manage',
        name: 'Manage Agents',
        resource: 'agents',
        action: '*',
        description: 'Full agent management access',
      },
      {
        id: 'agents:read',
        name: 'Read Agent Status',
        resource: 'agents',
        action: 'read',
        description: 'Read agent status and metrics',
      },

      // Monitoring and metrics
      {
        id: 'monitoring:read',
        name: 'Read Monitoring Data',
        resource: 'monitoring',
        action: 'read',
        description: 'Access monitoring and metrics data',
      },
      {
        id: 'monitoring:admin',
        name: 'Monitoring Administration',
        resource: 'monitoring',
        action: '*',
        description: 'Full monitoring system access',
      },

      // Configuration management
      {
        id: 'config:read',
        name: 'Read Configuration',
        resource: 'config',
        action: 'read',
        description: 'Read system configuration',
      },
      {
        id: 'config:write',
        name: 'Write Configuration',
        resource: 'config',
        action: 'write',
        description: 'Modify system configuration',
      },
    ];

    defaultPermissions.forEach(permission => {
      this.addPermission(permission);
    });
  }

  /**
   * Initialize default roles
   */
  private initializeDefaultRoles(): void {
    const defaultRoles: Role[] = [
      // System Administrator
      {
        id: 'system_admin',
        name: 'System Administrator',
        description: 'Full system access with all permissions',
        permissions: [
          'system:admin',
          'no:execute',
          'no:read',
          'no:cancel',
          'agents:manage',
          'monitoring:admin',
          'config:write',
        ],
      },

      // Operator
      {
        id: 'operator',
        name: 'System Operator',
        description: 'Operational access for running and monitoring nO system',
        permissions: [
          'system:read',
          'no:execute',
          'no:read',
          'no:cancel',
          'agents:read',
          'monitoring:read',
          'config:read',
        ],
      },

      // Developer
      {
        id: 'developer',
        name: 'Developer',
        description: 'Development and testing access',
        permissions: [
          'no:execute',
          'no:read',
          'agents:read',
          'monitoring:read',
          'config:read',
        ],
      },

      // Read-only User
      {
        id: 'user',
        name: 'User',
        description: 'Basic read-only access',
        permissions: [
          'no:read',
          'agents:read',
          'monitoring:read',
        ],
      },

      // Service Account
      {
        id: 'service_account',
        name: 'Service Account',
        description: 'Automated service access',
        permissions: [
          'no:execute',
          'no:read',
          'agents:read',
        ],
      },
    ];

    defaultRoles.forEach(role => {
      this.addRole(role);
    });
  }

  /**
   * Get role information
   */
  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  /**
   * Get permission information
   */
  getPermission(permissionId: string): Permission | undefined {
    return this.permissions.get(permissionId);
  }

  /**
   * List all roles
   */
  listRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * List all permissions
   */
  listPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Get user's effective permissions
   */
  getUserEffectivePermissions(userId: string): Permission[] {
    const userRoles = this.userRoles.get(userId) || [];
    return this.getUserPermissions(userRoles);
  }
}

// Export singleton instance
export const rbacSystem = new RBACSystem();
