/**
 * Context Pack Service for brAInwav Cortex-OS
 *
 * Implements context packing with citation generation, privacy mode enforcement,
 * and evidence aggregation for LangGraph.js orchestration.
 *
 * Key Features:
 * - Context packing with proper citation generation
 * - Evidence aggregation and source attribution
 * - Privacy mode compliance and sensitive content filtering
 * - Token limit enforcement and content prioritization
 * - Multiple output formats (JSON, Markdown)
 * - External knowledge base integration
 */

import type { GraphNodeType } from '@prisma/client';

export interface ContextSubgraph {
	nodes: Array<{
		id: string;
		type: GraphNodeType;
		key: string;
		label: string;
		path: string;
		content: string;
		lineStart?: number;
		lineEnd?: number;
		metadata: Record<string, any>;
	}>;
	edges: Array<{
		id: string;
		from: string;
		to: string;
		type: string;
		metadata: Record<string, any>;
	}>;
}

export interface PackOptions {
	includeCitations: boolean;
	maxTokens?: number;
	format?: 'json' | 'markdown';
	branding?: boolean;
	citationFormat?: 'simple' | 'academic';
	privacyMode?: boolean;
	sensitivityThreshold?: 'low' | 'medium' | 'high';
	includeEvidence?: boolean;
	includeExternalKnowledge?: boolean;
}

export interface PackedContext {
	subgraph: ContextSubgraph;
	packedContext: string;
	citations?: Array<{
		path: string;
		lines?: string;
		nodeType: GraphNodeType;
		relevanceScore: number;
		brainwavIndexed: boolean;
		externalSource?: string;
	}>;
	evidence?: {
		sources: string[];
		confidence: number;
		brainwavValidated: boolean;
	};
	metadata: {
		totalNodes: number;
		totalEdges: number;
		totalTokens: number;
		packDuration: number;
		format?: string;
		tokenLimitEnforced?: boolean;
		nodesFiltered?: number;
		filterReason?: string;
		privacyModeEnforced?: boolean;
		evidenceAggregated?: boolean;
		externalKnowledgeIncluded?: boolean;
		brainwavBranded: boolean;
		error?: string;
	};
}

export interface PackValidationResult {
	valid: boolean;
	errors: string[];
	warnings?: string[];
}

export class ContextPackService {
	async pack(subgraph: ContextSubgraph, options: PackOptions): Promise<PackedContext> {
		const startTime = Date.now();

		try {
			// Validate options
                        const validation = this.validatePackOptions(options);
                        if (!validation.valid) {
                                return this.createErrorResult(subgraph, validation.errors[0], startTime);
                        }

			// Apply privacy mode filtering if enabled
			let filteredSubgraph = subgraph;
			if (options.privacyMode) {
				const privacyResult = await this.applyPrivacyMode(subgraph, options.sensitivityThreshold);
				filteredSubgraph = privacyResult.subgraph;
			}

			// Enforce token limits by prioritizing high-scoring content
			const tokenLimitedSubgraph = this.enforceTokenLimits(filteredSubgraph, options.maxTokens);

			// Generate packed context
			const packedContext = this.generatePackedContext(tokenLimitedSubgraph, options);

			// Generate citations if requested
                        let citations;
			if (options.includeCitations) {
				citations = this.generateCitations(tokenLimitedSubgraph.nodes, options.citationFormat);
			}

			// Aggregate evidence if requested
			let evidence;
			if (options.includeEvidence) {
				evidence = this.aggregateEvidence(tokenLimitedSubgraph.nodes);
			}

			const packDuration = Date.now() - startTime;

			return {
				subgraph: tokenLimitedSubgraph,
				packedContext,
				citations,
				evidence,
				metadata: {
					totalNodes: tokenLimitedSubgraph.nodes.length,
					totalEdges: tokenLimitedSubgraph.edges.length,
					totalTokens: this.calculateTokens(tokenLimitedSubgraph),
					packDuration,
					format: options.format || 'markdown',
					tokenLimitEnforced: options.maxTokens
						? tokenLimitedSubgraph.nodes.length < subgraph.nodes.length
						: false,
					nodesFiltered: options.privacyMode
						? subgraph.nodes.length - filteredSubgraph.nodes.length
						: 0,
					filterReason: options.privacyMode ? 'Privacy mode filtering applied' : undefined,
					privacyModeEnforced: options.privacyMode || false,
					evidenceAggregated: options.includeEvidence || false,
					externalKnowledgeIncluded: this.hasExternalKnowledge(tokenLimitedSubgraph),
					brainwavBranded: options.branding !== false,
				},
			};
		} catch (error) {
			return this.createErrorResult(
				subgraph,
				`Packing error: ${error instanceof Error ? error.message : String(error)}`,
				startTime,
			);
		}
	}

