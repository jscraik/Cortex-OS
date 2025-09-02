/**
 * Evidence Collector
 * Manages evidence pointer collection and validation per blueprint specification
 */

import { readFile } from "node:fs/promises";
import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import type {
	Evidence,
	EvidencePointer,
	EvidenceRisk,
} from "../types/index.js";
import { EvidenceSchema, ValidationError } from "../types/index.js";
import { pathExists } from "../xdg/index.js";

export interface EvidenceCollectionOptions {
	includeContent?: boolean;
	maxContentLength?: number;
	allowedSources?: string[];
	confidenceThreshold?: number;
}

export interface EvidenceContext {
	taskId: string;
	step?: string;
	claim: string;
	sources: Array<{
		type: "file" | "url" | "repo" | "note";
		path?: string;
		url?: string;
		content?: string;
		range?: { start: number; end: number };
	}>;
}

/**
 * Evidence collector for tracking decision provenance
 */
export class EvidenceCollector {
	private evidenceMap = new Map<string, Evidence>();

	/**
	 * Collect evidence from various sources
	 */
	async collectEvidence(
		context: EvidenceContext,
		options: EvidenceCollectionOptions = {},
	): Promise<Evidence> {
		const pointers: EvidencePointer[] = [];

		// Process each source
		for (const source of context.sources) {
			const pointer = await this.createEvidencePointer(source, options);
			pointers.push(pointer);
		}

		// Calculate confidence based on sources
		const confidence = this.calculateConfidence(pointers, context.claim);

		// Assess risk level
		const risk = this.assessRisk(pointers, confidence, context.claim);

		const evidence: Evidence = {
			id: uuidv4(),
			source: this.determinePrimarySource(context.sources),
			pointers,
			claim: context.claim,
			confidence,
			risk,
			createdAt: new Date().toISOString(),
			schema: "cortex.evidence@1",
		};

		// Validate evidence against schema
		const validation = EvidenceSchema.safeParse(evidence);
		if (!validation.success) {
			throw new ValidationError("Invalid evidence structure", {
				errors: validation.error.errors,
			});
		}

		// Store evidence
		this.evidenceMap.set(evidence.id, evidence);

		return evidence;
	}

	/**
	 * Link evidence to existing claims
	 */
	async linkEvidence(
		evidenceId: string,
		relatedEvidenceIds: string[],
	): Promise<void> {
		const evidence = this.evidenceMap.get(evidenceId);
		if (!evidence) {
			throw new ValidationError(`Evidence ${evidenceId} not found`);
		}

		// Validate related evidence exists
		for (const relatedId of relatedEvidenceIds) {
			if (!this.evidenceMap.has(relatedId)) {
				throw new ValidationError(`Related evidence ${relatedId} not found`);
			}
		}

		// In a full implementation, this would create evidence relationships
		// For now, we store the linking information as metadata
	}

