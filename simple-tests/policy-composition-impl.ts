/**
 * @fileoverview Policy composition validation implementation
 * Validates combining multiple security policies without conflicts
 */

import { z } from 'zod';

// Type definitions
export type PolicyType =
	| 'structure-guard'
	| 'egress'
	| 'mcp-tools'
	| 'resource-limits'
	| 'access-control'
	| 'audit'
	| 'secret-access'
	| 'global'
	| 'agent'
	| 'session';

export type ConflictType =
	| 'mode-conflict'
	| 'permission-overlap'
	| 'resource-conflict'
	| 'scope-overlap'
	| 'mutual-exclusion';

export type MergeStrategy =
	| 'union'
	| 'intersection'
	| 'most-restrictive'
	| 'least-restrictive';

export interface Policy {
	type: PolicyType;
	name: string;
	config: Record<string, unknown>;
	dependencies?: string[];
	priority?: number;
}

export interface PolicyComposition {
	id: string;
	name: string;
	policies: Policy[];
	metadata: {
		version: string;
		createdAt: string;
		updatedAt?: string;
		author?: string;
		tags?: string[];
		description?: string;
	};
}

export type ConflictSeverity = 'low' | 'medium' | 'high';

export interface PolicyConflict {
	id: string;
	type: ConflictType;
	description: string;
	affectedPolicies: string[];
	severity: ConflictSeverity;
	suggestedResolution?: string;
}

export interface CompositionResult {
	isValid: boolean;
	conflicts: PolicyConflict[];
	errors: string[];
	warnings?: string[];
}

export interface PolicyHierarchy {
	levels: Array<{
		type: PolicyType;
		priority: number;
		policies?: string[];
	}>;
	effectiveRules: Map<string, unknown>;
}

export interface ConflictResolution {
	conflictId: string;
	method: string;
	result: string;
}

export interface ConflictResolutionResult {
	resolvedConflicts: PolicyConflict[];
	remainingConflicts: PolicyConflict[];
	resolutions: ConflictResolution[];
}

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

export interface DependencyValidationResult extends ValidationResult {
	dependencyOrder?: string[];
}

export interface TestScenario {
	name: string;
	action: string;
	target: string;
	expectedResult: string;
}

export interface TestResults {
	totalTests: number;
	passed: number;
	failed: number;
	scenarios: Array<{
		name: string;
		passed: boolean;
		actual?: string;
		expected: string;
	}>;
}

export interface CompositionReport {
	compositionId: string;
	policyCount: number;
	riskLevel: 'low' | 'medium' | 'high';
	recommendations: string[];
	generatedAt: string;
	conflictCount: number;
	coverageAreas: string[];
}

export interface SecurityStandardsValidation {
	compliant: boolean;
	coveragePercentage: number;
	missingRequirements: string[];
	standardsChecked: string[];
}

// Zod schemas
const policySchema = z.object({
	type: z.string(),
	name: z.string(),
	config: z.record(z.unknown()),
	dependencies: z.array(z.string()).optional(),
	priority: z.number().optional(),
});

const compositionMetadataSchema = z.object({
	// Accept semantic version with 2 or 3 segments (e.g., 1.0 or 1.2.3)
	version: z.string().regex(/^\d+\.\d+(?:\.\d+)?$/, 'Invalid version format'),
	createdAt: z.string().datetime('Invalid date format'),
	updatedAt: z.string().datetime().optional(),
	author: z.string().optional(),
	tags: z.array(z.string()).optional(),
	description: z.string().optional(),
});

const policyCompositionSchema = z.object({
	id: z.string(),
	name: z.string(),
	policies: z.array(policySchema),
	metadata: compositionMetadataSchema,
});

// Core validation functions
export function validatePolicyComposition(
	composition: PolicyComposition,
): CompositionResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Basic validation
	try {
		policyCompositionSchema.parse(composition);
	} catch (error) {
		if (error instanceof z.ZodError) {
			errors.push(...error.errors.map((e) => e.message));
		}
	}

	// Check for empty composition
	if (composition.policies.length === 0) {
		warnings.push('Composition contains no policies');
	}

	// Detect conflicts
	const conflicts = detectPolicyConflicts(composition.policies);

	return {
		isValid: errors.length === 0 && conflicts.length === 0,
		conflicts,
		errors,
		warnings,
	};
}

