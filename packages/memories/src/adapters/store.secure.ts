import type { SecureContext } from '../domain/types.js';
import type { Memory, MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

export interface SecureStoreConfig {
	denyMessage?: string;
	auditRetentionDays?: number;
	enablePermissionCache?: boolean;
	cacheTTL?: number;
	enableHierarchicalRoles?: boolean;
	defaultPolicy?: 'allow' | 'deny';
}

export interface AuditLogEntry {
	id: string;
	timestamp: string;
	action: 'upsert' | 'get' | 'delete' | 'search';
	subject: string;
	role: string;
	memoryId?: string;
	success: boolean;
	reason?: string;
	namespace: string;
	attributes?: Record<string, any>;
}

export interface RoleHierarchy {
	[role: string]: string[]; // role -> [inherits from roles]
}

export class SecureMemoryStore implements MemoryStore {
	private auditLogs = new Map<string, AuditLogEntry[]>();
	private permissionCache = new Map<string, { granted: boolean; expires: number }>();
	private userRoles = new Map<string, Set<string>>();
	private roleHierarchy: RoleHierarchy = {
		superadmin: ['admin'],
		admin: ['manager', 'cfo', 'auditor'],
		manager: ['editor', 'finance-manager', 'employee'],
		editor: ['user'],
		employee: ['user'],
		cfo: ['finance-manager'],
		'finance-manager': ['user'],
		auditor: ['user'],
	};

	constructor(
		private readonly store: MemoryStore,
		private readonly config: SecureStoreConfig = {},
	) {
		this.config = {
			denyMessage: 'Access denied',
			auditRetentionDays: 30,
			enablePermissionCache: false,
			cacheTTL: 60000,
			enableHierarchicalRoles: true,
			defaultPolicy: 'allow',
			...config,
		};

		// Start cleanup timer for audit logs
		setInterval(() => this.cleanupAuditLogs(), 24 * 60 * 60 * 1000);
	}

	async upsert(memory: Memory, namespace = 'default', context?: SecureContext): Promise<Memory> {
		if (!context) {
			throw new Error('Security context required for upsert operation');
		}

		// Ensure user has their role
		await this.grantRole(context.subject, context.role);

		const auditId = this.generateAuditId();

		try {
			// Check write permission
			if (!(await this.checkPermission(memory, 'write', context, namespace))) {
				await this.logAudit({
					id: auditId,
					action: 'upsert',
					subject: context.subject,
					role: context.role,
					memoryId: memory.id,
					success: false,
					reason: this.config.denyMessage,
					namespace,
					attributes: context.attributes,
				});
				throw new Error(this.config.denyMessage!);
			}

			// Check if it's an update (existing memory)
			const existing = await this.store.get(memory.id, namespace);
			if (existing && !(await this.checkPermission(existing, 'write', context, namespace))) {
				await this.logAudit({
					id: auditId,
					action: 'upsert',
					subject: context.subject,
					role: context.role,
					memoryId: memory.id,
					success: false,
					reason: 'Cannot update existing memory',
					namespace,
					attributes: context.attributes,
				});
				throw new Error(this.config.denyMessage!);
			}

			const result = await this.store.upsert(memory, namespace);

			await this.logAudit({
				id: auditId,
				action: 'upsert',
				subject: context.subject,
				role: context.role,
				memoryId: memory.id,
				success: true,
				namespace,
				attributes: context.attributes,
			});

			return result;
		} catch (error) {
			await this.logAudit({
				id: auditId,
				action: 'upsert',
				subject: context.subject,
				role: context.role,
				memoryId: memory.id,
				success: false,
				reason: error instanceof Error ? error.message : 'Unknown error',
				namespace,
				attributes: context.attributes,
			});
			throw error;
		}
	}

	async get(id: string, namespace = 'default', context?: SecureContext): Promise<Memory | null> {
		if (!context) {
			throw new Error('Security context required for get operation');
		}

		// Ensure user has their role
		await this.grantRole(context.subject, context.role);

		const auditId = this.generateAuditId();

		try {
			const memory = await this.store.get(id, namespace);

			if (!memory) {
				await this.logAudit({
					id: auditId,
					action: 'get',
					subject: context.subject,
					role: context.role,
					memoryId: id,
					success: true,
					reason: 'Memory not found',
					namespace,
					attributes: context.attributes,
				});
				return null;
			}

			if (!(await this.checkPermission(memory, 'read', context, namespace))) {
				await this.logAudit({
					id: auditId,
					action: 'get',
					subject: context.subject,
					role: context.role,
					memoryId: id,
					success: false,
					reason: this.config.denyMessage,
					namespace,
					attributes: context.attributes,
				});
				throw new Error(this.config.denyMessage!);
			}

			await this.logAudit({
				id: auditId,
				action: 'get',
				subject: context.subject,
				role: context.role,
				memoryId: id,
				success: true,
				namespace,
				attributes: context.attributes,
			});

			return memory;
		} catch (error) {
			await this.logAudit({
				id: auditId,
				action: 'get',
				subject: context.subject,
				role: context.role,
				memoryId: id,
				success: false,
				reason: error instanceof Error ? error.message : 'Unknown error',
				namespace,
				attributes: context.attributes,
			});
			throw error;
		}
	}

	async delete(id: string, namespace = 'default', context?: SecureContext): Promise<void> {
		if (!context) {
			throw new Error('Security context required for delete operation');
		}

		// Ensure user has their role
		await this.grantRole(context.subject, context.role);

		const auditId = this.generateAuditId();

		try {
			const memory = await this.store.get(id, namespace);

			if (memory) {
				if (!(await this.checkPermission(memory, 'delete', context, namespace))) {
					await this.logAudit({
						id: auditId,
						action: 'delete',
						subject: context.subject,
						role: context.role,
						memoryId: id,
						success: false,
						reason: this.config.denyMessage,
						namespace,
						attributes: context.attributes,
					});
					throw new Error(this.config.denyMessage!);
				}
			}

			await this.store.delete(id, namespace);

			await this.logAudit({
				id: auditId,
				action: 'delete',
				subject: context.subject,
				role: context.role,
				memoryId: id,
				success: true,
				namespace,
				attributes: context.attributes,
			});
		} catch (error) {
			await this.logAudit({
				id: auditId,
				action: 'delete',
				subject: context.subject,
				role: context.role,
				memoryId: id,
				success: false,
				reason: error instanceof Error ? error.message : 'Unknown error',
				namespace,
				attributes: context.attributes,
			});
			throw error;
		}
	}

	async searchByText(
		q: TextQuery,
		namespace = 'default',
		context?: SecureContext,
	): Promise<Memory[]> {
		if (!context) {
			throw new Error('Security context required for search operation');
		}

		// Ensure user has their role
		await this.grantRole(context.subject, context.role);

		const auditId = this.generateAuditId();

		try {
			const allResults = await this.store.searchByText(q, namespace);

			// Filter results based on read permissions
			const filteredResults = [];
			for (const memory of allResults) {
				if (await this.checkPermission(memory, 'read', context, namespace)) {
					filteredResults.push(memory);
				}
			}

			await this.logAudit({
				id: auditId,
				action: 'search',
				subject: context.subject,
				role: context.role,
				success: true,
				namespace,
				attributes: context.attributes,
			});

			return filteredResults;
		} catch (error) {
			await this.logAudit({
				id: auditId,
				action: 'search',
				subject: context.subject,
				role: context.role,
				success: false,
				reason: error instanceof Error ? error.message : 'Unknown error',
				namespace,
				attributes: context.attributes,
			});
			throw error;
		}
	}

	async searchByVector(
		q: VectorQuery,
		namespace = 'default',
		context?: SecureContext,
	): Promise<(Memory & { score: number })[]> {
		if (!context) {
			throw new Error('Security context required for search operation');
		}

		// Ensure user has their role
		await this.grantRole(context.subject, context.role);

		const auditId = this.generateAuditId();

		try {
			const allResults = await this.store.searchByVector(q, namespace);

			// Filter results based on read permissions
			const filteredResults = [];
			for (const result of allResults) {
				if (await this.checkPermission(result, 'read', context, namespace)) {
					filteredResults.push(result);
				}
			}

			await this.logAudit({
				id: auditId,
				action: 'search',
				subject: context.subject,
				role: context.role,
				success: true,
				namespace,
				attributes: context.attributes,
			});

			return filteredResults;
		} catch (error) {
			await this.logAudit({
				id: auditId,
				action: 'search',
				subject: context.subject,
				role: context.role,
				success: false,
				reason: error instanceof Error ? error.message : 'Unknown error',
				namespace,
				attributes: context.attributes,
			});
			throw error;
		}
	}

	async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
		// Purge expired doesn't require context as it's a system operation
		return this.store.purgeExpired(nowISO, namespace);
	}

	async list(
		namespace = 'default',
		limit?: number,
		offset?: number,
		context?: SecureContext,
	): Promise<Memory[]> {
		if (!context) {
			throw new Error('Security context required for list operation');
		}

		// Ensure user has their role
		await this.grantRole(context.subject, context.role);

		const auditId = this.generateAuditId();

		try {
			const allMemories = await this.store.list(namespace, limit, offset);

			// Filter based on read permissions
			const filteredMemories = [];
			for (const memory of allMemories) {
				if (await this.checkPermission(memory, 'read', context, namespace)) {
					filteredMemories.push(memory);
				}
			}

			await this.logAudit({
				id: auditId,
				action: 'list',
				subject: context.subject,
				role: context.role,
				success: true,
				namespace,
				attributes: context.attributes,
			});

			return filteredMemories;
		} catch (error) {
			await this.logAudit({
				id: auditId,
				action: 'list',
				subject: context.subject,
				role: context.role,
				success: false,
				reason: error instanceof Error ? error.message : 'Unknown error',
				namespace,
				attributes: context.attributes,
			});
			throw error;
		}
	}

	// Role management methods
	async grantRole(subject: string, role: string): Promise<void> {
		if (!this.userRoles.has(subject)) {
			this.userRoles.set(subject, new Set());
		}
		this.userRoles.get(subject)?.add(role);
	}

	async revokeRole(subject: string, role: string): Promise<void> {
		const roles = this.userRoles.get(subject);
		if (roles) {
			roles.delete(role);
			if (roles.size === 0) {
				this.userRoles.delete(subject);
			}
		}
	}

	getUserRoles(subject: string, includeInherited: boolean = true): string[] {
		const roles = Array.from(this.userRoles.get(subject) || []);

		// Add inherited roles if enabled and requested
		if (this.config.enableHierarchicalRoles && includeInherited) {
			const allRoles = new Set(roles);
			for (const role of roles) {
				this.addInheritedRoles(role, allRoles);
			}
			return Array.from(allRoles);
		}

		return roles;
	}

	// Audit logging methods
	async getAuditLogs(memoryId?: string): Promise<AuditLogEntry[]> {
		if (memoryId) {
			return this.auditLogs.get(memoryId) || [];
		}

		// Return all audit logs
		const allLogs: AuditLogEntry[] = [];
		for (const logs of this.auditLogs.values()) {
			allLogs.push(...logs);
		}
		return allLogs;
	}

	async queryAuditLogs(filter: {
		subject?: string;
		action?: string;
		success?: boolean;
		startTime?: string;
		endTime?: string;
	}): Promise<AuditLogEntry[]> {
		let results: AuditLogEntry[] = [];

		if (filter.subject || filter.action || filter.success) {
			// Search across all logs
			for (const logs of this.auditLogs.values()) {
				for (const log of logs) {
					if (
						(!filter.subject || log.subject === filter.subject) &&
						(!filter.action || log.action === filter.action) &&
						(filter.success === undefined || log.success === filter.success)
					) {
						results.push(log);
					}
				}
			}
		} else {
			// Return all logs
			for (const logs of this.auditLogs.values()) {
				results.push(...logs);
			}
		}

		// Apply time filters
		if (filter.startTime || filter.endTime) {
			results = results.filter((log) => {
				const logTime = new Date(log.timestamp).getTime();
				const startTime = filter.startTime ? new Date(filter.startTime).getTime() : 0;
				const endTime = filter.endTime ? new Date(filter.endTime).getTime() : Infinity;
				return logTime >= startTime && logTime <= endTime;
			});
		}

		return results;
	}

	// Private helper methods
	private async checkPermission(
		memory: Memory,
		permission: 'read' | 'write' | 'delete',
		context: SecureContext,
		namespace: string,
	): Promise<boolean> {
		// Check cache first
		if (this.config.enablePermissionCache) {
			const cacheKey = `${context.subject}:${memory.id}:${permission}:${namespace}`;
			const cached = this.permissionCache.get(cacheKey);

			if (cached && cached.expires > Date.now()) {
				return cached.granted;
			}
		}

		// Get access control rules
		const access =
			(memory.metadata?.access as {
				read?: string[];
				write?: string[];
				delete?: string[];
			}) || {};

		const allowedRoles = access[permission] || [];

		// Default to default policy if no rules
		if (allowedRoles.length === 0) {
			const granted = this.config.defaultPolicy === 'allow';
			this.updateCache(context.subject, memory.id, permission, namespace, granted);
			return granted;
		}

		// Check ownership
		if (memory.metadata?.owner === context.subject) {
			if (allowedRoles.includes('owner')) {
				this.updateCache(context.subject, memory.id, permission, namespace, true);
				return true;
			}
		}

		// Get user roles (including inherited)
		const userRoles = this.getUserRoles(context.subject, true);

		// Check if user has any of the allowed roles
		let hasPermission = allowedRoles.some((role) => {
			if (role === '*') return true; // Wildcard
			if (role === 'owner' && memory.metadata?.owner === context.subject) return true;
			return userRoles.includes(role);
		});

		// Check additional policies
		if (hasPermission) {
			// Check time-based restrictions
			if (memory.metadata?.access?.timeRestriction) {
				const restriction = memory.metadata.access.timeRestriction;
				if (!this.checkTimeRestriction(restriction)) {
					hasPermission = false;
				}
			}

			// Check attribute-based policies
			if (hasPermission && memory.metadata?.access?.attributes) {
				const required = memory.metadata.access.attributes.required || [];
				if (!this.checkAttributes(required, context.attributes || {})) {
					hasPermission = false;
				}
			}
		}

		this.updateCache(context.subject, memory.id, permission, namespace, hasPermission);
		return hasPermission;
	}

	private checkTimeRestriction(restriction: { allowedHours: number[]; timezone: string }): boolean {
		const now = new Date();
		const hour = now.getHours();
		return restriction.allowedHours.includes(hour);
	}

	private checkAttributes(required: string[], attributes: Record<string, any>): boolean {
		return required.every((req) => {
			const [key, value] = req.split(':');
			return attributes[key] === value || attributes[key] === Number(value);
		});
	}

	private addInheritedRoles(role: string, allRoles: Set<string>): void {
		const inherited = this.roleHierarchy[role] || [];
		for (const inheritedRole of inherited) {
			if (!allRoles.has(inheritedRole)) {
				allRoles.add(inheritedRole);
				this.addInheritedRoles(inheritedRole, allRoles);
			}
		}
	}

	private updateCache(
		subject: string,
		memoryId: string,
		permission: string,
		namespace: string,
		granted: boolean,
	): void {
		if (!this.config.enablePermissionCache) return;

		const cacheKey = `${subject}:${memoryId}:${permission}:${namespace}`;
		const expires = Date.now() + (this.config.cacheTTL || 60000);

		this.permissionCache.set(cacheKey, { granted, expires });

		// Clean expired entries
		if (this.permissionCache.size > 1000) {
			const now = Date.now();
			for (const [key, value] of this.permissionCache.entries()) {
				if (value.expires <= now) {
					this.permissionCache.delete(key);
				}
			}
		}
	}

	private async logAudit(entry: AuditLogEntry): Promise<void> {
		if (!entry.memoryId) return;

		if (!this.auditLogs.has(entry.memoryId)) {
			this.auditLogs.set(entry.memoryId, []);
		}

		const logs = this.auditLogs.get(entry.memoryId)!;
		logs.push(entry);

		// Limit logs per memory to prevent memory bloat
		if (logs.length > 100) {
			logs.shift(); // Remove oldest entry
		}
	}

	private cleanupAuditLogs(): void {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - (this.config.auditRetentionDays || 30));

		for (const [memoryId, logs] of this.auditLogs.entries()) {
			const filtered = logs.filter((log) => new Date(log.timestamp) > cutoff);
			if (filtered.length === 0) {
				this.auditLogs.delete(memoryId);
			} else {
				this.auditLogs.set(memoryId, filtered);
			}
		}
	}

	private generateAuditId(): string {
		return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
}