        validatePackOptions(options: PackOptions): PackValidationResult {
                const errors: string[] = [];
                const warnings: string[] = [];

		// Validate includeCitations
		if (typeof options.includeCitations !== 'boolean') {
			errors.push('includeCitations must be a boolean');
		}

		// Validate maxTokens
		if (options.maxTokens !== undefined) {
			if (typeof options.maxTokens !== 'number' || options.maxTokens <= 0) {
				errors.push('maxTokens must be a positive number');
			}
		}

		// Validate format
		if (options.format && !['json', 'markdown'].includes(options.format)) {
			errors.push('format must be either "json" or "markdown"');
		}

		// Validate branding
		if (options.branding !== undefined && typeof options.branding !== 'boolean') {
			errors.push('branding must be a boolean');
		}

		// Validate citationFormat
		if (options.citationFormat && !['simple', 'academic'].includes(options.citationFormat)) {
			warnings.push('citationFormat should be either "simple" or "academic"');
		}

		// Validate privacyMode
		if (options.privacyMode !== undefined && typeof options.privacyMode !== 'boolean') {
			errors.push('privacyMode must be a boolean');
		}

                return {
                        valid: errors.length === 0,
                        errors,
                        warnings,
                };
        }

	private async applyPrivacyMode(
		subgraph: ContextSubgraph,
		threshold?: string,
	): Promise<{ subgraph: ContextSubgraph; filteredNodes: number; filterReason: string }> {
		const sensitivityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
		const requiredLevel = sensitivityLevels[threshold as keyof typeof sensitivityLevels] || 2;

		const filteredNodes = subgraph.nodes.filter((node) => {
			const nodeSensitivity = node.metadata.sensitivity || 'low';
			const nodeLevel = sensitivityLevels[nodeSensitivity as keyof typeof sensitivityLevels] || 1;
			return nodeLevel <= requiredLevel;
		});

		const filteredEdges = subgraph.edges.filter(
			(edge) =>
				filteredNodes.some((node) => node.id === edge.from) &&
				filteredNodes.some((node) => node.id === edge.to),
		);

		const filteredCount = subgraph.nodes.length - filteredNodes.length;

		return {
			subgraph: {
				nodes: filteredNodes,
				edges: filteredEdges,
			},
			filteredNodes: filteredCount,
			filterReason:
				filteredCount > 0
					? `Filtered ${filteredCount} nodes due to privacy mode (threshold: ${threshold || 'medium'})`
					: 'No filtering applied',
		};
	}

	private enforceTokenLimits(subgraph: ContextSubgraph, maxTokens?: number): ContextSubgraph {
		if (!maxTokens) return subgraph;

		// Sort nodes by score (highest first)
		const sortedNodes = [...subgraph.nodes].sort(
			(a, b) => (b.metadata.score || 0) - (a.metadata.score || 0),
		);

		const selectedNodes = [];
		let totalTokens = 0;

		for (const node of sortedNodes) {
			const nodeTokens = this.estimateTokens(node.content);
			if (totalTokens + nodeTokens <= maxTokens) {
				selectedNodes.push(node);
				totalTokens += nodeTokens;
			} else {
				break;
			}
		}

		// Filter edges to only include those between selected nodes
		const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
		const filteredEdges = subgraph.edges.filter(
			(edge) => selectedNodeIds.has(edge.from) && selectedNodeIds.has(edge.to),
		);

		return {
			nodes: selectedNodes,
			edges: filteredEdges,
		};
	}