export function detectPolicyConflicts(policies: Policy[]): PolicyConflict[] {
	const conflicts: PolicyConflict[] = [];

	// Group policies by type
	const policyGroups = new Map<string, Policy[]>();
	for (const policy of policies) {
		const group = policyGroups.get(policy.type) || [];
		group.push(policy);
		policyGroups.set(policy.type, group);
	}

	// Check for type-specific conflicts
	for (const [type, policiesOfType] of policyGroups) {
		if (policiesOfType.length > 1) {
			const typeConflicts = checkTypeSpecificConflicts(type, policiesOfType);
			conflicts.push(...typeConflicts);
		}
	}

	// Check cross-type conflicts
	const crossTypeConflicts = checkCrossTypeConflicts(policies);
	conflicts.push(...crossTypeConflicts);

	return conflicts;
}

// --- Type-specific conflict helpers (split to reduce complexity) ---
function checkMcpToolsConflicts(policies: Policy[]): PolicyConflict[] {
	const modes = policies
		.map((p) => {
			const cfg = p.config as Record<string, unknown> | undefined;
			const mode = cfg && typeof cfg.mode === 'string' ? cfg.mode : undefined;
			return mode;
		})
		.filter((m): m is string => typeof m === 'string');
	const unique = [...new Set(modes)];
	if (
		unique.length > 1 &&
		unique.includes('allowlist') &&
		unique.includes('denylist')
	) {
		return [
			{
				id: `conflict-${Date.now()}`,
				type: 'mode-conflict',
				description:
					'Cannot combine allowlist and denylist modes for MCP tools',
				affectedPolicies: policies.map((p) => p.name),
				severity: 'high',
				suggestedResolution:
					'Choose either allowlist or denylist mode consistently',
			},
		];
	}
	return [];
}

function checkResourceLimitConflicts(policies: Policy[]): PolicyConflict[] {
	const memoryLimits = policies
		.map((p) => {
			const cfg = p.config as Record<string, unknown> | undefined;
			const limitVal =
				cfg && typeof cfg.maxMemory === 'string' ? cfg.maxMemory : undefined;
			return { name: p.name, limit: limitVal };
		})
		.filter((l) => typeof l.limit === 'string');
	if (memoryLimits.length > 1) {
		const unique = [...new Set(memoryLimits.map((l) => l.limit))];
		if (unique.length > 1) {
			return [
				{
					id: `conflict-resource-${Date.now()}`,
					type: 'resource-conflict',
					description: 'Multiple conflicting memory limits defined',
					affectedPolicies: memoryLimits.map((l) => l.name),
					severity: 'medium',
					suggestedResolution: 'Use the most restrictive limit',
				},
			];
		}
	}
	return [];
}

interface AccessControlConfig {
	scope?: string;
	paths?: string[];
}
function extractAccessControl(
	cfg: Record<string, unknown>,
): AccessControlConfig {
	const scope = typeof cfg.scope === 'string' ? cfg.scope : undefined;
	const pathsRaw = cfg.paths;
	let paths: string[] | undefined;
	if (Array.isArray(pathsRaw)) {
		const filtered: string[] = [];
		for (const p of pathsRaw) if (typeof p === 'string') filtered.push(p);
		paths = filtered;
	}
	return { scope, paths };
}

function checkAccessControlConflicts(policies: Policy[]): PolicyConflict[] {
	const conflicts: PolicyConflict[] = [];
	for (let i = 0; i < policies.length; i++) {
		for (let j = i + 1; j < policies.length; j++) {
			const c1 = extractAccessControl(policies[i].config);
			const c2 = extractAccessControl(policies[j].config);
			if (
				c1.scope &&
				c2.scope &&
				c1.scope === c2.scope &&
				hasPathOverlap(c1.paths ?? [], c2.paths ?? [])
			) {
				conflicts.push({
					id: `conflict-scope-${Date.now()}`,
					type: 'scope-overlap',
					description: `Overlapping access control scopes between ${policies[i].name} and ${policies[j].name}`,
					affectedPolicies: [policies[i].name, policies[j].name],
					severity: 'medium',
					suggestedResolution: 'Merge overlapping policies or refine scopes',
				});
			}
		}
	}
	return conflicts;
}

