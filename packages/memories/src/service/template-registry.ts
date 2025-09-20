import { EventEmitter } from 'events';
import type { MemoryTemplate } from '../domain/types.js';
import { TemplateDomainService, type TemplateValidationResult } from '../domain/templates.js';

export interface TemplateRegistryEvents {
	templateRegistered: [template: MemoryTemplate];
	templateUpdated: [template: MemoryTemplate];
	templateDeleted: [templateId: string, version?: string];
}

export class TemplateRegistry extends EventEmitter {
	private templates = new Map<string, Map<string, MemoryTemplate>>();
	private domainService = new TemplateDomainService();
	private compiledSchemas = new Map<string, any>();

	constructor() {
		super();
	}

	/**
	 * Register a new template
	 */
	async register(template: MemoryTemplate): Promise<void> {
		// Validate template
		const validation = this.domainService.validateTemplate(template);
		if (!validation.valid) {
			throw new Error(`Template validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
		}

		// Check if template already exists
		const versionMap = this.templates.get(template.id) || new Map();
		if (versionMap.has(template.version)) {
			throw new Error(`Template ${template.id} version ${template.version} already exists`);
		}

		// Compile schema for performance
		if (template.schema) {
			this.compiledSchemas.set(`${template.id}@${template.version}`, template.schema);
		}

		// Handle template inheritance
		if (template.extends) {
			await this.validateInheritance(template);
		}

		// Store template
		versionMap.set(template.version, template);
		this.templates.set(template.id, versionMap);

		this.emit('templateRegistered', template);
	}

	/**
	 * Get a template by ID and version
	 */
	async get(id: string, version?: string): Promise<MemoryTemplate | null> {
		const versionMap = this.templates.get(id);
		if (!versionMap) return null;

		if (version) {
			return versionMap.get(version) || null;
		}

		// Return latest version
		const versions = Array.from(versionMap.keys()).sort((a, b) =>
			this.domainService.compareVersions(b, a)
		);
		return versionMap.get(versions[0]) || null;
	}

	/**
	 * Get the latest version of a template
	 */
	async getLatest(id: string): Promise<MemoryTemplate | null> {
		return this.get(id);
	}

	/**
	 * List all templates
	 */
	async list(): Promise<MemoryTemplate[]> {
		const result: MemoryTemplate[] = [];

		for (const versionMap of this.templates.values()) {
			const latest = await this.getLatestByVersionMap(versionMap);
			if (latest) result.push(latest);
		}

		return result;
	}

	/**
	 * List templates by category
	 */
	async listByCategory(category: string): Promise<MemoryTemplate[]> {
		const all = await this.list();
		return all.filter(t => t.metadata?.category === category);
	}

	/**
	 * Update a template
	 */
	async update(template: MemoryTemplate): Promise<void> {
		const versionMap = this.templates.get(template.id);
		if (!versionMap || !versionMap.has(template.version)) {
			throw new Error(`Template ${template.id} version ${template.version} not found`);
		}

		// Validate updated template
		const validation = this.domainService.validateTemplate(template);
		if (!validation.valid) {
			throw new Error(`Template validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
		}

		// Update template
		versionMap.set(template.version, template);
		this.emit('templateUpdated', template);
	}

	/**
	 * Delete a template
	 */
	async delete(id: string, version?: string): Promise<void> {
		const versionMap = this.templates.get(id);
		if (!versionMap) return;

		if (version) {
			versionMap.delete(version);
			this.compiledSchemas.delete(`${id}@${version}`);
		} else {
			// Delete all versions
			for (const v of versionMap.keys()) {
				this.compiledSchemas.delete(`${id}@${v}`);
			}
			this.templates.delete(id);
		}

		this.emit('templateDeleted', id, version);
	}

	/**
	 * Get all versions of a template
	 */
	async getVersions(id: string): Promise<string[]> {
		const versionMap = this.templates.get(id);
		if (!versionMap) return [];

		return Array.from(versionMap.keys()).sort((a, b) =>
			this.domainService.compareVersions(b, a)
		);
	}

	/**
	 * Check if a template exists
	 */
	async exists(id: string, version?: string): Promise<boolean> {
		const template = await this.get(id, version);
		return template !== null;
	}

	/**
	 * Get compiled schema for a template
	 */
	getCompiledSchema(templateId: string, version: string): any {
		return this.compiledSchemas.get(`${templateId}@${version}`);
	}

	/**
	 * Validate inheritance chain
	 */
	private async validateInheritance(template: MemoryTemplate): Promise<void> {
		if (!template.extends) return;

		const parent = await this.get(template.extends);
		if (!parent) {
			throw new Error(`Parent template ${template.extends} not found`);
		}

		// Check for circular inheritance
		const visited = new Set<string>();
		let current = template;
		while (current.extends) {
			if (visited.has(current.extends)) {
				throw new Error('Circular inheritance detected in template hierarchy');
			}
			visited.add(current.extends);
			const parent = await this.get(current.extends);
			if (!parent) break;
			current = parent;
		}
	}

	/**
	 * Get latest version from a version map
	 */
	private async getLatestByVersionMap(versionMap: Map<string, MemoryTemplate>): Promise<MemoryTemplate | null> {
		const versions = Array.from(versionMap.keys()).sort((a, b) =>
			this.domainService.compareVersions(b, a)
		);
		return versionMap.get(versions[0]) || null;
	}

	/**
	 * Get template validation status
	 */
	async getValidationStatus(id: string, version?: string): Promise<TemplateValidationResult | null> {
		const template = await this.get(id, version);
		if (!template) return null;

		return this.domainService.validateTemplate(template);
	}

	/**
	 * Clear all templates (for testing)
	 */
	clear(): void {
		this.templates.clear();
		this.compiledSchemas.clear();
		this.removeAllListeners();
	}
}