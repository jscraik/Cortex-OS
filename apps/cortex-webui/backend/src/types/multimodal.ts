import type { DocumentMetadata } from './rag.js';

export interface MultimodalDocument {
	id: string;
	userId: string;
	filename: string;
	originalName: string;
	mimeType: string;
	modality: 'text' | 'image' | 'audio' | 'video' | 'pdf_with_images';
	size: number;
	totalChunks: number;
	processed: boolean;
	processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
	processingError?: string;
	metadata: string; // JSON string
	createdAt: Date;
	updatedAt: Date;
}

export interface MultimodalChunk {
	id: string;
	documentId: string;
	content: string;
	chunkIndex: number;
	modality: 'text' | 'image' | 'audio_transcript' | 'video_frame' | 'pdf_page_image';
	startPage?: number;
	endPage?: number;
	startTime?: number; // For audio/video in seconds
	endTime?: number; // For audio/video in seconds
	tokenCount?: number;
	embedding?: string; // JSON string vector
	metadata: string; // JSON string
	createdAt: Date;
	updatedAt: Date;
}

// Image-specific types
export interface ImageMetadata extends DocumentMetadata {
	width: number;
	height: number;
	format: 'PNG' | 'JPEG' | 'WebP' | 'GIF';
	colorSpace?: string;
	hasAlpha?: boolean;
	exif?: ExifData;
	ocrText?: string;
	visionAnalysis?: VisionAnalysisResult;
}

export interface ExifData {
	cameraMake?: string;
	cameraModel?: string;
	lensModel?: string;
	focalLength?: number;
	aperture?: string;
	exposureTime?: string;
	iso?: number;
	flash?: boolean;
	gpsCoordinates?: {
		latitude: number;
		longitude: number;
	};
	dateTaken?: Date;
}

export interface VisionAnalysisResult {
	description: string;
	objects: DetectedObject[];
	text?: string; // OCR result
	confidence: number;
	analysisModel: string;
	processedAt: Date;
}

export interface DetectedObject {
	label: string;
	confidence: number;
	boundingBox: BoundingBox;
	attributes?: Record<string, unknown>;
}

export interface BoundingBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

// Audio-specific types
export interface AudioMetadata extends DocumentMetadata {
	duration: number; // in seconds
	format: 'MP3' | 'WAV' | 'M4A' | 'OGG';
	sampleRate: number;
	channels: number;
	bitrate?: number;
	transcript?: string;
	speakerDiarization?: SpeakerSegment[];
	waveform?: number[]; // Normalized amplitude data
}

export interface SpeakerSegment {
	speakerId: string;
	startTime: number;
	endTime: number;
	text: string;
	confidence: number;
}

export interface TranscriptionResult {
	text: string;
	segments: TranscriptionSegment[];
	speakers: SpeakerInfo[];
	processingTime: number;
	model: string;
	confidence: number;
	language?: string;
}

export interface TranscriptionSegment {
	start: number;
	end: number;
	text: string;
	speakerId?: string;
	confidence: number;
}

export interface SpeakerInfo {
	id: string;
	name?: string;
	gender?: 'male' | 'female' | 'unknown';
	segments: number;
	totalSpeakingTime: number;
}

// PDF with images types
export interface PdfWithImagesMetadata extends DocumentMetadata {
	pages: PdfPage[];
	totalImages: number;
	totalText: number;
	hasEmbeddedImages: boolean;
	layoutPreserved: boolean;
}

export interface PdfPage {
	pageNumber: number;
	text?: string;
	images: ExtractedImage[];
	layout: LayoutInfo;
}

export interface ExtractedImage {
	id: string;
	position: BoundingBox;
	width: number;
	height: number;
	format: string;
	base64Data: string;
	ocrText?: string;
	visionAnalysis?: VisionAnalysisResult;
	caption?: string;
}

export interface LayoutInfo {
	hasText: boolean;
	hasImages: boolean;
	columns?: number;
	textBlocks: TextBlock[];
	imageBlocks: ImageBlock[];
}

export interface TextBlock {
	text: string;
	position: BoundingBox;
	fontSize?: number;
	fontFamily?: string;
	isBold?: boolean;
	isItalic?: boolean;
}

export interface ImageBlock {
	position: BoundingBox;
	caption?: string;
	referencesText?: boolean;
}

