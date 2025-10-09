/**
 * LocalMemoryClient - REST API client for Local Memory integration
 * Part of brAInwav Cortex-OS Unified Workflow
 *
 * Provides workflow insight storage, approval tracking, and pattern querying
 * with graceful degradation when the service is unavailable.
 */

export interface WorkflowInsight {
	workflowId?: string;
	featureName?: string;
	priority?: 'P0' | 'P1' | 'P2' | 'P3';
	status: 'started' | 'in-progress' | 'completed' | 'failed';
	qualityMetrics?: {
		coverage?: number;
		security?: {
			critical: number;
			high: number;
			medium: number;
		};
		performance?: {
			lcp?: number;
			tbt?: number;
		};
		accessibility?: number;
	};
}

export interface ApprovalDecision {
	workflowId: string;
	gateId: string;
	approver: string;
	role: string;
	decision: 'approved' | 'rejected';
	rationale: string;
}

export interface MemorySearchResult {
	id: string;
	content: string;
	score: number;
}

interface LocalMemoryConfig {
	baseUrl: string;
}

interface PendingInsight {
	type: 'workflow' | 'approval';
	data: WorkflowInsight | ApprovalDecision;
	timestamp: string;
}

export class LocalMemoryClient {
	private baseUrl: string;
	private pendingQueue: PendingInsight[] = [];

	constructor(config: LocalMemoryConfig) {
		this.baseUrl = config.baseUrl;
	}

	/**
	 * Store workflow completion/status insight
	 * Importance scored based on priority (P0=10, P1=8, P2=6, P3=5)
	 */
	async storeWorkflowInsight(insight: WorkflowInsight): Promise<void> {
		const importance = this.calculateImportance(insight.priority);
		const tags = this.buildTags(insight);
		const content = this.formatWorkflowContent(insight);

		const payload = {
			content,
			importance,
			tags,
			domain: 'workflow',
			metadata: {
				branding: 'brAInwav',
				workflowId: insight.workflowId,
				status: insight.status,
				priority: insight.priority,
				qualityMetrics: insight.qualityMetrics,
				timestamp: new Date().toISOString(),
			},
		};

		try {
			const response = await fetch(`${this.baseUrl}/memories`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const statusText = response.statusText || 'Unknown error';
				throw new Error(`[brAInwav] Memory API error: HTTP ${response.status} ${statusText}`);
			}
		} catch (error) {
			this.handleStorageError(error, {
				type: 'workflow',
				data: insight,
				timestamp: new Date().toISOString(),
			});
		}
	}

	/**
	 * Store approval decision with high importance
	 */
	async storeApprovalDecision(approval: ApprovalDecision): Promise<void> {
		const content = `brAInwav Gate Approval: ${approval.gateId} ${approval.decision} by ${approval.approver} (${approval.role}). Rationale: ${approval.rationale}`;
		const tags = ['approval', `gate-${approval.gateId}`, approval.decision, 'workflow'];

		const payload = {
			content,
			importance: 8, // Approvals are high importance
			tags,
			domain: 'workflow',
			metadata: {
				branding: 'brAInwav',
				workflowId: approval.workflowId,
				gateId: approval.gateId,
				approver: approval.approver,
				role: approval.role,
				decision: approval.decision,
				timestamp: new Date().toISOString(),
			},
		};

		try {
			const response = await fetch(`${this.baseUrl}/memories`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const statusText = response.statusText || 'Unknown error';
				throw new Error(`[brAInwav] Memory API error: HTTP ${response.status} ${statusText}`);
			}
		} catch (error) {
			this.handleStorageError(error, {
				type: 'approval',
				data: approval,
				timestamp: new Date().toISOString(),
			});
		}
	}

	/**
	 * Query related workflows by feature name or pattern
	 */
	async queryRelatedWorkflows(query: string): Promise<MemorySearchResult[]> {
		try {
			const response = await fetch(
				`${this.baseUrl}/memories/search?q=${encodeURIComponent(query)}&domain=workflow`,
			);

			if (!response.ok) {
				const statusText = response.statusText || 'Unknown error';
				throw new Error(`[brAInwav] Memory search error: HTTP ${response.status} ${statusText}`);
			}

			const data = await response.json();
			return data.results || [];
		} catch (error) {
			console.warn('[brAInwav] Local memory query failed:', error);
			return [];
		}
	}

	/**
	 * Get pending insights that failed to store
	 */
	getPendingInsights(): PendingInsight[] {
		return [...this.pendingQueue];
	}

	/**
	 * Retry storing pending insights with parallel processing
	 */
	async retryPending(): Promise<void> {
		const pending = [...this.pendingQueue];
		this.pendingQueue = [];

		// Process retries in parallel for better performance
		const retryPromises = pending.map((item) =>
			item.type === 'workflow'
				? this.storeWorkflowInsight(item.data as WorkflowInsight)
				: this.storeApprovalDecision(item.data as ApprovalDecision),
		);

		const results = await Promise.allSettled(retryPromises);

		// Re-queue any that failed again
		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				console.warn('[brAInwav] Retry failed for insight, re-queuing:', result.reason);
				this.pendingQueue.push(pending[index]);
			}
		});
	}

	private calculateImportance(priority?: string): number {
		const priorityMap: Record<string, number> = {
			P0: 10,
			P1: 8,
			P2: 6,
			P3: 5,
		};
		return priorityMap[priority || 'P2'] || 5;
	}

	private buildTags(insight: WorkflowInsight): string[] {
		const tags = ['workflow', insight.status];
		if (insight.priority) tags.push(insight.priority);
		if (insight.featureName) tags.push('feature');
		return tags;
	}

	private formatWorkflowContent(insight: WorkflowInsight): string {
		const statusText = {
			started: 'started',
			'in-progress': 'in progress',
			completed: 'completed',
			failed: 'failed',
		}[insight.status];

		let content = `brAInwav Workflow ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}`;

		if (insight.featureName) {
			content += `: ${insight.featureName}`;
		}

		if (insight.qualityMetrics) {
			const metrics = [];
			if (insight.qualityMetrics.coverage !== undefined) {
				metrics.push(`Coverage: ${insight.qualityMetrics.coverage}%`);
			}
			if (insight.qualityMetrics.security) {
				const { critical, high, medium } = insight.qualityMetrics.security;
				metrics.push(`Security: ${critical}C/${high}H/${medium}M`);
			}
			if (metrics.length > 0) {
				content += ` - ${metrics.join(', ')}`;
			}
		}

		return content;
	}

	private handleStorageError(error: unknown, pending: PendingInsight): void {
		console.warn('[brAInwav] Local memory unavailable, queueing for retry:', error);
		this.pendingQueue.push(pending);
	}
}
