import type { Memory, MemoryStore, TextQuery, VectorQuery } from '../ports/MemoryStore.js';

export interface LifecycleStage {
	name: string;
	description?: string;
	duration?: number; // Expected duration in ms
	autoTransition?: string; // Auto transition to this stage
}

export interface LifecycleTransition {
	from: string;
	to: string;
	condition?: (memory: Memory, context?: any) => boolean | Promise<boolean>;
	action?: (memory: Memory) => Promise<void>;
}

export interface RetentionPolicy {
	name: string;
	condition: {
		stage?: string;
		age?: string; // e.g., '30d', '90d', '1y'
		tags?: string[];
		metadata?: Record<string, any>;
	};
	action: 'archive' | 'delete' | 'notify';
}

export interface CompactionStrategy {
	name: string;
	stage: string;
	similarity: number;
	maxSize?: number;
	preserveLifecycle?: boolean;
}

export interface ColdStorageConfig {
	provider: string;
	conditions: Array<{
		stage?: string;
		age?: string;
		size?: number;
	}>;
	autoRetrieve?: boolean;
	compression?: boolean;
}

export interface LifecycleConfig {
	stages?: {
		enabled: boolean;
		defaultStage: string;
		stages: string[];
		transitions: Record<string, string[]>;
		customTransitions?: Record<string, (memory: Memory, context?: any) => Promise<void>>;
	};
	retention?: {
		enabled: boolean;
		policies: RetentionPolicy[];
		checkInterval?: number; // in ms
	};
	compaction?: {
		enabled: boolean;
		strategies: CompactionStrategy[];
		schedule?: string; // cron expression
	};
	archival?: {
		enabled: boolean;
		coldStorage: ColdStorageConfig;
	};
	metrics?: {
		enabled: boolean;
		trackTransitions?: boolean;
		trackDurations?: boolean;
	};
}

export interface LifecycleInfo {
	stage: string;
	createdAt: string;
	updatedAt: string;
	history: LifecycleHistoryEntry[];
	currentDuration?: number;
	totalDuration?: number;
	coldStorage?: boolean;
	coldStorageId?: string;
	compactedFrom?: string[];
	originalStages?: string[];
}

export interface LifecycleHistoryEntry {
	stage: string;
	timestamp: string;
	reason?: string;
	userId?: string;
	metadata?: Record<string, any>;
}

export interface LifecycleAnalytics {
	byStage: Record<string, number>;
	transitions: Record<string, number>;
	averageTimeInStage: Record<string, number>;
	oldestInStage: Record<string, string>;
	totalTransitions: number;
	retentionStats: {
		archived: number;
		deleted: number;
		compacted: number;
	};
}

export interface LifecycleMetrics {
	transitions: Record<string, number>;
	averageTimeInStage: Record<string, number>;
	errors: Record<string, number>;
	lastProcessed: string;
}

export interface RetentionResult {
	archived: number;
	deleted: number;
	errors: string[];
}

export interface CompactionResult {
	consolidated: Memory[];
	originalCount: number;
	spaceSaved: number;
}

export interface ArchivalResult {
	archived: number;
	errors: string[];
}

export class LifecycleMemoryStore implements MemoryStore {
	private coldStorage = new Map<string, Memory>();
	private config: Required<LifecycleConfig>;
	private metrics = new Map<string, LifecycleMetrics>();

	constructor(
		private readonly store: MemoryStore,
		config: LifecycleConfig = {},
	) {
		this.config = {
			stages: {
				enabled: true,
				defaultStage: 'draft',
				stages: ['draft', 'active', 'archived', 'deleted'],
				transitions: {
					draft: ['active', 'archived', 'deleted'],
					active: ['archived', 'deleted'],
					archived: ['deleted'],
					deleted: [],
				},
				...config.stages,
			},
			retention: {
				enabled: false,
				policies: [],
				checkInterval: 3600000, // 1 hour
				...config.retention,
			},
			compaction: {
				enabled: false,
				strategies: [],
				...config.compaction,
			},
			archival: {
				enabled: false,
				coldStorage: {
					provider: 'memory',
					conditions: [],
					autoRetrieve: true,
					...config.archival?.coldStorage,
				},
				...config.archival,
			},
			metrics: {
				enabled: false,
				trackTransitions: true,
				trackDurations: true,
				...config.metrics,
			},
		};

		// Validate configuration
		this.validateStageConfig();
	}

