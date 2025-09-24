/**
 * @fileoverview TDD tests for CloudEvents evidence schema validation
 * Tests evidence and citation tracking with CloudEvents compatibility
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Import the implementation (will fail initially)
import type {
	Citation,
	CitationType,
	EvidenceAttachment,
	EvidenceEvent,
	EvidenceLevel,
} from './evidence-schema-impl.js';

describe('Evidence Schema Validation TDD', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('Evidence Event Schema', () => {
		it('should validate minimal evidence event', async () => {
			const { validateEvidenceEvent } = await import('./evidence-schema-impl');

			const event: EvidenceEvent = {
				specversion: '1.0',
				type: 'evidence.created',
				source: 'urn:cortex:rag',
				id: 'evt-12345',
				time: '2025-01-15T12:00:00Z',
				data: {
					evidenceId: 'ev-001',
					claim: 'TypeScript is a typed superset of JavaScript',
					level: 'high',
					citations: [
						{
							id: 'cite-001',
							type: 'documentation',
							source: 'https://typescriptlang.org',
							title: 'TypeScript Documentation',
							snippet: 'TypeScript is a strongly typed programming language...',
						},
					],
					metadata: {
						confidence: 0.95,
						relevance: 0.9,
						createdAt: '2025-01-15T12:00:00Z',
						tags: ['typescript', 'documentation'],
					},
				},
			};

			const result = validateEvidenceEvent(event);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should validate complex evidence event with attachments', async () => {
			const { validateEvidenceEvent } = await import('./evidence-schema-impl');

			const event: EvidenceEvent = {
				specversion: '1.0',
				type: 'evidence.enriched',
				source: 'urn:cortex:rag',
				id: 'evt-67890',
				time: '2025-01-15T12:00:00Z',
				traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01',
				data: {
					evidenceId: 'ev-002',
					claim: 'React hooks were introduced in version 16.8',
					level: 'medium',
					citations: [
						{
							id: 'cite-002',
							type: 'changelog',
							source: 'https://github.com/facebook/react/releases/tag/v16.8.0',
							title: 'React v16.8.0 Release',
							snippet: 'Hooks are a new addition in React 16.8...',
							dateAccessed: '2025-01-15T11:30:00Z',
						},
					],
					attachments: [
						{
							id: 'att-001',
							type: 'code_snippet',
							name: 'useState-example.tsx',
							mimeType: 'text/typescript',
							size: 256,
							checksum: 'sha256:abc123def456',
						},
					],
					metadata: {
						confidence: 0.8,
						relevance: 0.85,
						createdAt: '2025-01-15T12:00:00Z',
						updatedAt: '2025-01-15T12:00:00Z',
						tags: ['react', 'hooks', 'changelog'],
						sourceSystem: 'github-api',
					},
				},
			};

			const result = validateEvidenceEvent(event);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject evidence event with invalid CloudEvents structure', async () => {
			const { validateEvidenceEvent } = await import('./evidence-schema-impl');

			const invalidEvent = {
				// Missing required CloudEvents fields
				data: {
					evidenceId: 'ev-003',
					claim: 'Some claim',
					level: 'low',
					citations: [],
					metadata: {
						confidence: 0.5,
						relevance: 0.6,
						createdAt: '2025-01-15T12:00:00Z',
					},
				},
			} as any;

			const result = validateEvidenceEvent(invalidEvent);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Missing required CloudEvents field: specversion');
			expect(result.errors).toContain('Missing required CloudEvents field: type');
			expect(result.errors).toContain('Missing required CloudEvents field: source');
		});

		it('should reject evidence with invalid confidence score', async () => {
			const { validateEvidenceEvent } = await import('./evidence-schema-impl');

			const event: EvidenceEvent = {
				specversion: '1.0',
				type: 'evidence.created',
				source: 'urn:cortex:rag',
				id: 'evt-invalid',
				time: '2025-01-15T12:00:00Z',
				data: {
					evidenceId: 'ev-004',
					claim: 'Invalid confidence test',
					level: 'high',
					citations: [],
					metadata: {
						confidence: 1.5, // Invalid: > 1.0
						relevance: 0.7,
						createdAt: '2025-01-15T12:00:00Z',
					},
				},
			};

			const result = validateEvidenceEvent(event);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Number must be less than or equal to 1');
		});
	});

	describe('Citation Validation', () => {
		it('should validate documentation citation', async () => {
			const { validateCitation } = await import('./evidence-schema-impl');

			const citation: Citation = {
				id: 'cite-doc-001',
				type: 'documentation',
				source: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
				title: 'JavaScript Reference',
				snippet: 'JavaScript is a programming language...',
			};

			const result = validateCitation(citation);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should validate academic citation with additional fields', async () => {
			const { validateCitation } = await import('./evidence-schema-impl');

			const citation: Citation = {
				id: 'cite-paper-001',
				type: 'academic',
				source: 'https://doi.org/10.1000/182',
				title: 'Large Language Models in Software Development',
				snippet: 'This paper presents a comprehensive study...',
				authors: ['John Doe', 'Jane Smith'],
				datePublished: '2024-12-01T00:00:00Z',
				dateAccessed: '2025-01-15T10:00:00Z',
			};

			const result = validateCitation(citation);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject citation with invalid URL', async () => {
			const { validateCitation } = await import('./evidence-schema-impl');

			const citation: Citation = {
				id: 'cite-bad-url',
				type: 'documentation',
				source: 'not-a-valid-url',
				title: 'Bad Source',
				snippet: 'Test snippet',
			};

			const result = validateCitation(citation);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Source must be a valid URL');
		});

		it('should require snippet for documentation citations', async () => {
			const { validateCitation } = await import('./evidence-schema-impl');

			const citation: Citation = {
				id: 'cite-no-snippet',
				type: 'documentation',
				source: 'https://example.com',
				title: 'Example Doc',
				snippet: '', // Empty snippet
			};

			const result = validateCitation(citation);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Snippet is required for documentation citations');
		});
	});

	describe('Evidence Level Classification', () => {
		it('should validate evidence levels', async () => {
			const { validateEvidenceLevel } = await import('./evidence-schema-impl');

			expect(validateEvidenceLevel('high')).toBe(true);
			expect(validateEvidenceLevel('medium')).toBe(true);
			expect(validateEvidenceLevel('low')).toBe(true);
			expect(validateEvidenceLevel('speculation')).toBe(true);
		});

		it('should reject invalid evidence levels', async () => {
			const { validateEvidenceLevel } = await import('./evidence-schema-impl');

			expect(validateEvidenceLevel('critical')).toBe(false);
			expect(validateEvidenceLevel('unknown')).toBe(false);
			expect(validateEvidenceLevel('')).toBe(false);
		});
	});

	describe('Evidence Attachment Validation', () => {
		it('should validate code snippet attachment', async () => {
			const { validateAttachment } = await import('./evidence-schema-impl');

			const attachment: EvidenceAttachment = {
				id: 'att-code-001',
				type: 'code_snippet',
				name: 'example.ts',
				mimeType: 'text/typescript',
				size: 1024,
				checksum: 'sha256:d2d2d2d2d2d2d2d2',
			};

			const result = validateAttachment(attachment);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should validate image attachment', async () => {
			const { validateAttachment } = await import('./evidence-schema-impl');

			const attachment: EvidenceAttachment = {
				id: 'att-img-001',
				type: 'image',
				name: 'screenshot.png',
				mimeType: 'image/png',
				size: 2048,
				checksum: 'sha256:e3e3e3e3e3e3e3e3',
				url: 'https://storage.example.com/screenshots/screenshot.png',
			};

			const result = validateAttachment(attachment);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject attachment with invalid checksum format', async () => {
			const { validateAttachment } = await import('./evidence-schema-impl');

			const attachment: EvidenceAttachment = {
				id: 'att-bad-checksum',
				type: 'document',
				name: 'doc.pdf',
				mimeType: 'application/pdf',
				size: 512,
				checksum: 'invalid-checksum-format',
			};

			const result = validateAttachment(attachment);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Checksum must be in format algorithm:hash');
		});
	});

	describe('Evidence Event Creation', () => {
		it('should create valid evidence event with auto-generated fields', async () => {
			const { createEvidenceEvent } = await import('./evidence-schema-impl');

			const eventData = {
				claim: 'Node.js uses V8 JavaScript engine',
				level: 'high' as EvidenceLevel,
				citations: [
					{
						id: 'cite-auto-001',
						type: 'documentation' as CitationType,
						source: 'https://nodejs.org/en/docs/',
						title: 'Node.js Documentation',
						snippet: "Node.js is built on Chrome's V8 JavaScript engine...",
					},
				],
			};

			const event = createEvidenceEvent(eventData, 'urn:cortex:test');

			expect(event.specversion).toBe('1.0');
			expect(event.type).toBe('evidence.created');
			expect(event.source).toBe('urn:cortex:test');
			expect(event.id).toMatch(/^evt-[a-f0-9-]+$/);
			expect(event.time).toBe('2025-01-15T12:00:00.000Z');
			expect(event.data.evidenceId).toMatch(/^ev-[a-f0-9-]+$/);
			expect(event.data.claim).toBe('Node.js uses V8 JavaScript engine');
			expect(event.data.metadata.createdAt).toBe('2025-01-15T12:00:00.000Z');
		});

		it('should preserve custom traceparent in created events', async () => {
			const { createEvidenceEvent } = await import('./evidence-schema-impl');

			const eventData = {
				claim: 'Test claim with trace',
				level: 'medium' as EvidenceLevel,
				citations: [],
			};

			const traceparent = '00-abcdef1234567890abcdef1234567890-1234567890abcdef-01';
			const event = createEvidenceEvent(eventData, 'urn:cortex:trace', traceparent);

			expect(event.traceparent).toBe(traceparent);
		});
	});

	describe('Citation Bundle Management', () => {
		it('should create citation bundle with deduplication', async () => {
			const { createCitationBundle } = await import('./evidence-schema-impl');

			const citations: Citation[] = [
				{
					id: 'cite-1',
					type: 'documentation',
					source: 'https://example.com/doc1',
					title: 'Doc 1',
					snippet: 'Snippet 1',
				},
				{
					id: 'cite-2',
					type: 'documentation',
					source: 'https://example.com/doc1', // Duplicate source
					title: 'Doc 1 Copy',
					snippet: 'Different snippet',
				},
				{
					id: 'cite-3',
					type: 'documentation',
					source: 'https://example.com/doc2',
					title: 'Doc 2',
					snippet: 'Snippet 2',
				},
			];

			const bundle = createCitationBundle(citations);

			expect(bundle.citations).toHaveLength(2); // Deduplicated
			expect(bundle.totalCount).toBe(3);
			expect(bundle.deduplicatedCount).toBe(2);
			expect(bundle.sources).toEqual(['https://example.com/doc1', 'https://example.com/doc2']);
		});

		it('should sort citations by relevance and confidence', async () => {
			const { createCitationBundle } = await import('./evidence-schema-impl');

			const citations: Citation[] = [
				{
					id: 'cite-low',
					type: 'documentation',
					source: 'https://example.com/low',
					title: 'Low Priority',
					snippet: 'Low snippet',
					confidence: 0.3,
				},
				{
					id: 'cite-high',
					type: 'documentation',
					source: 'https://example.com/high',
					title: 'High Priority',
					snippet: 'High snippet',
					confidence: 0.9,
				},
				{
					id: 'cite-med',
					type: 'documentation',
					source: 'https://example.com/med',
					title: 'Medium Priority',
					snippet: 'Medium snippet',
					confidence: 0.6,
				},
			];

			const bundle = createCitationBundle(citations);

			// Should be sorted by confidence (descending)
			expect(bundle.citations[0].id).toBe('cite-high');
			expect(bundle.citations[1].id).toBe('cite-med');
			expect(bundle.citations[2].id).toBe('cite-low');
		});
	});

	describe('Evidence Freshness Tracking', () => {
		it('should calculate evidence freshness correctly', async () => {
			const { calculateEvidenceFreshness } = await import('./evidence-schema-impl');

			// Evidence from 1 hour ago
			const oneHourAgo = new Date('2025-01-15T11:00:00Z');
			const freshness1h = calculateEvidenceFreshness(oneHourAgo);
			expect(freshness1h.score).toBeGreaterThan(0.9);
			expect(freshness1h.category).toBe('fresh');

			// Evidence from 1 day ago
			const oneDayAgo = new Date('2025-01-14T12:00:00Z');
			const freshness1d = calculateEvidenceFreshness(oneDayAgo);
			expect(freshness1d.score).toBeLessThan(0.9);
			expect(freshness1d.score).toBeGreaterThan(0.5);
			expect(freshness1d.category).toBe('recent');

			// Evidence from 1 week ago
			const oneWeekAgo = new Date('2025-01-08T12:00:00Z');
			const freshness1w = calculateEvidenceFreshness(oneWeekAgo);
			expect(freshness1w.score).toBeLessThan(0.5);
			expect(freshness1w.category).toBe('stale');
		});

		it('should handle evidence without timestamps', async () => {
			const { calculateEvidenceFreshness } = await import('./evidence-schema-impl');

			const freshness = calculateEvidenceFreshness(undefined);
			expect(freshness.score).toBe(0);
			expect(freshness.category).toBe('unknown');
			expect(freshness.reason).toContain('No timestamp provided');
		});
	});

	describe('Integration with CloudEvents', () => {
		it('should serialize evidence event to CloudEvents format', async () => {
			const { serializeEvidenceEvent } = await import('./evidence-schema-impl');

			const event: EvidenceEvent = {
				specversion: '1.0',
				type: 'evidence.created',
				source: 'urn:cortex:rag',
				id: 'evt-serialize',
				time: '2025-01-15T12:00:00Z',
				data: {
					evidenceId: 'ev-serialize',
					claim: 'Serialization test',
					level: 'medium',
					citations: [],
					metadata: {
						confidence: 0.8,
						relevance: 0.7,
						createdAt: '2025-01-15T12:00:00Z',
					},
				},
			};

			const serialized = serializeEvidenceEvent(event);
			expect(serialized.specversion).toBe('1.0');
			expect(serialized.type).toBe('evidence.created');
			expect(typeof serialized.data).toBe('string');

			const parsedData = JSON.parse(serialized.data);
			expect(parsedData.evidenceId).toBe('ev-serialize');
		});

		it('should deserialize CloudEvents format to evidence event', async () => {
			const { deserializeEvidenceEvent } = await import('./evidence-schema-impl');

			const cloudEvent = {
				specversion: '1.0',
				type: 'evidence.enriched',
				source: 'urn:cortex:rag',
				id: 'evt-deserialize',
				time: '2025-01-15T12:00:00Z',
				datacontenttype: 'application/json',
				data: JSON.stringify({
					evidenceId: 'ev-deserialize',
					claim: 'Deserialization test',
					level: 'high',
					citations: [],
					metadata: {
						confidence: 0.95,
						relevance: 0.9,
						createdAt: '2025-01-15T12:00:00Z',
					},
				}),
			};

			const evidenceEvent = deserializeEvidenceEvent(cloudEvent);
			expect(evidenceEvent.data.evidenceId).toBe('ev-deserialize');
			expect(evidenceEvent.data.claim).toBe('Deserialization test');
			expect(evidenceEvent.data.level).toBe('high');
		});
	});
});