function checkTypeSpecificConflicts(
	type: string,
	policies: Policy[],
): PolicyConflict[] {
	if (type === 'mcp-tools') return checkMcpToolsConflicts(policies);
	if (type === 'resource-limits') return checkResourceLimitConflicts(policies);
	if (type === 'access-control') return checkAccessControlConflicts(policies);
	return [];
}

function checkCrossTypeConflicts(_policies: Policy[]): PolicyConflict[] {
	return [];
}

function hasPathOverlap(paths1: string[] = [], paths2: string[] = []): boolean {
	const normalize = (p: string) => {
		const idx = p.indexOf('**');
		return idx >= 0 ? p.slice(0, idx) : p;
	};
	for (const raw1 of paths1) {
		const p1 = normalize(raw1);
		for (const raw2 of paths2) {
			const p2 = normalize(raw2);
			if (p1 === p2) return true;
			if (p1 && raw2.startsWith(p1)) return true; // broad covers narrow
			if (p2 && raw1.startsWith(p2)) return true; // narrow inside broad
		}
	}
	return false;
}

// Policy hierarchy management
export function createPolicyHierarchy(
	policies: Array<{ type: PolicyType; priority: number; name: string }>,
): PolicyHierarchy {
	const sortedPolicies = [...policies].sort((a, b) => b.priority - a.priority); // Highest priority first
	const levels = sortedPolicies.map((p) => ({
		type: p.type,
		priority: p.priority,
		policies: [p.name],
	}));

	return {
		levels,
		effectiveRules: new Map(),
	};
}

export function resolvePolicyConflicts(
	conflicts: PolicyConflict[],
	hierarchy: PolicyHierarchy,
): ConflictResolutionResult {
	const resolvedConflicts: PolicyConflict[] = [];
	const remainingConflicts: PolicyConflict[] = [];
	const resolutions: ConflictResolution[] = [];

	for (const conflict of conflicts) {
		if (conflict.type === 'permission-overlap' && hierarchy.levels.length > 0) {
			// Use hierarchy to resolve
			resolvedConflicts.push(conflict);
			resolutions.push({
				conflictId: conflict.id,
				method: 'hierarchy-priority',
				result: 'Resolved using policy hierarchy priority',
			});
		} else {
			remainingConflicts.push(conflict);
		}
	}

	return {
		resolvedConflicts,
		remainingConflicts,
		resolutions,
	};
}

// Policy merging and combination
export function mergePolicies(
	policies: Policy[],
	strategy: MergeStrategy,
): Policy {
	if (policies.length === 0) {
		throw new Error('Cannot merge empty policy list');
	}

	const basePolicy = policies[0];
	const mergedConfig: Record<string, unknown> = { ...basePolicy.config };

	for (let i = 1; i < policies.length; i++) {
		const policy = policies[i];
		mergeConfigs(mergedConfig, policy.config, strategy);
	}

	return {
		type: basePolicy.type,
		name: `Merged-${basePolicy.type}`,
		config: mergedConfig,
	};
}

function mergeConfigs(
	target: Record<string, unknown>,
	source: Record<string, unknown>,
	strategy: MergeStrategy,
): void {
	for (const [key, value] of Object.entries(source)) {
		const current = target[key];
		if (Array.isArray(value) && Array.isArray(current)) {
			target[key] = mergeArrays(current as unknown[], value, strategy);
			continue;
		}
		if (typeof value === 'string' && typeof current === 'string') {
			target[key] = mergeStrings(current, value, strategy, key);
			continue;
		}
		target[key] = value;
	}
}

