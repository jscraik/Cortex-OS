import { z } from 'zod';
import { byChars } from '../chunk/index.js';
import type { Chunk, Embedder, Store, RefRagChunkMetadata } from '../lib/index.js';
import { createFactExtractor, createCompressionEncoder } from '../ref-rag/index.js';

const schema = z.object({
	source: z.string(),
	text: z.string().min(1),
	embedder: z.custom<Embedder>(
		(e): e is Embedder =>
			typeof e === 'object' && e !== null && typeof (e as any).embed === 'function',
	),
	store: z.custom<Store>(
		(s): s is Store =>
			typeof s === 'object' && s !== null && typeof (s as any).upsert === 'function',
	),
	chunkSize: z.number().int().positive().default(300),
	overlap: z.number().int().nonnegative().default(0),
	// REF‑RAG options
	enableRefRag: z.boolean().default(false),
	factExtractionConfig: z.object({
		enableNumeric: z.boolean().default(true),
		enableQuotes: z.boolean().default(true),
		enableCode: z.boolean().default(true),
		enableDates: z.boolean().default(true),
		confidenceThreshold: z.number().min(0).max(1).default(0.7),
		maxFactsPerChunk: z.number().int().positive().default(50),
	}).optional(),
	compressionConfig: z.object({
		enableCompression: z.boolean().default(true),
		targetDimensions: z.number().int().positive().default(128),
		projectionWeightsPath: z.string().optional(),
	}).optional(),
});

export type IngestTextParams = z.input<typeof schema>;

export async function ingestText(params: IngestTextParams): Promise<void> {
	const {
		source,
		text,
		embedder,
		store,
		chunkSize,
		overlap,
		enableRefRag,
		factExtractionConfig,
		compressionConfig,
	} = schema.parse(params);

	const parts = byChars(text, chunkSize, overlap);
	const now = Date.now();
	const chunks: Chunk[] = parts.map((p, i) => ({
		id: `${source}#${i}`,
		text: p,
		source,
		updatedAt: now,
	}));

	// Generate standard embeddings
	const embeddings = await embedder.embed(chunks.map((c) => c.text));
	if (embeddings.length !== chunks.length) {
		throw new Error(
			`Embedding count (${embeddings.length}) does not match chunk count (${chunks.length})`,
		);
	}

	// Process with REF‑RAG if enabled
	let refRagMetadata: RefRagChunkMetadata[] = [];
	if (enableRefRag) {
		refRagMetadata = await processChunksWithRefRag(
			chunks,
			embeddings,
			factExtractionConfig,
			compressionConfig,
		);
	}

	// Combine chunks with embeddings and REF‑RAG metadata
	const withEmb = chunks.map((c, i) => {
		const chunkData: Chunk = {
			...c,
			updatedAt: c.updatedAt ?? Date.now(),
			embedding: embeddings[i],
		};

		// Add REF‑RAG metadata if available
		if (refRagMetadata[i]) {
			chunkData.metadata = {
				...chunkData.metadata,
				refRag: refRagMetadata[i],
			};
		}

		return chunkData;
	});

	await store.upsert(withEmb);
}

/**
 * Process chunks with REF‑RAG to extract facts and generate compressed embeddings
 */
