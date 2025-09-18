/**
 * @fileoverview Evidence schema validation implementation
 * CloudEvents-compatible evidence and citation tracking
 */

import { z } from 'zod';

// Type definitions
export type EvidenceLevel = 'high' | 'medium' | 'low' | 'speculation';
export type CitationType =
	| 'documentation'
	| 'academic'
	| 'changelog'
	| 'code'
	| 'news'
	| 'blog';
export type AttachmentType =
	| 'code_snippet'
	| 'image'
	| 'document'
	| 'video'
	| 'audio';

export interface Citation {
	id: string;
	type: CitationType;
	source: string;
	title: string;
	snippet: string;
	authors?: string[];
	datePublished?: string;
	dateAccessed?: string;
	confidence?: number;
}

export interface EvidenceAttachment {
	id: string;
	type: AttachmentType;
	name: string;
	mimeType: string;
	size: number;
	checksum: string;
	url?: string;
}

export interface EvidenceMetadata {
	confidence: number;
	relevance: number;
	createdAt: string;
	updatedAt?: string;
	tags?: string[];
	sourceSystem?: string;
}

export interface EvidenceEvent {
	specversion: string;
	type: string;
	source: string;
	id: string;
	time: string;
	traceparent?: string;
	data: {
		evidenceId: string;
		claim: string;
		level: EvidenceLevel;
		citations: Citation[];
		attachments?: EvidenceAttachment[];
		metadata: EvidenceMetadata;
	};
}

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

export interface CitationBundle {
	citations: Citation[];
	totalCount: number;
	deduplicatedCount: number;
	sources: string[];
}

export interface FreshnessResult {
	score: number;
	category: 'fresh' | 'recent' | 'stale' | 'unknown';
	reason?: string;
}

// Zod schemas
const evidenceLevelSchema = z.enum(['high', 'medium', 'low', 'speculation']);
const citationTypeSchema = z.enum([
	'documentation',
	'academic',
	'changelog',
	'code',
	'news',
	'blog',
]);
const attachmentTypeSchema = z.enum([
	'code_snippet',
	'image',
	'document',
	'video',
	'audio',
]);

const citationSchema = z.object({
	id: z.string(),
	type: citationTypeSchema,
	source: z.string().url('Source must be a valid URL'),
	title: z.string(),
	snippet: z.string(),
	authors: z.array(z.string()).optional(),
	datePublished: z.string().optional(),
	dateAccessed: z.string().optional(),
	confidence: z.number().min(0).max(1).optional(),
});

const attachmentSchema = z.object({
	id: z.string(),
	type: attachmentTypeSchema,
	name: z.string(),
	mimeType: z.string(),
	size: z.number().positive(),
	checksum: z
		.string()
		.regex(
			/^[a-z0-9]+:[a-f0-9]+$/,
			'Checksum must be in format algorithm:hash',
		),
	url: z.string().url().optional(),
});

const metadataSchema = z.object({
	confidence: z.number().min(0).max(1),
	relevance: z.number().min(0).max(1),
	createdAt: z.string(),
	updatedAt: z.string().optional(),
	tags: z.array(z.string()).optional(),
	sourceSystem: z.string().optional(),
});

const evidenceEventSchema = z.object({
	specversion: z.string(),
	type: z.string(),
	source: z.string(),
	id: z.string(),
	time: z.string(),
	traceparent: z.string().optional(),
	data: z.object({
		evidenceId: z.string(),
		claim: z.string(),
		level: evidenceLevelSchema,
		citations: z.array(citationSchema),
		attachments: z.array(attachmentSchema).optional(),
		metadata: metadataSchema,
	}),
});

// Validation functions
export function validateEvidenceEvent(event: unknown): ValidationResult {
	const errors: string[] = [];

	// Perform a narrow type check before property access
	const candidate =
		typeof event === 'object' && event !== null
			? (event as Partial<EvidenceEvent>)
			: {};

	if (!candidate.specversion)
		errors.push('Missing required CloudEvents field: specversion');
	if (!candidate.type) errors.push('Missing required CloudEvents field: type');
	if (!candidate.source)
		errors.push('Missing required CloudEvents field: source');
	if (!candidate.id) errors.push('Missing required CloudEvents field: id');
	if (!candidate.time) errors.push('Missing required CloudEvents field: time');

	if (errors.length > 0) {
		return { isValid: false, errors };
	}

	try {
		evidenceEventSchema.parse(candidate);
		return { isValid: true, errors };
	} catch (error) {
		if (error instanceof z.ZodError) {
			errors.push(...error.errors.map((e) => e.message));
		}
		return { isValid: false, errors };
	}
}

export function validateCitation(citation: Citation): ValidationResult {
	const errors: string[] = [];

	try {
		citationSchema.parse(citation);

		// Additional business rules
		if (
			citation.type === 'documentation' &&
			(!citation.snippet || citation.snippet.trim() === '')
		) {
			errors.push('Snippet is required for documentation citations');
		}

		return { isValid: errors.length === 0, errors };
	} catch (error) {
		if (error instanceof z.ZodError) {
			errors.push(...error.errors.map((e) => e.message));
		}
		return { isValid: false, errors };
	}
}

export function validateEvidenceLevel(level: string): boolean {
	return ['high', 'medium', 'low', 'speculation'].includes(level);
}

