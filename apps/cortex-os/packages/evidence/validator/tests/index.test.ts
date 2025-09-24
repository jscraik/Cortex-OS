import { describe, expect, it } from 'vitest';
import { type Evidence, validateEvidence } from '../src/index.js';

describe('Evidence Validator', () => {
	it('should validate valid evidence', async () => {
		const validEvidence: Evidence = {
			type: 'security-scan',
			data: { results: [], status: 'completed' },
			metadata: {
				timestamp: new Date(),
				source: 'automated-test',
			},
		};

		const result = await validateEvidence(validEvidence);
		expect(result.valid).toBe(true);
		expect(result.errors).toBeUndefined();
	});

	it('should reject invalid evidence', async () => {
		// @ts-expect-error Testing invalid input
		const invalidEvidence = {
			// Missing type and data fields
			metadata: {
				timestamp: new Date(),
			},
		};

		const result = await validateEvidence(invalidEvidence as Evidence);
		expect(result.valid).toBe(false);
		expect(result.errors).toBeDefined();
		expect(result.errors?.length).toBeGreaterThan(0);
	});

	it('should reject evidence with missing metadata fields', async () => {
		const incompleteMetadata = {
			type: 'security-scan',
			data: {},
			metadata: {
				source: 'automated-test',
			},
		} as unknown as Evidence;

		const result = await validateEvidence(incompleteMetadata);
		expect(result.valid).toBe(false);
		expect(result.errors).toBeDefined();
	});

	it('should reject evidence with invalid metadata types', async () => {
		const invalidMetadataTypes = {
			type: 'security-scan',
			data: {},
			metadata: {
				timestamp: 'not-a-date',
				source: 'automated-test',
			},
		} as unknown as Evidence;

		const result = await validateEvidence(invalidMetadataTypes);
		expect(result.valid).toBe(false);
		expect(result.errors).toBeDefined();
	});
});