async function processChunksWithRefRag(
	chunks: Chunk[],
	embeddings: number[][],
	factExtractionConfig?: any,
	compressionConfig?: any,
): Promise<RefRagChunkMetadata[]> {
	const factExtractor = createFactExtractor(factExtractionConfig);
	const compressionEncoder = createCompressionEncoder(compressionConfig?.targetDimensions);

	// Load projection weights if compression is enabled
	if (compressionConfig?.enableCompression && compressionConfig?.projectionWeightsPath) {
		try {
			await compressionEncoder.loadProjectionWeights(compressionConfig.projectionWeightsPath);
		} catch (error) {
			console.warn('Failed to load projection weights, skipping compression:', error);
		}
	}

	const metadata: RefRagChunkMetadata[] = [];

	// Process chunks in parallel batches for better performance
	const batchSize = 10;
	for (let i = 0; i < chunks.length; i += batchSize) {
		const batch = chunks.slice(i, i + batchSize);
		const batchEmbeddings = embeddings.slice(i, i + batchSize);

		const batchPromises = batch.map(async (chunk, batchIndex) => {
			const globalIndex = i + batchIndex;
			const chunkMetadata: RefRagChunkMetadata = {};

			// Extract structured facts
			if (factExtractionConfig) {
				try {
					const factResult = await factExtractor.extractFacts(chunk.text, chunk.id);
					chunkMetadata.structuredFacts = factResult.facts;
                                        const extractionMethod = factResult.metadata.method;
                                        let normalizedMethod: RefRagChunkMetadata['factExtraction']['method'];
                                        if (extractionMethod === 'parser' || extractionMethod === 'ml') {
                                            normalizedMethod = extractionMethod;
                                        } else {
                                            console.warn(
                                                `Unrecognized extraction method '${extractionMethod}' for chunk ${chunk.id}, defaulting to 'regex'.`
                                            );
                                            normalizedMethod = 'regex';
                                        }
                                        chunkMetadata.factExtraction = {
                                                timestamp: Date.now(),
                                                method: normalizedMethod,
                                                confidence: factResult.metadata.confidence,
                                                factCount: factResult.facts.length,
                                        };
				} catch (error) {
					console.warn(`Fact extraction failed for chunk ${chunk.id}:`, error);
				}
			}

			// Analyze content for risk classification and domains
			chunkMetadata.contentAnalysis = analyzeContent(chunk.text);

			// Generate compressed embeddings for Band B
			if (compressionConfig?.enableCompression && batchEmbeddings[batchIndex]) {
				try {
					const compressionResult = await compressionEncoder.encode(batchEmbeddings[batchIndex]);
                                        const compressionMeta = compressionResult.metadata;
                                        chunkMetadata.dualEmbeddings = {
                                                standard: batchEmbeddings[batchIndex],
                                                compressed: Array.from(compressionResult.compressedEmbedding),
                                                compression: {
                                                        originalDimensions: compressionMeta.originalDimensions,
                                                        compressedDimensions: compressionMeta.compressedDimensions,
                                                        compressionRatio: compressionMeta.compressionRatio,
                                                        method:
                                                                compressionMeta.method === 'quantization' ||
                                                                compressionMeta.method === 'hybrid'
                                                                        ? compressionMeta.method
                                                                        : 'projection',
                                                },
                                        };
				} catch (error) {
					console.warn(`Compression failed for chunk ${chunk.id}:`, error);
					// Fall back to standard embedding only
					chunkMetadata.dualEmbeddings = {
						standard: batchEmbeddings[batchIndex],
					};
				}
			} else {
				// Store standard embedding only
				chunkMetadata.dualEmbeddings = {
					standard: batchEmbeddings[batchIndex],
				};
			}

			// Calculate quality metrics
			chunkMetadata.qualityMetrics = calculateQualityMetrics(chunk, chunkMetadata);

			return { index: globalIndex, metadata: chunkMetadata };
		});

		const batchResults = await Promise.all(batchPromises);

		// Sort results back to original order and add to metadata array
		batchResults.sort((a, b) => a.index - b.index);
		batchResults.forEach(result => {
			metadata[result.index] = result.metadata;
		});
	}

	return metadata;
}

/**
 * Analyze content for risk classification and domain detection
 */
