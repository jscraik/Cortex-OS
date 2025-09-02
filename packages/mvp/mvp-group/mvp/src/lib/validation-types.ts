/**
 * @file lib/validation-types.ts
 * @description Type definitions and interfaces for validation system
 */

import type { PRPState } from "../state.js";

export interface ValidationResult {
	passed: boolean;
	details: {
		reason?: string;
		type?: string;
		[key: string]: unknown;
	};
}

export interface SecurityScanResult {
	blockers: number;
	majors: number;
	details: {
		tools: string[];
		vulnerabilities: SecurityVulnerability[];
		summary: SecuritySummary;
		error?: string;
	};
}

export interface SecurityVulnerability {
	tool: string;
	severity: "critical" | "high" | "medium" | "low" | "info";
	type: string;
	ruleId?: string;
	message: string;
	file: string;
	line: number;
	column?: number;
	code?: string;
	confidence?: string;
}

export interface SecuritySummary {
	total: number;
	critical: number;
	high: number;
	medium: number;
	low: number;
	info: number;
}

export interface LighthouseResult {
	performance: number;
	accessibility: number;
	bestPractices: number;
	seo: number;
	url?: string;
	timestamp?: string;
	simulated?: boolean;
	reason?: string;
}

export interface AxeViolation {
	impact: string;
	description: string;
	element?: string;
	file?: string;
	count?: number;
	occurrences?: number;
}

export interface FrontendValidationResult {
	lighthouse: number;
	axe: number;
	details: {
		lighthouse?: LighthouseResult;
		axe?: {
			violations: number;
			details: AxeViolation[];
			severity: string;
		};
		tools?: {
			lighthouse: "available" | "simulated";
			axe: "available" | "simulated";
		};
		isWebApp?: boolean;
		projectType?: string;
		error?: string;
		reason?: string;
	};
}

export interface GateValidator {
	validate(state: PRPState): Promise<ValidationResult>;
}

export interface CompilationResult {
	passed: boolean;
	command: string;
	stdout: string;
	stderr: string;
	duration: number;
}

export interface TestResult {
	passed: boolean;
	testsPassed: number;
	testsFailed: number;
	coverage: number;
}
