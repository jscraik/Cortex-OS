/**
 * @file packages/workflow-common/src/evidence.ts
 * @description Shared evidence types and utilities for PRP Runner and Task Management
 * @maintainer @jamiescottcraik
 * @version 1.0.0
 */

import type { Evidence } from '@cortex-os/kernel';

/**
 * Evidence index entry linking PRP gates to task management artifacts
 */
export interface EvidenceIndexEntry {
	/** Unique identifier */
	id: string;
	/** Task ID (e.g., 'feature-name') */
	taskId: string;
	/** PRP gate ID (e.g., 'G2') */
	gateId?: string;
	/** Task management phase (e.g., 'planning') */
	taskPhase?: string;
	/** Evidence artifact reference */
	evidenceId: string;
	/** Type of evidence */
	evidenceType: 'validation' | 'test-result' | 'review' | 'benchmark' | 'analysis';
	/** Artifact file path */
	artifactPath: string;
	/** Timestamp */
	timestamp: string;
	/** brAInwav branding */
	branding: 'brAInwav';
}

/**
 * Evidence index for tracking workflow artifacts
 */
export interface EvidenceIndex {
	/** Index version */
	version: string;
	/** Last updated timestamp */
	lastUpdated: string;
	/** All evidence entries */
	entries: EvidenceIndexEntry[];
}

/**
 * Create a new evidence index entry
 */
export function createEvidenceIndexEntry(
	taskId: string,
	evidenceId: string,
	evidenceType: EvidenceIndexEntry['evidenceType'],
	artifactPath: string,
	options?: {
		gateId?: string;
		taskPhase?: string;
	},
): EvidenceIndexEntry {
	return {
		id: `${taskId}-${evidenceId}`,
		taskId,
		gateId: options?.gateId,
		taskPhase: options?.taskPhase,
		evidenceId,
		evidenceType,
		artifactPath,
		timestamp: new Date().toISOString(),
		branding: 'brAInwav',
	};
}

/**
 * Add evidence entry to index
 */
export function addEvidenceToIndex(index: EvidenceIndex, entry: EvidenceIndexEntry): EvidenceIndex {
	return {
		...index,
		lastUpdated: new Date().toISOString(),
		entries: [...index.entries, entry],
	};
}

/**
 * Find evidence by task ID
 */
export function findEvidenceByTask(index: EvidenceIndex, taskId: string): EvidenceIndexEntry[] {
	return index.entries.filter((entry) => entry.taskId === taskId);
}

/**
 * Find evidence by gate ID
 */
export function findEvidenceByGate(index: EvidenceIndex, gateId: string): EvidenceIndexEntry[] {
	return index.entries.filter((entry) => entry.gateId === gateId);
}

/**
 * Find evidence by task phase
 */
export function findEvidenceByPhase(index: EvidenceIndex, taskPhase: string): EvidenceIndexEntry[] {
	return index.entries.filter((entry) => entry.taskPhase === taskPhase);
}

/**
 * Create empty evidence index
 */
export function createEvidenceIndex(): EvidenceIndex {
	return {
		version: '1.0.0',
		lastUpdated: new Date().toISOString(),
		entries: [],
	};
}

/**
 * Link PRP gate evidence to task management artifact
 *
 * Maps Evidence types from @cortex-os/kernel to EvidenceIndexEntry types.
 * Note: kernel Evidence has a different set of types than our index.
 */
export function linkGateToTask(
	gateEvidence: Evidence,
	taskId: string,
	taskPhase: string,
	artifactPath: string,
): EvidenceIndexEntry {
	// Map kernel Evidence.type to EvidenceIndexEntry.evidenceType
	let evidenceType: EvidenceIndexEntry['evidenceType'];

	switch (gateEvidence.type) {
		case 'validation':
			evidenceType = 'validation';
			break;
		case 'test':
		case 'coverage':
		case 'a11y':
		case 'security':
			evidenceType = 'test-result';
			break;
		default:
			evidenceType = 'analysis';
			break;
	}

	return createEvidenceIndexEntry(taskId, gateEvidence.id, evidenceType, artifactPath, {
		gateId: extractGateId(gateEvidence.source),
		taskPhase,
	});
}

/**
 * Extract gate ID from evidence source string
 */
function extractGateId(source: string): string | undefined {
	const match = source.match(/^g([0-7])-/i);
	return match ? `G${match[1]}` : undefined;
}