function analyzeContent(text: string): RefRagChunkMetadata['contentAnalysis'] {
	const analysis = {
		hasNumbers: /\d/.test(text),
		hasQuotes: /["'].*["']/.test(text),
		hasCode: /`[^`]+`|```[\s\S]*?```|\b(function|def|class|var|let|const)\b/.test(text),
		hasDates: /\b\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\b|\b(Jan|Feb|Mar|...|Dec)\b/i.test(text),
		hasEntities: /\b[A-Z][a-z]+ [A-Z][a-z]+\b|\b\d+\.\d+\.\d+\b/.test(text),
		domains: [] as string[],
		entities: [] as string[],
	};

	// Domain detection using keyword patterns
	const domainKeywords = {
		medical: [
			'diagnosis', 'symptom', 'treatment', 'medication', 'dosage',
			'side effect', 'prescription', 'therapy', 'clinical', 'patient',
		],
		financial: [
			'investment', 'portfolio', 'returns', 'risk', 'asset',
			'dividend', 'interest', 'stock', 'market', 'currency', 'trading',
		],
		technical: [
			'algorithm', 'function', 'method', 'code', 'programming',
			'development', 'software', 'system', 'architecture', 'design',
		],
		legal: [
			'legal', 'law', 'contract', 'liability', 'compliance',
			'regulation', 'statute', 'jurisdiction', 'court', 'litigation',
		],
		scientific: [
			'research', 'study', 'experiment', 'hypothesis', 'data',
			'analysis', 'methodology', 'results', 'conclusion', 'evidence',
		],
	};

	const lowerText = text.toLowerCase();
	for (const [domain, keywords] of Object.entries(domainKeywords)) {
		if (keywords.some(keyword => lowerText.includes(keyword))) {
			analysis.domains.push(domain);
		}
	}

	// Simple entity extraction (capitalized phrases, version numbers, etc.)
	const entityPatterns = [
		/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g, // Proper nouns
		/\b\d+\.\d+\.\d+(?:-[a-zA-Z0-9]+)?\b/g, // Version numbers
		/\b[A-Z]{2,}\b/g, // Acronyms
	];

	for (const pattern of entityPatterns) {
		const matches = text.match(pattern) || [];
		analysis.entities.push(...matches.slice(0, 10)); // Limit to prevent noise
	}

	analysis.entities = [...new Set(analysis.entities)]; // Remove duplicates

	return analysis;
}

/**
 * Calculate quality metrics for chunks
 */
function calculateQualityMetrics(
	chunk: Chunk,
	refRagMetadata: RefRagChunkMetadata,
): RefRagChunkMetadata['qualityMetrics'] {
	const now = Date.now();
	const ageInDays = chunk.updatedAt ? (now - chunk.updatedAt) / (1000 * 60 * 60 * 24) : 0;

	// Freshness score (newer is better, normalized to 0-1)
	const freshnessScore = Math.max(0, 1 - ageInDays / 365); // Decay over a year

	// Completeness score based on content length and structure
	const textLength = chunk.text.length;
	const completenessScore = Math.min(1, textLength / 1000); // Normalize to 1000 chars

	// Diversity score based on fact extraction and content analysis
	let diversityScore = 0.3; // Base score
	if (refRagMetadata.structuredFacts?.length) {
		diversityScore += Math.min(0.4, refRagMetadata.structuredFacts.length / 20);
	}
	if (refRagMetadata.contentAnalysis?.hasNumbers) diversityScore += 0.1;
	if (refRagMetadata.contentAnalysis?.hasQuotes) diversityScore += 0.1;
	if (refRagMetadata.contentAnalysis?.hasCode) diversityScore += 0.1;

	// Accuracy score based on fact extraction confidence
	let accuracyScore = 0.7; // Base score
	if (refRagMetadata.factExtraction?.confidence) {
		accuracyScore = refRagMetadata.factExtraction.confidence;
	}

	return {
		freshnessScore: Math.round(freshnessScore * 100) / 100,
		diversityScore: Math.round(diversityScore * 100) / 100,
		completenessScore: Math.round(completenessScore * 100) / 100,
		accuracyScore: Math.round(accuracyScore * 100) / 100,
	};
}
