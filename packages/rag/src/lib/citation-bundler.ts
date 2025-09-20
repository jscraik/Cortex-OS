import type { Chunk, Citation, CitationBundle } from './types.js';

export interface ClaimCitation {
	claim: string;
	citations: Citation[];
	noEvidence?: boolean;
}

export interface EnhancedCitationBundle extends CitationBundle {
	noEvidence?: boolean;
	claimCitations?: ClaimCitation[];
	sourceGroups?: Record<string, Citation[]>;
}

export class CitationBundler {
	bundle(chunks: Array<Chunk & { score?: number }>): EnhancedCitationBundle {
		if (chunks.length === 0) {
			return {
				text: '',
				citations: [],
				noEvidence: true,
			};
		}

		const citations = chunks.map((c) => {
			const meta = c.metadata ?? ({} as Record<string, unknown>);
			const ctx = typeof meta.context === 'string' && meta.context.trim().length > 0 ? meta.context : undefined;
			const mergedText = ctx ? `${ctx}\n\n${c.text}` : c.text;
			return {
				id: c.id,
				source: c.source,
				text: mergedText,
				score: c.score,
			};
		});
		const text = citations.map((c) => c.text).join('\n');
		return { text, citations };
	}

	bundleWithClaims(
		chunks: Array<Chunk & { score?: number }>,
		claims: string[],
	): EnhancedCitationBundle {
		const basicBundle = this.bundle(chunks);
		const claimCitations: ClaimCitation[] = claims.map((claim) => {
			// Simple keyword matching for citation assignment
			// In production, this would use semantic similarity
			const relevantCitations = basicBundle.citations.filter((citation) =>
				this.isRelevantToClaim(claim, citation),
			);

			return {
				claim,
				citations: relevantCitations,
				noEvidence: relevantCitations.length === 0,
			};
		});

		return {
			...basicBundle,
			claimCitations,
		};
	}

	bundleWithDeduplication(chunks: Array<Chunk & { score?: number }>): EnhancedCitationBundle {
		const basicBundle = this.bundle(chunks);

		// Group citations by source for deduplication
		const sourceGroups: Record<string, Citation[]> = {};
		basicBundle.citations.forEach((citation) => {
			const source = citation.source || 'unknown';
			if (!sourceGroups[source]) {
				sourceGroups[source] = [];
			}
			sourceGroups[source].push(citation);
		});

		// Sort within each group for deterministic ordering
		Object.values(sourceGroups).forEach((group) => {
			group.sort((a, b) => (b.score || 0) - (a.score || 0));
		});

		return {
			...basicBundle,
			sourceGroups,
		};
	}

	private isRelevantToClaim(claim: string, citation: Citation): boolean {
		// Simple keyword-based relevance check
		// In production, this would use semantic similarity or NLP
		const claimWords = claim.toLowerCase().split(/\s+/);
		const citationText = citation.text.toLowerCase();

		return claimWords.some((word) => word.length > 3 && citationText.includes(word));
	}
}