	async upsert(memory: Memory, namespace = 'default', _context?: any): Promise<Memory> {
		// Ensure lifecycle info exists
		if (!memory.lifecycle) {
			memory.lifecycle = this.createInitialLifecycle();
		}

		// Apply any automatic transitions
		await this.checkAutoTransitions(memory, namespace);

		const result = await this.store.upsert(memory, namespace);

		// Track metrics if enabled
		if (this.config.metrics.enabled) {
			this.trackUpsert(result, namespace);
		}

		return result;
	}

	async get(id: string, namespace = 'default', _context?: any): Promise<Memory | null> {
		// Get from store first (it may have coldStorage flag)
		const memory = await this.store.get(id, namespace);
		if (memory) {
			return memory;
		}

		// Check cold storage as fallback
		const coldKey = `${namespace}:${id}`;
		if (this.coldStorage.has(coldKey)) {
			return this.coldStorage.get(coldKey)!;
		}
		return null;
	}

	async delete(id: string, namespace = 'default', _context?: any): Promise<void> {
		// Remove from cold storage if present
		const coldKey = `${namespace}:${id}`;
		this.coldStorage.delete(coldKey);

		await this.store.delete(id, namespace);

		if (this.config.metrics.enabled) {
			this.trackDelete(id, namespace);
		}
	}

	async searchByText(q: TextQuery, namespace = 'default', _context?: any): Promise<Memory[]> {
		const results = await this.store.searchByText(q, namespace);

		// Filter by lifecycle stage if specified
		if (q.filter?.lifecycle?.stage) {
			return results.filter((m) => m.lifecycle?.stage === q.filter?.lifecycle?.stage);
		}

		return results;
	}

	async searchByVector(
		q: VectorQuery,
		namespace = 'default',
		_context?: any,
	): Promise<(Memory & { score: number })[]> {
		const results = await this.store.searchByVector(q, namespace);

		// Filter by lifecycle stage if specified
		if (q.filter?.lifecycle?.stage) {
			return results.filter((m) => m.lifecycle?.stage === q.filter?.lifecycle?.stage);
		}

		return results;
	}

	async purgeExpired(nowISO: string, namespace?: string, _context?: any): Promise<number> {
		return this.store.purgeExpired(nowISO, namespace);
	}

	async list(
		namespace = 'default',
		limit?: number,
		offset?: number,
		_context?: any,
	): Promise<Memory[]> {
		return this.store.list(namespace, limit, offset);
	}

	// Lifecycle Management Methods
	async transitionTo(
		id: string,
		newStage: string,
		namespace = 'default',
		reason?: string,
		context?: any,
	): Promise<Memory> {
		const memory = await this.get(id, namespace);
		if (!memory) {
			throw new Error(`Memory not found: ${id}`);
		}

		const currentStage = memory.lifecycle?.stage || this.config.stages.defaultStage;

		// Validate transition
		if (!this.isValidTransition(currentStage, newStage)) {
			throw new Error(`Invalid transition from ${currentStage} to ${newStage}`);
		}

		// Check custom transition logic
		const transitionKey = `${currentStage}->${newStage}`;
		if (this.config.stages.customTransitions?.[transitionKey]) {
			await this.config.stages.customTransitions[transitionKey](memory, context);
		}

		// Update lifecycle
		const now = new Date().toISOString();
		const historyEntry: LifecycleHistoryEntry = {
			stage: newStage,
			timestamp: now,
			reason,
		};

		memory.lifecycle = {
			...memory.lifecycle!,
			stage: newStage,
			updatedAt: now,
			history: [...memory.lifecycle.history, historyEntry],
		};

		// Calculate durations
		if (this.config.metrics.trackDurations) {
			this.updateStageDurations(memory.lifecycle);
		}

		const updated = await this.store.upsert(memory, namespace);

		if (this.config.metrics.enabled) {
			this.trackTransition(currentStage, newStage, namespace);
		}

		return updated;
	}

