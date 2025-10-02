import type { RagDocument, RagDocumentChunk } from '../db/schema.js';

export interface DocumentProcessingOptions {
	chunkSize?: number;
	chunkOverlap?: number;
	maxChunkSize?: number;
	minChunkSize?: number;
	embeddingModel?: string;
}

export interface ChunkOptions {
	chunkSize: number; // Default: 1000
	chunkOverlap: number; // Default: 200
	maxChunkSize: number; // Default: 2000
	minChunkSize: number; // Default: 200
}

export interface ParseResult {
	text: string;
	metadata: DocumentMetadata;
	pages?: number;
}

export interface DocumentMetadata {
	title?: string;
	author?: string;
	subject?: string;
	creator?: string;
	producer?: string;
	creationDate?: Date;
	modDate?: Date;
	encoding?: string;
	lines?: number;
	mimeType?: string;
	width?: number;
	height?: number;
}

export interface DocumentChunk {
	id: string;
	documentId: string;
	content: string;
	chunkIndex: number;
	startPage?: number;
	endPage?: number;
	tokenCount?: number;
	metadata?: ChunkMetadata;
}

export interface ChunkMetadata {
	startChar: number;
	endChar: number;
	sentenceCount?: number;
	paragraphCount?: number;
	pageNumber?: number;
	chunkType: 'sentence' | 'paragraph' | 'semantic';
}

export interface StoredDocument extends RagDocument {
	chunks: RagDocumentChunk[];
}

export interface UploadResult {
	documentId: string;
	filename: string;
	status: 'success' | 'processing' | 'failed';
	chunksCreated: number;
	error?: string;
}

export interface EmbeddingService {
	generateEmbedding(text: string): Promise<number[]>;
	generateEmbeddings(texts: string[]): Promise<number[][]>;
	getEmbeddingDimensions(): number;
}

export interface VectorSearchResult {
	id: string;
	documentId: string;
	filename: string;
	content: string;
	score: number;
	chunkIndex: number;
	startPage?: number;
	endPage?: number;
	citations: Citation[];
	metadata?: ChunkMetadata;
}

export interface Citation {
	documentId: string;
	documentName: string;
	filename: string;
	page?: number;
	text: string;
	score: number;
	startChar?: number;
	endChar?: number;
}

export interface SearchRequest {
	query: string;
	limit?: number;
	minScore?: number;
	documentIds?: string[];
	includeContent?: boolean;
}

export interface SearchResponse {
	results: VectorSearchResult[];
	total: number;
	query: string;
	processingTime: number;
}

export interface RAGQueryRequest {
	query: string;
	documentIds?: string[];
	maxContextLength?: number;
	maxChunks?: number;
	includeCitations?: boolean;
}

export interface RAGQueryResponse {
	answer: string;
	context: VectorSearchResult[];
	citations: Citation[];
	sources: string[];
	processingTime: number;
}

export interface DocumentProcessingError {
	error: string;
	message?: string;
	documentId?: string;
	filename?: string;
	brand: 'brAInwav';
}

export interface DocumentProcessingStatus {
	documentId: string;
	filename: string;
	status: 'pending' | 'processing' | 'completed' | 'failed';
	progress: number;
	totalChunks: number;
	processedChunks: number;
	error?: string;
}

// Database update types
export interface UpdateRagDocument {
	filename?: string;
	totalChunks?: number;
	processed?: boolean;
	processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
	processingError?: string;
	metadata?: string;
	updatedAt?: Date;
}

export interface UpdateRagDocumentChunk {
	content?: string;
	startPage?: number;
	endPage?: number;
	tokenCount?: number;
	embedding?: string;
	metadata?: string;
}

// Error response types
export interface RAGErrorResponse {
	error: string;
	message?: string;
	details?: unknown;
	brand: 'brAInwav';
	timestamp: string;
}

// Validation schemas
export interface UploadDocumentSchema {
	file: File;
	options?: DocumentProcessingOptions;
}

export interface SearchQuerySchema {
	query: string;
	limit?: number;
	minScore?: number;
	documentIds?: string[];
}

export interface RAGQuerySchema {
	query: string;
	documentIds?: string[];
	maxContextLength?: number;
	maxChunks?: number;
	includeCitations?: boolean;
}