function mergeArrays(
	target: unknown[],
	source: unknown[],
	strategy: MergeStrategy,
): unknown[] {
	if (strategy === 'union') {
		return [...new Set([...target, ...source])];
	}
	if (strategy === 'intersection' || strategy === 'most-restrictive') {
		return target.filter((item) => source.includes(item));
	}
	return source; // default: last wins
}

function mergeStrings(
	target: string,
	source: string,
	strategy: MergeStrategy,
	key: string,
): string {
	if (
		strategy === 'most-restrictive' &&
		(key.includes('Memory') || key.includes('Cpu'))
	) {
		const targetValue = parseResourceValue(target);
		const sourceValue = parseResourceValue(source);
		return targetValue < sourceValue ? target : source;
	}
	return source; // default: last wins
}

function parseResourceValue(value: string): number {
	// Simple parsing for resource values like "1GB", "512MB"
	const resourceRegex = /^(\d+(?:\.\d+)?)(GB|MB)$/;
	const match = resourceRegex.exec(value);
	if (!match) return 0;

	const num = parseFloat(match[1]);
	const unit = match[2];

	return unit === 'GB' ? num * 1024 : num;
}

// Validation functions
export function validateCompositionMetadata(
	metadata: unknown,
): ValidationResult {
	const errors: string[] = [];

	try {
		compositionMetadataSchema.parse(metadata);
		return { isValid: true, errors: [] };
	} catch (error) {
		if (error instanceof z.ZodError) {
			errors.push(...error.errors.map((e) => e.message));
		}
		return { isValid: false, errors };
	}
}

export function validatePolicyDependencies(
	policies: Array<{ name: string; type?: string; dependencies?: string[] }>,
): DependencyValidationResult {
	const errors: string[] = [];
	const dependencyMap = new Map<string, string[]>();
	const nameByType = new Map<string, string>();

	for (const policy of policies) {
		if (policy.type) {
			nameByType.set(policy.type, policy.name);
		}
	}

	for (const policy of policies) {
		const rawDeps = policy.dependencies || [];
		const normalizedDeps: string[] = [];
		for (const dep of rawDeps) {
			if (policies.some((p) => p.name === dep)) {
				normalizedDeps.push(dep);
			} else if (nameByType.has(dep)) {
				normalizedDeps.push(nameByType.get(dep)!);
			} else {
				errors.push(`Unknown dependency reference: ${dep}`);
			}
		}
		dependencyMap.set(policy.name, normalizedDeps);
	}

	const visited = new Set<string>();
	const recursionStack = new Set<string>();
	function hasCycle(policyName: string): boolean {
		if (recursionStack.has(policyName)) {
			errors.push('Circular dependency detected');
			return true;
		}
		if (visited.has(policyName)) return false;
		visited.add(policyName);
		recursionStack.add(policyName);
		const deps = dependencyMap.get(policyName) || [];
		for (const d of deps) {
			if (hasCycle(d)) return true;
		}
		recursionStack.delete(policyName);
		return false;
	}
	for (const p of policies) {
		if (hasCycle(p.name)) break;
	}
	const dependencyOrder = topologicalSort(
		policies.map((p) => p.name),
		dependencyMap,
	);
	return { isValid: errors.length === 0, errors, dependencyOrder };
}

function buildGraph(nodes: string[], dependencyMap: Map<string, string[]>) {
	const inDegree = new Map<string, number>();
	const adjacency = new Map<string, string[]>();
	for (const n of nodes) {
		inDegree.set(n, 0);
		adjacency.set(n, []);
	}
	for (const [node, deps] of dependencyMap) {
		for (const dep of deps) {
			if (!adjacency.has(dep)) adjacency.set(dep, []);
			adjacency.get(dep)?.push(node);
			inDegree.set(node, (inDegree.get(node) || 0) + 1);
		}
	}
	return { inDegree, adjacency };
}