// API Request/Response types
export interface MultimodalUploadRequest {
	file: Express.Multer.File;
	options?: MultimodalProcessingOptions;
}

export interface MultimodalProcessingOptions {
	chunkSize?: number;
	chunkOverlap?: number;
	enableOCR?: boolean;
	enableVisionAnalysis?: boolean;
	enableTranscription?: boolean;
	enableSpeakerDiarization?: boolean;
	language?: string; // For audio transcription
	visionModel?: string;
	transcriptionModel?: string;
}

export interface MultimodalUploadResult {
	documentId: string;
	filename: string;
	modality: string;
	status: 'success' | 'processing' | 'failed';
	chunksCreated: number;
	processingTime: number;
	summary: MultimodalSummary;
	error?: string;
	brand: 'brAInwav';
}

export interface MultimodalSummary {
	textLength?: number;
	imageCount?: number;
	audioDuration?: number;
	extractedImages?: number;
	transcriptLength?: number;
	speakersIdentified?: number;
	objectsDetected?: number;
	pagesProcessed?: number;
}

export interface MultimodalSearchRequest {
	query: string;
	modalities?: ('text' | 'image' | 'audio' | 'video' | 'pdf_with_images')[];
	limit?: number;
	minScore?: number;
	documentIds?: string[];
	includeContent?: boolean;
	filters?: MultimodalSearchFilters;
}

export interface MultimodalSearchFilters {
	mimeType?: string[];
	minDuration?: number;
	maxDuration?: number;
	minWidth?: number;
	maxWidth?: number;
	minHeight?: number;
	maxHeight?: number;
	language?: string;
	speakerCount?: number;
	dateRange?: {
		start: Date;
		end: Date;
	};
}

export interface MultimodalSearchResult {
	id: string;
	documentId: string;
	filename: string;
	modality: string;
	content: string;
	score: number;
	chunkIndex: number;
	startPage?: number;
	endPage?: number;
	startTime?: number;
	endTime?: number;
	citations: MultimodalCitation[];
	metadata?: ChunkMetadata;
	preview?: MultimodalPreview;
}

export interface MultimodalCitation {
	documentId: string;
	documentName: string;
	filename: string;
	modality: string;
	page?: number;
	timestamp?: number;
	text: string;
	imageData?: string;
	thumbnail?: string;
	score: number;
	startChar?: number;
	endChar?: number;
}

export interface MultimodalPreview {
	type: 'text' | 'image' | 'audio_waveform' | 'video_frame';
	content: string;
	thumbnail?: string;
	duration?: number;
	timestamp?: number;
}

export interface MultimodalStats {
	documents: {
		total: number;
		byModality: Record<string, number>;
		totalSize: number;
		totalDuration: number;
	};
	chunks: {
		total: number;
		withEmbeddings: number;
		byModality: Record<string, number>;
	};
	processing: {
		completed: number;
		failed: number;
		pending: number;
		averageProcessingTime: number;
	};
	brand: 'brAInwav';
}

// Database update types
export interface UpdateMultimodalDocument {
	filename?: string;
	totalChunks?: number;
	processed?: boolean;
	processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
	processingError?: string;
	metadata?: string;
	updatedAt?: Date;
}

export interface UpdateMultimodalChunk {
	content?: string;
	startPage?: number;
	endPage?: number;
	startTime?: number;
	endTime?: number;
	tokenCount?: number;
	embedding?: string;
	metadata?: string;
	updatedAt?: Date;
}

// Error response types
export interface MultimodalErrorResponse {
	error: string;
	message?: string;
	details?: unknown;
	modality?: string;
	brand: 'brAInwav';
	timestamp: string;
}

// Validation schemas
export interface MultimodalUploadSchema {
	file: File;
	options?: MultimodalProcessingOptions;
}

export interface MultimodalSearchSchema {
	query: string;
	modalities?: ('text' | 'image' | 'audio' | 'video' | 'pdf_with_images')[];
	limit?: number;
	minScore?: number;
	documentIds?: string[];
	filters?: MultimodalSearchFilters;
}

// Processing status types
export interface MultimodalProcessingStatus {
	documentId: string;
	filename: string;
	modality: string;
	status: 'pending' | 'processing' | 'completed' | 'failed';
	progress: number;
	currentStep: string;
	totalSteps: number;
	processingTime: number;
	estimatedTimeRemaining?: number;
	error?: string;
	brand: 'brAInwav';
}