export function validateAttachment(
	attachment: EvidenceAttachment,
): ValidationResult {
	const errors: string[] = [];

	try {
		attachmentSchema.parse(attachment);
		return { isValid: true, errors };
	} catch (error) {
		if (error instanceof z.ZodError) {
			errors.push(...error.errors.map((e) => e.message));
		}
		return { isValid: false, errors };
	}
}

// Event creation functions
export function createEvidenceEvent(
	eventData: {
		claim: string;
		level: EvidenceLevel;
		citations: Citation[];
		attachments?: EvidenceAttachment[];
	},
	source: string,
	traceparent?: string,
): EvidenceEvent {
	const now = new Date().toISOString();
	const eventId = `evt-${generateId()}`;
	const evidenceId = `ev-${generateId()}`;

	return {
		specversion: '1.0',
		type: 'evidence.created',
		source,
		id: eventId,
		time: now,
		...(traceparent && { traceparent }),
		data: {
			evidenceId,
			claim: eventData.claim,
			level: eventData.level,
			citations: eventData.citations,
			...(eventData.attachments && { attachments: eventData.attachments }),
			metadata: {
				confidence: 0.8, // Default confidence
				relevance: 0.8, // Default relevance
				createdAt: now,
				tags: [],
			},
		},
	};
}

// Citation bundle management
export function createCitationBundle(citations: Citation[]): CitationBundle {
	const sourceMap = new Map<string, Citation>();

	// Deduplicate by source URL
	for (const citation of citations) {
		if (!sourceMap.has(citation.source)) {
			sourceMap.set(citation.source, citation);
		}
	}

	const deduplicatedCitations = Array.from(sourceMap.values());

	// Sort by confidence (descending)
	deduplicatedCitations.sort(
		(a, b) => (b.confidence ?? 0.5) - (a.confidence ?? 0.5),
	);

	return {
		citations: deduplicatedCitations,
		totalCount: citations.length,
		deduplicatedCount: deduplicatedCitations.length,
		sources: Array.from(sourceMap.keys()),
	};
}

// Freshness calculation
export function calculateEvidenceFreshness(
	timestamp: Date | undefined,
): FreshnessResult {
	if (!timestamp) {
		return {
			score: 0,
			category: 'unknown',
			reason: 'No timestamp provided',
		};
	}

	const now = new Date();
	const ageMs = now.getTime() - timestamp.getTime();
	const ageHours = ageMs / (1000 * 60 * 60);

	let score: number;
	let category: FreshnessResult['category'];

	if (ageHours < 24) {
		score = Math.max(0.9, 1 - (ageHours / 24) * 0.1);
		category = 'fresh';
	} else if (ageHours < 168) {
		// 1 week
		score = Math.max(0.5, 0.85 - ((ageHours - 24) / 144) * 0.35);
		category = 'recent';
	} else {
		score = Math.max(0.1, 0.45 - ((ageHours - 168) / 672) * 0.35);
		category = 'stale';
	}

	return { score, category };
}

// CloudEvents serialization
export interface CloudEventSerialized {
	specversion: string;
	type: string;
	source: string;
	id: string;
	time: string;
	traceparent?: string;
	datacontenttype: string;
	data: string;
}

export function serializeEvidenceEvent(
	event: EvidenceEvent,
): CloudEventSerialized {
	return {
		specversion: event.specversion,
		type: event.type,
		source: event.source,
		id: event.id,
		time: event.time,
		...(event.traceparent && { traceparent: event.traceparent }),
		datacontenttype: 'application/json',
		data: JSON.stringify(event.data),
	};
}

export function deserializeEvidenceEvent(
	cloudEvent: CloudEventSerialized | Record<string, unknown>,
): EvidenceEvent {
	const ce = cloudEvent as Partial<CloudEventSerialized & { data: unknown }>;
	const rawData = ce.data;
	let parsedData: EvidenceEvent['data'];
	if (typeof rawData === 'string') {
		try {
			parsedData = JSON.parse(rawData) as unknown as EvidenceEvent['data'];
		} catch {
			parsedData = {
				evidenceId: 'unknown',
				claim: '',
				level: 'low',
				citations: [],
				metadata: {
					confidence: 0,
					relevance: 0,
					createdAt: new Date().toISOString(),
				},
			};
		}
	} else if (rawData && typeof rawData === 'object') {
		parsedData = rawData as EvidenceEvent['data'];
	} else {
		parsedData = {
			evidenceId: 'unknown',
			claim: '',
			level: 'low',
			citations: [],
			metadata: {
				confidence: 0,
				relevance: 0,
				createdAt: new Date().toISOString(),
			},
		};
	}

	return {
		specversion: String(ce.specversion || ''),
		type: String(ce.type || ''),
		source: String(ce.source || ''),
		id: String(ce.id || ''),
		time: String(ce.time || new Date().toISOString()),
		...(ce.traceparent ? { traceparent: ce.traceparent } : {}),
		data: parsedData,
	};
}

// Helper function to generate IDs
function generateId(): string {
	// Generate hex-like IDs for tests
	const chars = '0123456789abcdef';
	let result = '';
	for (let i = 0; i < 18; i++) {
		// eslint-disable-next-line sonarjs/pseudo-random
		result += chars[Math.floor(Math.random() * chars.length)];
	}
	return result;
}