	/**
	 * Validate evidence integrity
	 */
	async validateEvidence(evidenceId: string): Promise<{
		isValid: boolean;
		errors: string[];
		warnings: string[];
	}> {
		const evidence = this.evidenceMap.get(evidenceId);
		if (!evidence) {
			return {
				isValid: false,
				errors: ["Evidence not found"],
				warnings: [],
			};
		}

		const errors: string[] = [];
		const warnings: string[] = [];

		// Validate pointers
		for (const pointer of evidence.pointers) {
			const pointerValidation = await this.validatePointer(pointer);
			if (!pointerValidation.isValid) {
				errors.push(`Invalid pointer: ${pointerValidation.error}`);
			}
			if (pointerValidation.warnings.length > 0) {
				warnings.push(...pointerValidation.warnings);
			}
		}

		// Validate confidence score
		if (evidence.confidence < 0 || evidence.confidence > 1) {
			errors.push("Confidence score must be between 0 and 1");
		}

		// Check for missing claims
		if (!evidence.claim || evidence.claim.trim() === "") {
			errors.push("Evidence must have a non-empty claim");
		}

		// Validate risk assessment
		if (!["low", "medium", "high", "unknown"].includes(evidence.risk)) {
			errors.push("Invalid risk level");
		}

		// Warning for low confidence
		if (evidence.confidence < 0.3) {
			warnings.push("Low confidence evidence may need additional validation");
		}

		// Warning for high risk with high confidence
		if (evidence.risk === "high" && evidence.confidence > 0.8) {
			warnings.push("High-risk evidence with high confidence requires review");
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Get evidence by ID
	 */
	getEvidence(evidenceId: string): Evidence | undefined {
		return this.evidenceMap.get(evidenceId);
	}

	/**
	 * Search evidence by claim or content
	 */
	searchEvidence(query: {
		claim?: string;
		source?: string;
		riskLevel?: EvidenceRisk;
		minConfidence?: number;
		maxConfidence?: number;
	}): Evidence[] {
		let results = Array.from(this.evidenceMap.values());

		if (query.claim) {
			const searchTerm = query.claim.toLowerCase();
			results = results.filter((e) =>
				e.claim.toLowerCase().includes(searchTerm),
			);
		}

		if (query.source) {
			results = results.filter((e) => e.source === query.source);
		}

		if (query.riskLevel) {
			results = results.filter((e) => e.risk === query.riskLevel);
		}

		if (query.minConfidence !== undefined) {
			results = results.filter((e) => e.confidence >= query.minConfidence!);
		}

		if (query.maxConfidence !== undefined) {
			results = results.filter((e) => e.confidence <= query.maxConfidence!);
		}

		return results.sort((a, b) => b.confidence - a.confidence);
	}

	/**
	 * Generate evidence summary for a task
	 */
	generateEvidenceSummary(evidenceIds: string[]): {
		totalEvidence: number;
		averageConfidence: number;
		riskDistribution: Record<EvidenceRisk, number>;
		sourceDistribution: Record<string, number>;
		missingEvidence: string[];
	} {
		const evidence = evidenceIds
			.map((id) => this.evidenceMap.get(id))
			.filter(Boolean) as Evidence[];

		const missing = evidenceIds.filter((id) => !this.evidenceMap.has(id));

		const riskDistribution: Record<EvidenceRisk, number> = {
			low: 0,
			medium: 0,
			high: 0,
			unknown: 0,
		};

		const sourceDistribution: Record<string, number> = {};

		let totalConfidence = 0;

		for (const e of evidence) {
			riskDistribution[e.risk]++;
			sourceDistribution[e.source] = (sourceDistribution[e.source] || 0) + 1;
			totalConfidence += e.confidence;
		}

		return {
			totalEvidence: evidence.length,
			averageConfidence:
				evidence.length > 0 ? totalConfidence / evidence.length : 0,
			riskDistribution,
			sourceDistribution,
			missingEvidence: missing,
		};
	}

	private async createEvidencePointer(
		source: EvidenceContext["sources"][0],
		_options: EvidenceCollectionOptions,
	): Promise<EvidencePointer> {
		let hash: string;
		let path: string;

		switch (source.type) {
			case "file": {
				if (!source.path) {
					throw new ValidationError("File source requires path");
				}

				if (!(await pathExists(source.path))) {
					throw new ValidationError(`File not found: ${source.path}`);
				}

				const content = await readFile(source.path, "utf-8");
				hash = createHash("sha256").update(content).digest("hex");
				path = source.path;
				break;
			}

			case "url":
				if (!source.url) {
					throw new ValidationError("URL source requires url");
				}

				// For URLs, hash the URL itself as a placeholder
				// In a real implementation, this would fetch and hash the content
				hash = createHash("sha256").update(source.url).digest("hex");
				path = source.url;
				break;

			case "repo": {
				if (!source.path) {
					throw new ValidationError("Repo source requires path");
				}

				// For repo sources, create a hash based on path and current state
				const repoContent = source.content || `repo:${source.path}`;
				hash = createHash("sha256").update(repoContent).digest("hex");
				path = source.path;
				break;
			}

			case "note":
				if (!source.content) {
					throw new ValidationError("Note source requires content");
				}

				hash = createHash("sha256").update(source.content).digest("hex");
				path = `note:${hash.substring(0, 8)}`;
				break;

			default:
				throw new ValidationError(`Unknown source type: ${source.type}`);
		}

		const pointer: EvidencePointer = {
			path,
			hash,
		};

		if (source.range) {
			pointer.start = source.range.start;
			pointer.end = source.range.end;
		}

		if (source.url) {
			pointer.url = source.url;
		}

		return pointer;
	}

	private calculateConfidence(
		pointers: EvidencePointer[],
		claim: string,
	): number {
		// Simplified confidence calculation
		// In a real implementation, this would use ML/statistical models

		let baseConfidence = 0.5; // Start with neutral confidence

		// More pointers generally increase confidence
		const pointerBonus = Math.min(pointers.length * 0.1, 0.3);
		baseConfidence += pointerBonus;

		// Penalty for very short claims (likely low quality)
		if (claim.length < 10) {
			baseConfidence -= 0.2;
		}

		// Bonus for specific, detailed claims
		if (claim.length > 100 && claim.includes("because")) {
			baseConfidence += 0.1;
		}

		// Ensure confidence is within bounds
		return Math.max(0, Math.min(1, baseConfidence));
	}

	private assessRisk(
		pointers: EvidencePointer[],
		confidence: number,
		claim: string,
	): EvidenceRisk {
		// Risk assessment based on confidence and claim content

		if (confidence < 0.3) {
			return "high"; // Low confidence is risky
		}

		if (confidence > 0.8 && pointers.length >= 2) {
			return "low"; // High confidence with multiple sources
		}

		// Check for risk indicators in claim
		const riskKeywords = [
			"security",
			"password",
			"private",
			"confidential",
			"delete",
			"remove",
			"destroy",
			"permanent",
			"financial",
			"payment",
			"billing",
			"cost",
		];

		const hasRiskKeywords = riskKeywords.some((keyword) =>
			claim.toLowerCase().includes(keyword),
		);

		if (hasRiskKeywords) {
			return confidence > 0.6 ? "medium" : "high";
		}

		// Default to medium risk
		return "medium";
	}

	private determinePrimarySource(
		sources: EvidenceContext["sources"],
	): "file" | "url" | "repo" | "note" {
		// Return the first source type as primary
		return sources[0]?.type || "note";
	}

	private async validatePointer(pointer: EvidencePointer): Promise<{
		isValid: boolean;
		error?: string;
		warnings: string[];
	}> {
		const warnings: string[] = [];

		// Validate hash format
		if (!/^[a-f0-9]{64}$/.test(pointer.hash)) {
			return {
				isValid: false,
				error: "Invalid SHA-256 hash format",
				warnings,
			};
		}

		// Validate path
		if (!pointer.path || pointer.path.trim() === "") {
			return {
				isValid: false,
				error: "Missing or empty path",
				warnings,
			};
		}

		// Validate range if present
		if (pointer.start !== undefined && pointer.end !== undefined) {
			if (pointer.start < 0 || pointer.end < 0) {
				return {
					isValid: false,
					error: "Range values cannot be negative",
					warnings,
				};
			}

			if (pointer.start > pointer.end) {
				return {
					isValid: false,
					error: "Range start cannot be greater than end",
					warnings,
				};
			}
		}

		// Check if file exists (for file pointers)
		if (!pointer.path.startsWith("http") && !pointer.path.startsWith("note:")) {
			if (!(await pathExists(pointer.path))) {
				warnings.push("Referenced file does not exist");
			}
		}

		return {
			isValid: true,
			warnings,
		};
	}
}