	private generatePackedContext(subgraph: ContextSubgraph, options: PackOptions): string {
		const format = options.format || 'markdown';
		const branding = options.branding !== false;

		if (format === 'json') {
			return this.generateJSONContext(subgraph, branding);
		} else {
			return this.generateMarkdownContext(subgraph, branding);
		}
	}

	private generateJSONContext(subgraph: ContextSubgraph, branding: boolean): string {
		const context = {
			content: subgraph.nodes.map((node) => ({
				id: node.id,
				type: node.type,
				key: node.key,
				label: node.label,
				path: node.path,
				content: node.content,
				lines: node.lineStart && node.lineEnd ? `${node.lineStart}-${node.lineEnd}` : undefined,
				metadata: node.metadata,
			})),
			edges: subgraph.edges.map((edge) => ({
				id: edge.id,
				from: edge.from,
				to: edge.to,
				type: edge.type,
				metadata: edge.metadata,
			})),
			...(branding && {
				brainwavGenerated: true,
				brainwavSource: 'brAInwav Cortex-OS Context Pack Service',
				generatedAt: new Date().toISOString(),
			}),
		};

		return JSON.stringify(context, null, 2);
	}

	private generateMarkdownContext(subgraph: ContextSubgraph, branding: boolean): string {
		let markdown = '';

		if (branding) {
			markdown += `# brAInwav Cortex-OS Context\n\n`;
			markdown += `*Generated by brAInwav Context Pack Service*\n\n`;
		}

		markdown += `## Context Content\n\n`;

		for (const node of subgraph.nodes) {
			markdown += `### ${node.label}\n\n`;
			markdown += `**Type:** ${node.type}\n`;
			markdown += `**Path:** \`${node.path}\`\n`;
			if (node.lineStart && node.lineEnd) {
				markdown += `**Lines:** ${node.lineStart}-${node.lineEnd}\n`;
			}
			markdown += `\n\`\`\`${this.getFileExtension(node.path)}\n${node.content}\n\`\`\`\n\n`;
		}

		if (branding) {
			markdown += `---\n\n*brAInwav Cortex-OS - Context Graph Packing Service*\n`;
		}

		return markdown;
	}

	private generateCitations(
		nodes: ContextSubgraph['nodes'],
		_format?: string,
	): PackedContext['citations'] {
		return nodes.map((node) => ({
			path: node.path,
			lines: node.lineStart && node.lineEnd ? `${node.lineStart}-${node.lineEnd}` : undefined,
			nodeType: node.type,
			relevanceScore: node.metadata.score || 0,
			brainwavIndexed: node.metadata.brainwavIndexed !== false,
			externalSource: node.metadata.externalSource,
		}));
	}

	private aggregateEvidence(nodes: ContextSubgraph['nodes']): PackedContext['evidence'] {
		const allSources = new Set<string>();
		let totalConfidence = 0;

		for (const node of nodes) {
			if (node.metadata.evidence) {
				for (const source of node.metadata.evidence) {
					allSources.add(source);
				}
				totalConfidence += node.metadata.score || 0;
			}
		}

		return {
			sources: Array.from(allSources),
			confidence: nodes.length > 0 ? totalConfidence / nodes.length : 0,
			brainwavValidated: true,
		};
	}

	private hasExternalKnowledge(subgraph: ContextSubgraph): boolean {
		return subgraph.nodes.some((node) => node.metadata.externalSource);
	}

	private calculateTokens(subgraph: ContextSubgraph): number {
		return subgraph.nodes.reduce((total, node) => total + this.estimateTokens(node.content), 0);
	}

	private estimateTokens(text: string): number {
		// Simple token estimation - approximately 4 characters per token
		return Math.ceil(text.length / 4);
	}

	private getFileExtension(path: string): string {
		const match = path.match(/\.([^.]+)$/);
		return match ? match[1] : 'text';
	}

	private createErrorResult(
		_subgraph: ContextSubgraph,
		error: string,
		startTime: number,
	): PackedContext {
		return {
			subgraph: { nodes: [], edges: [] },
			packedContext: '',
			metadata: {
				totalNodes: 0,
				totalEdges: 0,
				totalTokens: 0,
				packDuration: Date.now() - startTime,
				brainwavBranded: true,
				error,
			},
		};
	}
}
