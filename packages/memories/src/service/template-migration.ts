import { TemplateRegistry } from './template-registry.js';
import type { Memory, MemoryTemplate } from '../domain/types.js';
import type { TemplateMigrationContext } from '../domain/templates.js';

export interface MigrationPlan {
	templateId: string;
	fromVersion: string;
	toVersion: string;
	affectedMemories: number;
	migrationFunction: (memory: Memory) => Promise<Memory>;
}

export interface MigrationResult {
	success: boolean;
	migratedCount: number;
	failedCount: number;
	errors: string[];
	duration: number;
}

export class TemplateMigrationService {
	constructor(
		private readonly registry: TemplateRegistry,
		private readonly dryRun = false
	) {}

	/**
	 * Create a migration plan for a template
	 */
	async createMigrationPlan(
		templateId: string,
		toVersion: string,
		memories: Memory[]
	): Promise<MigrationPlan> {
		const toTemplate = await this.registry.get(templateId, toVersion);
		if (!toTemplate) {
			throw new Error(`Target template ${templateId} version ${toVersion} not found`);
		}

		// Find memories that need migration
		const affectedMemories = memories.filter(memory => {
			const memTemplateId = memory.metadata?.template as string;
			const memVersion = memory.metadata?.templateVersion as string;

			return memTemplateId === templateId &&
				memVersion &&
				memVersion !== toVersion &&
				this.needsMigration(memVersion, toVersion);
		});

		return {
			templateId,
			fromVersion: '', // Will be determined per memory
			toVersion,
			affectedMemories: affectedMemories.length,
			migrationFunction: async (memory: Memory) => {
				return this.migrateMemory(memory, toTemplate);
			}
		};
	}

	/**
	 * Execute a migration plan
	 */
	async executeMigration(
		plan: MigrationPlan,
		store: { upsert: (memory: Memory, namespace: string) => Promise<Memory> },
		namespace = 'default'
	): Promise<MigrationResult> {
		const startTime = Date.now();
		let migratedCount = 0;
		let failedCount = 0;
		const errors: string[] = [];

		// Get all memories for the template
		// Note: In a real implementation, you'd pass memories or fetch them from store
		const allMemories: Memory[] = []; // This would be populated

		for (const memory of allMemories) {
			try {
				const migrated = await plan.migrationFunction(memory);
				if (!this.dryRun) {
					await store.upsert(migrated, namespace);
				}
				migratedCount++;
			} catch (error) {
				failedCount++;
				errors.push(`Failed to migrate memory ${memory.id}: ${error instanceof Error ? error.message : String(error)}`);
			}
		}

		return {
			success: failedCount === 0,
			migratedCount,
			failedCount,
			errors,
			duration: Date.now() - startTime
		};
	}

	/**
	 * Check if a memory needs migration
	 */
	private needsMigration(fromVersion: string, toTemplate: MemoryTemplate): boolean {
		if (!toTemplate.migration) return false;
		return fromVersion === toTemplate.migration.from;
	}

	/**
	 * Migrate a single memory
	 */
	private async migrateMemory(memory: Memory, toTemplate: MemoryTemplate): Promise<Memory> {
		if (!toTemplate.migration) {
			return memory;
		}

		const currentVersion = memory.metadata?.templateVersion as string;
		if (currentVersion !== toTemplate.migration.from) {
			return memory;
		}

		// Apply migration transform
		const migratedData = toTemplate.migration.transform(memory.metadata || {});

		return {
			...memory,
			metadata: {
				...migratedData,
				template: toTemplate.id,
				templateVersion: toTemplate.version,
				migratedAt: new Date().toISOString()
			},
			updatedAt: new Date().toISOString()
		};
	}

	/**
	 * Validate migration before executing
	 */
	async validateMigration(plan: MigrationPlan): Promise<{
		valid: boolean;
		warnings: string[];
		errors: string[];
	}> {
		const warnings: string[] = [];
		const errors: string[] = [];

		// Check if target template exists
		const targetTemplate = await this.registry.get(plan.templateId, plan.toVersion);
		if (!targetTemplate) {
			errors.push(`Target template ${plan.templateId} version ${plan.toVersion} not found`);
		}

		// Check for potential data loss
		if (targetTemplate) {
			const sourceTemplate = await this.registry.get(plan.templateId, plan.fromVersion);
			if (sourceTemplate && sourceTemplate.schema && targetTemplate.schema) {
				const sourceFields = Object.keys(sourceTemplate.schema.properties || {});
				const targetFields = Object.keys(targetTemplate.schema.properties || {});

				const removedFields = sourceFields.filter(f => !targetFields.includes(f));
				if (removedFields.length > 0) {
					warnings.push(`The following fields will be removed: ${removedFields.join(', ')}`);
				}
			}
		}

		// Check if migration function is provided
		if (!plan.migrationFunction) {
			errors.push('Migration function is required');
		}

		return {
			valid: errors.length === 0,
			warnings,
			errors
		};
	}

	/**
	 * Rollback a migration
	 */
	async rollbackMigration(
		templateId: string,
		fromVersion: string,
		toVersion: string,
		store: { upsert: (memory: Memory, namespace: string) => Promise<Memory> },
		namespace = 'default'
	): Promise<MigrationResult> {
		// Get the template we're rolling back from
		const fromTemplate = await this.registry.get(templateId, fromVersion);
		if (!fromTemplate?.migration) {
			throw new Error('Cannot rollback: no migration function found in source template');
		}

		// Create reverse migration plan
		const reversePlan: MigrationPlan = {
			templateId,
			fromVersion: toVersion,
			toVersion: fromVersion,
			affectedMemories: 0, // Will be calculated
			migrationFunction: async (memory: Memory) => {
				// For rollback, we need to apply the inverse transform
				// This is simplified - in practice, you'd need proper inverse functions
				return memory;
			}
		};

		return this.executeMigration(reversePlan, store, namespace);
	}

	/**
	 * Get migration history for a template
	 */
	async getMigrationHistory(templateId: string): Promise<Array<{
		fromVersion: string;
		toVersion: string;
		executedAt: string;
		migratedCount: number;
	}>> {
		// This would typically query a migration log table
		// For now, return empty array
		return [];
	}

	/**
	 * Set dry run mode
	 */
	setDryRun(dryRun: boolean): void {
		this.dryRun = dryRun;
	}
}