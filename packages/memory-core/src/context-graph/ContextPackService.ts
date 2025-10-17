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
                brainwavSource: string;
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
                nodesIncluded?: number;
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
                        const validation = await this.validatePackOptions(options);
                        if (!validation.valid) {
                                const errorMessage =
                                        validation.errors.length > 0
                                                ? `Invalid pack options: ${validation.errors.join(', ')}`
                                                : 'Invalid pack options';
                                return this.createErrorResult(subgraph, errorMessage, startTime, options);
                        }

                        if (subgraph.nodes.length === 0 && subgraph.edges.length === 0) {
                                return {
                                        subgraph,
                                        packedContext: '',
                                        citations: [],
                                        metadata: {
                                                totalNodes: 0,
                                                totalEdges: 0,
                                                totalTokens: 0,
                                                packDuration: Date.now() - startTime,
                                                format: options.format || 'markdown',
                                                tokenLimitEnforced: false,
                                                nodesIncluded: 0,
                                                nodesFiltered: 0,
                                                privacyModeEnforced: Boolean(options.privacyMode),
                                                evidenceAggregated: false,
                                                externalKnowledgeIncluded: false,
                                                brainwavBranded: options.branding !== false,
                                        },
                                };
                        }

                        // Apply privacy mode filtering if enabled
                        const privacyResult = options.privacyMode
                                ? await this.applyPrivacyMode(subgraph, options.sensitivityThreshold)
                                : {
                                          subgraph,
                                          filteredNodes: 0,
                                          filterReason: 'Privacy mode disabled',
                                  };
                        const filteredSubgraph = privacyResult.subgraph;

                        // Enforce token limits by prioritizing high-scoring content
                        const tokenResult = this.enforceTokenLimits(filteredSubgraph, options.maxTokens);
                        const tokenLimitedSubgraph = tokenResult.subgraph;

                        // Generate packed context
                        const citations: NonNullable<PackedContext['citations']> = options.includeCitations
                                ? this.generateCitations(tokenLimitedSubgraph.nodes, options.citationFormat)
                                : [];

                        const evidence = options.includeEvidence
                                ? this.aggregateEvidence(tokenLimitedSubgraph.nodes)
                                : undefined;

                        const packedContext = this.generatePackedContext(
                                tokenLimitedSubgraph,
                                options,
                                citations,
                                evidence,
                        );

                        const packDuration = Date.now() - startTime;

                        return {
                                subgraph: tokenLimitedSubgraph,
                                packedContext,
                                citations: options.includeCitations ? citations : undefined,
                                evidence,
                                metadata: {
                                        totalNodes: tokenLimitedSubgraph.nodes.length,
                                        totalEdges: tokenLimitedSubgraph.edges.length,
                                        totalTokens: tokenResult.totalTokens,
                                        packDuration,
                                        format: options.format || 'markdown',
                                        tokenLimitEnforced: tokenResult.tokenLimitEnforced,
                                        nodesIncluded: tokenLimitedSubgraph.nodes.length,
                                        nodesFiltered: options.privacyMode ? privacyResult.filteredNodes : 0,
                                        filterReason:
                                                options.privacyMode && privacyResult.filteredNodes > 0
                                                        ? privacyResult.filterReason
                                                        : undefined,
                                        privacyModeEnforced: Boolean(options.privacyMode),
                                        evidenceAggregated: Boolean(evidence),
                                        externalKnowledgeIncluded:
                                                options.includeExternalKnowledge &&
                                                this.hasExternalKnowledge(tokenLimitedSubgraph),
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

        async validatePackOptions(options: PackOptions): Promise<PackValidationResult> {
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

                const allowedNodes: ContextSubgraph['nodes'] = [];
                const filteredOut: ContextSubgraph['nodes'] = [];

                for (const node of subgraph.nodes) {
                        const nodeSensitivity = node.metadata.sensitivity || 'low';
                        const nodeLevel = sensitivityLevels[nodeSensitivity as keyof typeof sensitivityLevels] || 1;
                        if (nodeLevel <= requiredLevel) {
                                allowedNodes.push(node);
                        } else {
                                filteredOut.push(node);
                        }
                }

                const allowedNodeIds = new Set(allowedNodes.map((node) => node.id));
                const filteredEdges = subgraph.edges.filter(
                        (edge) => allowedNodeIds.has(edge.from) && allowedNodeIds.has(edge.to),
                );

                const filteredCount = filteredOut.length;
                const containsHighSensitivity = filteredOut.some((node) => node.metadata.sensitivity === 'high');
                const filterReason =
                        filteredCount > 0
                                ? containsHighSensitivity
                                        ? `High sensitivity content filtered (${filteredCount} node${
                                                  filteredCount === 1 ? '' : 's'
                                          }) with threshold ${threshold || 'medium'}`
                                        : `Filtered ${filteredCount} nodes to enforce privacy mode (threshold: ${
                                                  threshold || 'medium'
                                          })`
                                : 'No privacy filtering required';

                return {
                        subgraph: {
                                nodes: allowedNodes,
                                edges: filteredEdges,
                        },
                        filteredNodes: filteredCount,
                        filterReason,
                };
        }

        private enforceTokenLimits(
                subgraph: ContextSubgraph,
                maxTokens?: number,
        ): { subgraph: ContextSubgraph; totalTokens: number; tokenLimitEnforced: boolean } {
                if (!maxTokens) {
                        return {
                                subgraph,
                                totalTokens: this.calculateTokens(subgraph),
                                tokenLimitEnforced: false,
                        };
                }

                const sortedNodes = [...subgraph.nodes].sort(
                        (a, b) => (b.metadata.score || 0) - (a.metadata.score || 0),
                );

                const selectedNodes: ContextSubgraph['nodes'] = [];
                let totalTokens = 0;

                for (const node of sortedNodes) {
                        const nodeTokens = this.getNodeTokens(node);
                        if (totalTokens + nodeTokens <= maxTokens) {
                                selectedNodes.push(node);
                                totalTokens += nodeTokens;
                        }
                }

                const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
                const filteredEdges = subgraph.edges.filter(
                        (edge) => selectedNodeIds.has(edge.from) && selectedNodeIds.has(edge.to),
                );

                const tokenLimitEnforced =
                        selectedNodes.length !== subgraph.nodes.length || totalTokens >= maxTokens;

                return {
                        subgraph: {
                                nodes: selectedNodes,
                                edges: filteredEdges,
                        },
                        totalTokens,
                        tokenLimitEnforced,
                };
        }

        private generatePackedContext(
                subgraph: ContextSubgraph,
                options: PackOptions,
                citations: NonNullable<PackedContext['citations']>,
                evidence?: PackedContext['evidence'],
        ): string {
                const format = options.format || 'markdown';
                const branding = options.branding !== false;

                if (format === 'json') {
                        return this.generateJSONContext(subgraph, branding, citations, evidence);
                }

                return this.generateMarkdownContext(subgraph, branding, citations, evidence);
        }

        private generateJSONContext(
                subgraph: ContextSubgraph,
                branding: boolean,
                citations: NonNullable<PackedContext['citations']>,
                evidence?: PackedContext['evidence'],
        ): string {
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
                        citations,
                        ...(evidence ? { evidence } : {}),
                        ...(branding && {
                                brainwavGenerated: true,
                                brainwavSource: 'brAInwav Cortex-OS Context Pack Service',
                                generatedAt: new Date().toISOString(),
                        }),
                };

                return JSON.stringify(context, null, 2);
        }

        private generateMarkdownContext(
                subgraph: ContextSubgraph,
                branding: boolean,
                citations: NonNullable<PackedContext['citations']>,
                evidence?: PackedContext['evidence'],
        ): string {
                if (subgraph.nodes.length === 0 && subgraph.edges.length === 0) {
                        return '';
                }

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

                if (evidence) {
                        markdown += `## Evidence Summary\n\n`;
                        if (evidence.sources && evidence.sources.length > 0) {
                            markdown += `*Sources:* ${evidence.sources.join(', ')}\n\n`;
                        } else {
                            markdown += `*Sources:* No sources available.\n\n`;
                        }
                        markdown += `*Confidence:* ${(evidence.confidence * 100).toFixed(0)}%\n\n`;
                }

                markdown += `## Citations\n\n`;
                if (citations.length === 0) {
                        markdown += `_No citations available._\n\n`;
                } else {
                        for (const citation of citations) {
                                const lineInfo = citation.lines ? ` (lines ${citation.lines})` : '';
                                markdown += `- ${citation.path}${lineInfo} — ${citation.brainwavSource}\n`;
                        }
                        markdown += '\n';
                }

                if (branding) {
                        markdown += `---\n\n*brAInwav Cortex-OS - Context Graph Packing Service*\n`;
                }

                return markdown;
        }

        private generateCitations(
                nodes: ContextSubgraph['nodes'],
                _format?: string,
        ): NonNullable<PackedContext['citations']> {
                return nodes.map((node) => ({
                        path: node.path,
                        lines: node.lineStart && node.lineEnd ? `${node.lineStart}-${node.lineEnd}` : undefined,
                        nodeType: node.type,
                        relevanceScore: node.metadata.score || 0,
                        brainwavIndexed: node.metadata.brainwavIndexed !== false,
                        brainwavSource: 'brAInwav Context Graph',
                        externalSource: node.metadata.externalSource,
                }));
        }

        private aggregateEvidence(nodes: ContextSubgraph['nodes']): PackedContext['evidence'] {
                const allSources = new Set<string>();
                let totalConfidence = 0;
                let contributingNodes = 0;

                for (const node of nodes) {
                        if (node.metadata.evidence) {
                                for (const source of node.metadata.evidence) {
                                        allSources.add(source);
                                }
                                totalConfidence += node.metadata.score || 0;
                                contributingNodes += 1;
                        }
                }

                const averageConfidence = contributingNodes > 0 ? totalConfidence / contributingNodes : 0;

                return {
                        sources: Array.from(allSources),
                        confidence: Number(averageConfidence.toFixed(2)),
                        brainwavValidated: true,
                };
        }

        private hasExternalKnowledge(subgraph: ContextSubgraph): boolean {
                return subgraph.nodes.some((node) => node.metadata.externalSource);
        }

        private calculateTokens(subgraph: ContextSubgraph): number {
                return subgraph.nodes.reduce((total, node) => total + this.getNodeTokens(node), 0);
        }

        private getNodeTokens(node: ContextSubgraph['nodes'][number]): number {
                const metadataTokens = node.metadata?.tokens;
                if (typeof metadataTokens === 'number' && metadataTokens >= 0) {
                        return metadataTokens;
                }

                return this.estimateTokens(node.content);
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
                options?: PackOptions,
        ): PackedContext {
                return {
                        subgraph: { nodes: [], edges: [] },
                        packedContext: '',
                        metadata: {
                                totalNodes: 0,
                                totalEdges: 0,
                                totalTokens: 0,
                                packDuration: Date.now() - startTime,
                                format: options?.format || 'markdown',
                                nodesIncluded: 0,
                                nodesFiltered: 0,
                                brainwavBranded: true,
                                error,
                        },
                };
        }
}