	async applyRetentionPolicies(namespace = 'default'): Promise<RetentionResult> {
		if (!this.config.retention.enabled) {
			return { archived: 0, deleted: 0, errors: [] };
		}

		const result: RetentionResult = { archived: 0, deleted: 0, errors: [] };
		const now = Date.now();

		for (const policy of this.config.retention.policies) {
			try {
				const memories = await this.findMemoriesForRetention(policy, namespace, now);

				for (const memory of memories) {
					if (policy.action === 'archive') {
						await this.transitionTo(memory.id, 'archived', namespace, 'Retention policy');
						result.archived++;
					} else if (policy.action === 'delete') {
						await this.delete(memory.id, namespace);
						result.deleted++;
					}
				}
			} catch (error) {
				result.errors.push(`Policy ${policy.name} failed: ${error}`);
			}
		}

		return result;
	}

	async compactMemories(namespace = 'default'): Promise<CompactionResult> {
		if (!this.config.compaction.enabled) {
			return { consolidated: [], originalCount: 0, spaceSaved: 0 };
		}

		const result: CompactionResult = { consolidated: [], originalCount: 0, spaceSaved: 0 };

		for (const strategy of this.config.compaction.strategies) {
			try {
				const memories = await this.store.list(namespace);
				const stageMemories = memories.filter((m) => m.lifecycle?.stage === strategy.stage);

				// Find similar memories
				const groups = await this.groupSimilarMemories(stageMemories, strategy.similarity);

				for (const group of groups) {
					if (group.length > 1) {
						const consolidated = await this.createConsolidatedMemory(group, strategy);
						await this.store.upsert(consolidated, namespace);

						// Delete original memories
						for (const memory of group) {
							await this.delete(memory.id, namespace);
						}

						result.consolidated.push(consolidated);
						result.originalCount += group.length;
						result.spaceSaved += this.calculateSpaceSaved(group);
					}
				}
			} catch (error) {
				console.error(`Compaction strategy ${strategy.name} failed:`, error);
			}
		}

		return result;
	}

