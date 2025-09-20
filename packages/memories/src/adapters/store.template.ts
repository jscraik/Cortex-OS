import type { Memory, MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';
import { TemplateRegistry } from '../service/template-registry.js';
import { TemplateDomainService, type TemplateMigrationContext } from '../domain/templates.js';

export interface TemplateStoreConfig {
	strictValidation?: boolean;
	applyDefaults?: boolean;
	trackVersions?: boolean;
	migrateOnUpsert?: boolean;
}

export class TemplateMemoryStore implements MemoryStore {
	private domainService = new TemplateDomainService();

	constructor(
		private readonly store: MemoryStore,
		private readonly registry: TemplateRegistry,
		private readonly config: TemplateStoreConfig = {}
	) {
		// Set defaults
		this.config = {
			strictValidation: true,
			applyDefaults: true,
			trackVersions: true,
			migrateOnUpsert: false,
			...config
		};
	}

	async upsert(memory: Memory, namespace = 'default'): Promise<Memory> {
		// Check if memory has a template
		const templateId = memory.metadata?.template as string;
		const templateVersion = memory.metadata?.templateVersion as string;

		if (!templateId) {
			// No template, store as-is
			return this.store.upsert(memory, namespace);
		}

		// Get template
		const template = await this.registry.get(templateId, templateVersion);
		if (!template) {
			throw new Error(`Template ${templateId}${templateVersion ? ` version ${templateVersion}` : ''} not found`);
		}

		// Apply defaults if configured
		let processedMemory = memory;
		if (this.config.applyDefaults) {
			processedMemory = {
				...memory,
				metadata: this.domainService.applyDefaults(memory.metadata || {}, template)
			};
		}

		// Merge template metadata
		processedMemory = {
			...processedMemory,
			metadata: this.domainService.mergeMetadata(processedMemory.metadata || {}, template)
		};

		// Validate against template
		if (this.config.strictValidation) {
			const validation = await this.domainService.validateData(processedMemory.metadata, template);
			if (!validation.valid) {
				throw new Error(`Template validation failed: ${validation.errors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
			}
		}

		// Track version if configured
		if (this.config.trackVersions) {
			processedMemory.metadata = {
				...processedMemory.metadata,
				templateVersion: template.version
			};
		}

		// Handle migration if needed
		if (this.config.migrateOnUpsert && template.migration) {
			const existing = await this.store.get(memory.id, namespace);
			if (existing && existing.metadata?.templateVersion !== template.version) {
				processedMemory = await this.migrateMemory(existing, template, namespace);
			}
		}

		// Store the processed memory
		return this.store.upsert(processedMemory, namespace);
	}

	async get(id: string, namespace = 'default'): Promise<Memory | null> {
		return this.store.get(id, namespace);
	}

	async delete(id: string, namespace = 'default'): Promise<void> {
		return this.store.delete(id, namespace);
	}

	async searchByText(q: TextQuery, namespace = 'default'): Promise<Memory[]> {
		return this.store.searchByText(q, namespace);
	}

	async searchByVector(q: VectorQuery, namespace = 'default'): Promise<(Memory & { score: number })[]> {
		return this.store.searchByVector(q, namespace);
	}

	async purgeExpired(nowISO: string, namespace?: string): Promise<number> {
		return this.store.purgeExpired(nowISO, namespace);
	}

	async list(namespace = 'default', limit?: number, offset?: number): Promise<Memory[]> {
		return this.store.list(namespace, limit, offset);
	}

	/**
	 * Get memories by template
	 */
	async getByTemplate(templateId: string, namespace = 'default', version?: string): Promise<Memory[]> {
		const allMemories = await this.store.list(namespace);
		return allMemories.filter(memory => {
			const memTemplateId = memory.metadata?.template as string;
			const memVersion = memory.metadata?.templateVersion as string;

			if (memTemplateId !== templateId) return false;
			if (version && memVersion !== version) return false;

			return true;
		});
	}

	/**
	 * Migrate memories from one template version to another
	 */
	async migrateTemplate(
		templateId: string,
		toVersion: string,
		namespace = 'default',
		fromVersion?: string
	): Promise<number> {
		const template = await this.registry.get(templateId, toVersion);
		if (!template) {
			throw new Error(`Template ${templateId} version ${toVersion} not found`);
		}

		// Get all memories with this template
		const memories = await this.getByTemplate(templateId, namespace, fromVersion);
		let migratedCount = 0;

		for (const memory of memories) {
			const currentVersion = memory.metadata?.templateVersion as string;

			// Skip if already at target version
			if (currentVersion === toVersion) continue;

			// Check if migration is needed
			if (template.migration && (!fromVersion || currentVersion === fromVersion)) {
				const migrated = await this.migrateMemory(memory, template, namespace);
				await this.store.upsert(migrated, namespace);
				migratedCount++;
			}
		}

		return migratedCount;
	}

	/**
	 * Validate a memory against its template
	 */
	async validateMemory(memory: Memory, namespace = 'default'): Promise<boolean> {
		const templateId = memory.metadata?.template as string;
		if (!templateId) return true; // No template to validate against

		const templateVersion = memory.metadata?.templateVersion as string;
		const template = await this.registry.get(templateId, templateVersion);
		if (!template) return false;

		const validation = await this.domainService.validateData(memory.metadata || {}, template);
		return validation.valid;
	}

	/**
	 * Get template usage statistics
	 */
	async getTemplateStats(namespace = 'default'): Promise<Record<string, {
		count: number;
		versions: Record<string, number>;
	}>> {
		const allMemories = await this.store.list(namespace);
		const stats: Record<string, any> = {};

		for (const memory of allMemories) {
			const templateId = memory.metadata?.template as string;
			if (!templateId) continue;

			if (!stats[templateId]) {
				stats[templateId] = {
					count: 0,
					versions: {}
				};
			}

			stats[templateId].count++;

			const version = memory.metadata?.templateVersion as string || 'unknown';
			stats[templateId].versions[version] = (stats[templateId].versions[version] || 0) + 1;
		}

		return stats;
	}

	/**
	 * Migrate a single memory
	 */
	private async migrateMemory(
		memory: Memory,
		toTemplate: MemoryTemplate,
		namespace: string
	): Promise<Memory> {
		if (!toTemplate.migration) {
			return memory;
		}

		const currentVersion = memory.metadata?.templateVersion as string;
		if (currentVersion === toTemplate.migration.from) {
			// Apply migration transform
			const migratedData = toTemplate.migration.transform(memory.metadata || {});

			const context: TemplateMigrationContext = {
				fromVersion: currentVersion,
				toVersion: toTemplate.version,
				namespace,
				timestamp: new Date().toISOString()
			};

			return {
				...memory,
				metadata: {
					...migratedData,
					template: toTemplate.id,
					templateVersion: toTemplate.version,
					migratedAt: context.timestamp,
					migrationContext: context
				},
				updatedAt: new Date().toISOString()
			};
		}

		return memory;
	}
}