function topologicalSort(
	nodes: string[],
	dependencyMap: Map<string, string[]>,
): string[] {
	const { inDegree, adjacency } = buildGraph(nodes, dependencyMap);
	const result: string[] = [];
	const queue = nodes.filter((n) => (inDegree.get(n) || 0) === 0);
	while (queue.length) {
		const current = queue.shift()!;
		result.push(current);
		for (const next of adjacency.get(current) || []) {
			inDegree.set(next, (inDegree.get(next) || 0) - 1);
			if ((inDegree.get(next) || 0) === 0) queue.push(next);
		}
	}
	return result;
}

// Testing and reporting
export function testPolicyComposition(
	composition: PolicyComposition,
	scenarios: TestScenario[],
): TestResults {
	const results: TestResults = {
		totalTests: scenarios.length,
		passed: 0,
		failed: 0,
		scenarios: [],
	};

	for (const scenario of scenarios) {
		const actualResult = evaluateScenario(composition, scenario);
		const passed = actualResult === scenario.expectedResult;

		results.scenarios.push({
			name: scenario.name,
			passed,
			actual: actualResult,
			expected: scenario.expectedResult,
		});

		if (passed) {
			results.passed++;
		} else {
			results.failed++;
		}
	}

	return results;
}

function extractAllowedImports(policy: Policy): string[] | undefined {
	if (policy.type !== 'structure-guard') return undefined;
	const raw = (policy.config as { allowedImports?: unknown }).allowedImports;
	if (!Array.isArray(raw)) return [];
	const result: string[] = [];
	for (const item of raw) if (typeof item === 'string') result.push(item);
	return result;
}

function evaluateScenario(
	composition: PolicyComposition,
	scenario: TestScenario,
): string {
	if (scenario.action !== 'import') return 'unknown';
	const structurePolicies = composition.policies.filter(
		(p) => p.type === 'structure-guard',
	);
	for (const policy of structurePolicies) {
		const allowed = extractAllowedImports(policy);
		if (allowed?.includes(scenario.target)) return 'allowed';
	}
	return structurePolicies.length ? 'denied' : 'unknown';
}

export function generateCompositionReport(
	composition: PolicyComposition,
): CompositionReport {
	const conflicts = detectPolicyConflicts(composition.policies);
	const policyTypes = [...new Set(composition.policies.map((p) => p.type))];

	// Simple risk assessment
	let riskLevel: 'low' | 'medium' | 'high' = 'low';
	if (conflicts.length > 0) {
		const highSeverityConflicts = conflicts.filter(
			(c) => c.severity === 'high',
		).length;
		riskLevel = highSeverityConflicts > 0 ? 'high' : 'medium';
	}

	const recommendations: string[] = [];
	if (conflicts.length > 0) {
		recommendations.push('Resolve policy conflicts before deployment');
	}
	if (composition.policies.length === 0) {
		recommendations.push('Add security policies to improve protection');
	}

	return {
		compositionId: composition.id,
		policyCount: composition.policies.length,
		riskLevel,
		recommendations,
		generatedAt: new Date().toISOString(),
		conflictCount: conflicts.length,
		coverageAreas: policyTypes,
	};
}

export function validateSecurityStandards(
	composition: PolicyComposition,
	standards: string[],
): SecurityStandardsValidation {
	const policyTypes = new Set(composition.policies.map((p) => p.type));
	const requirements = new Map([
		['SOC2', ['audit', 'secret-access']],
		['GDPR-compliance', ['audit']],
	]);

	let totalRequirements = 0;
	let metRequirements = 0;
	const missingRequirements: string[] = [];

	for (const standard of standards) {
		const standardRequirements = requirements.get(standard) || [];
		totalRequirements += standardRequirements.length;

		for (const requirement of standardRequirements) {
			if (policyTypes.has(requirement as PolicyType)) {
				metRequirements++;
			} else {
				missingRequirements.push(`${standard}: ${requirement}`);
			}
		}
	}

	const coveragePercentage =
		totalRequirements > 0 ? (metRequirements / totalRequirements) * 100 : 100;

	return {
		compliant: missingRequirements.length === 0,
		coveragePercentage,
		missingRequirements,
		standardsChecked: standards,
	};
}