	async archiveToColdStorage(namespace = 'default'): Promise<ArchivalResult> {
		if (!this.config.archival.enabled) {
			return { archived: 0, errors: [] };
		}

		const result: ArchivalResult = { archived: 0, errors: [] };
		const now = Date.now();

		try {
			const memories = await this.store.list(namespace);
			const toArchive = memories.filter((memory) => {
				return this.shouldArchiveToCold(memory, now);
			});

			for (const memory of toArchive) {
				const coldKey = `${namespace}:${memory.id}`;
				this.coldStorage.set(coldKey, { ...memory });

				// Mark as in cold storage
				memory.lifecycle = {
					...memory.lifecycle!,
					coldStorage: true,
					coldStorageId: `cold-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				};

				await this.store.upsert(memory, namespace);
				result.archived++;
			}
		} catch (error) {
			result.errors.push(error.message);
		}

		return result;
	}

	async getLifecycleAnalytics(namespace = 'default'): Promise<LifecycleAnalytics> {
		const memories = await this.store.list(namespace);
		const analytics: LifecycleAnalytics = {
			byStage: {},
			transitions: {},
			averageTimeInStage: {},
			oldestInStage: {},
			totalTransitions: 0,
			retentionStats: {
				archived: 0,
				deleted: 0,
				compacted: 0,
			},
		};

		// Count by stage
		for (const memory of memories) {
			const stage = memory.lifecycle?.stage || this.config.stages.defaultStage;
			analytics.byStage[stage] = (analytics.byStage[stage] || 0) + 1;
			analytics.totalTransitions += memory.lifecycle?.history.length || 0;
		}

		// Calculate metrics
		if (this.config.metrics.enabled) {
			const metrics = this.metrics.get(namespace);
			if (metrics) {
				analytics.transitions = metrics.transitions;
				analytics.averageTimeInStage = metrics.averageTimeInStage;
			}
		}

		return analytics;
	}

	async getLifecycleMetrics(namespace = 'default'): Promise<LifecycleMetrics> {
		return (
			this.metrics.get(namespace) || {
				transitions: {},
				averageTimeInStage: {},
				errors: {},
				lastProcessed: new Date().toISOString(),
			}
		);
	}

	// Private helper methods
	private createInitialLifecycle(): LifecycleInfo {
		const now = new Date().toISOString();
		return {
			stage: this.config.stages.defaultStage,
			createdAt: now,
			updatedAt: now,
			history: [
				{
					stage: this.config.stages.defaultStage,
					timestamp: now,
					reason: 'created',
				},
			],
		};
	}

	private validateStageConfig(): void {
		const { stages, transitions } = this.config.stages;

		// Check that all stages are valid
		for (const stage of stages) {
			if (!transitions[stage]) {
				throw new Error(`No transitions defined for stage: ${stage}`);
			}
		}

		// Check for cycles
		const visited = new Set<string>();
		const recursionStack = new Set<string>();

		const hasCycle = (stage: string): boolean => {
			if (recursionStack.has(stage)) return true;
			if (visited.has(stage)) return false;

			visited.add(stage);
			recursionStack.add(stage);

			for (const target of transitions[stage]) {
				if (hasCycle(target)) return true;
			}

			recursionStack.delete(stage);
			return false;
		};

		for (const stage of stages) {
			if (hasCycle(stage)) {
				throw new Error('Cycle detected in stage transitions');
			}
		}
	}

	private isValidTransition(from: string, to: string): boolean {
		return this.config.stages.transitions[from]?.includes(to) || false;
	}

	private async checkAutoTransitions(memory: Memory, namespace: string): Promise<void> {
		const currentStage = memory.lifecycle?.stage || this.config.stages.defaultStage;

		// Check duration-based transitions
		for (const [stage, config] of Object.entries(this.config.stages.stages || {})) {
			if (stage === currentStage && config.autoTransition) {
				const duration = Date.now() - new Date(memory.lifecycle?.createdAt).getTime();
				if (duration > (config.duration || Infinity)) {
					await this.transitionTo(memory.id, config.autoTransition, namespace, 'Auto-transition');
				}
			}
		}
	}

	private findMemoriesForRetention(
		policy: RetentionPolicy,
		namespace: string,
		now: number,
	): Promise<Memory[]> {
		return new Promise(async (resolve) => {
			const memories = await this.store.list(namespace);
			const filtered: Memory[] = [];

			for (const memory of memories) {
				if (this.matchesRetentionPolicy(memory, policy, now)) {
					filtered.push(memory);
				}
			}

			resolve(filtered);
		});
	}

	private matchesRetentionPolicy(memory: Memory, policy: RetentionPolicy, now: number): boolean {
		// Check stage
		if (policy.condition.stage && memory.lifecycle?.stage !== policy.condition.stage) {
			return false;
		}

		// Check age
		if (policy.condition.age) {
			const ageMs = this.parseDuration(policy.condition.age);
			const memoryAge = now - new Date(memory.createdAt).getTime();
			if (memoryAge < ageMs) {
				return false;
			}
		}

		// Check tags
		if (policy.condition.tags) {
			const hasAllTags = policy.condition.tags.every((tag) => memory.tags.includes(tag));
			if (!hasAllTags) {
				return false;
			}
		}

		// Check metadata
		if (policy.condition.metadata) {
			for (const [key, value] of Object.entries(policy.condition.metadata)) {
				if (memory.metadata?.[key] !== value) {
					return false;
				}
			}
		}

		return true;
	}

	private parseDuration(duration: string): number {
		const match = duration.match(/^(\d+)([dmy])$/);
		if (!match) {
			throw new Error(`Invalid duration format: ${duration}`);
		}

		const value = parseInt(match[1], 10);
		const unit = match[2];

		switch (unit) {
			case 'd':
				return value * 24 * 60 * 60 * 1000;
			case 'm':
				return value * 30 * 24 * 60 * 60 * 1000;
			case 'y':
				return value * 365 * 24 * 60 * 60 * 1000;
			default:
				throw new Error(`Unknown duration unit: ${unit}`);
		}
	}

	private async groupSimilarMemories(memories: Memory[], threshold: number): Promise<Memory[][]> {
		const groups: Memory[][] = [];
		const processed = new Set<string>();

		for (const memory of memories) {
			if (processed.has(memory.id)) continue;

			const group = [memory];
			processed.add(memory.id);

			// Find similar memories
			for (const other of memories) {
				if (processed.has(other.id) || other.id === memory.id) continue;

				const similarity = this.calculateSimilarity(memory, other);
				if (similarity >= threshold) {
					group.push(other);
					processed.add(other.id);
				}
			}

			if (group.length > 1) {
				groups.push(group);
			}
		}

		return groups;
	}

	private calculateSimilarity(a: Memory, b: Memory): number {
		// Simple text similarity for demo
		const wordsA = new Set((a.text || '').toLowerCase().split(/\W+/));
		const wordsB = new Set((b.text || '').toLowerCase().split(/\W+/));

		const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
		const union = new Set([...wordsA, ...wordsB]);

		return union.size > 0 ? intersection.size / union.size : 0;
	}

	private async createConsolidatedMemory(
		memories: Memory[],
		strategy: CompactionStrategy,
	): Promise<Memory> {
		// Combine texts while preserving lifecycle info
		const combinedText = memories.map((m) => m.text).join('; ');

		const consolidated: Memory = {
			id: `compacted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			kind: memories[0].kind,
			text: combinedText,
			tags: [...new Set(memories.flatMap((m) => m.tags))],
			metadata: {
				...memories[0].metadata,
				compactedFrom: memories.map((m) => m.id),
				compactedAt: new Date().toISOString(),
			},
			createdAt: memories.reduce((oldest, m) =>
				new Date(m.createdAt) < new Date(oldest.createdAt) ? m : oldest,
			).createdAt,
			updatedAt: new Date().toISOString(),
			provenance: memories[0].provenance,
			lifecycle: {
				stage: strategy.stage,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				history: [
					{
						stage: strategy.stage,
						timestamp: new Date().toISOString(),
						reason: 'compacted',
					},
				],
				compactedFrom: memories.map((m) => m.id),
				originalStages: memories.map((m) => m.lifecycle?.stage || 'unknown'),
			},
		};

		return consolidated;
	}

	private calculateSpaceSaved(memories: Memory[]): number {
		// Estimate space saved by compaction
		const originalSize = memories.reduce((sum, m) => sum + JSON.stringify(m).length, 0);
		const avgMemorySize = originalSize / memories.length;
		return originalSize - avgMemorySize; // Saved space
	}

	private shouldArchiveToCold(memory: Memory, now: number): boolean {
		for (const condition of this.config.archival.coldStorage.conditions) {
			let matches = true;

			if (condition.stage && memory.lifecycle?.stage !== condition.stage) {
				matches = false;
			}

			if (condition.age) {
				const ageMs = this.parseDuration(condition.age);
				// Use lifecycle createdAt if available, otherwise use memory createdAt
				const memoryDate = memory.lifecycle?.createdAt || memory.createdAt;
				const memoryAge = now - new Date(memoryDate).getTime();
				if (memoryAge < ageMs) {
					matches = false;
				}
			}

			if (matches) {
				return true;
			}
		}

		return false;
	}

	private updateStageDurations(lifecycle: LifecycleInfo): void {
		const now = Date.now();
		const lastUpdate = new Date(lifecycle.updatedAt).getTime();
		const duration = now - lastUpdate;

		lifecycle.currentDuration = duration;

		if (!lifecycle.totalDuration) {
			lifecycle.totalDuration = 0;
		}
		lifecycle.totalDuration += duration;
	}

	private trackUpsert(_memory: Memory, namespace: string): void {
		let metrics = this.metrics.get(namespace);
		if (!metrics) {
			metrics = {
				transitions: {},
				averageTimeInStage: {},
				errors: {},
				lastProcessed: new Date().toISOString(),
			};
			this.metrics.set(namespace, metrics);
		}
		metrics.lastProcessed = new Date().toISOString();
	}

	private trackTransition(from: string, to: string, namespace: string): void {
		if (!this.config.metrics.trackTransitions) return;

		let metrics = this.metrics.get(namespace);
		if (!metrics) {
			metrics = {
				transitions: {},
				averageTimeInStage: {},
				errors: {},
				lastProcessed: new Date().toISOString(),
			};
			this.metrics.set(namespace, metrics);
		}

		const key = `${from}_to_${to}`;
		metrics.transitions[key] = (metrics.transitions[key] || 0) + 1;

		// Initialize average time for the from stage
		if (!metrics.averageTimeInStage[from]) {
			metrics.averageTimeInStage[from] = 1000; // Default 1 second
		}
	}

	private trackDelete(_id: string, _namespace: string): void {
		// Track deletion metrics if needed
	}
}
