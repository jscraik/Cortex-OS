import { readFileSync } from 'node:fs';
import yaml from 'yaml';
import { resolveConfigPath } from '../config/model-catalog.js';

export interface PersonaPolicy {
	id: string;
	description?: string;
	category?: string;
}

export interface Persona {
	name: string;
	policies?: PersonaPolicy[];
}

export async function loadPersona(): Promise<Persona> {
	// Locate the repo-level persona file regardless of current working directory
	const override = process.env.CORTEX_PERSONA_PATH;
	const personaPath = resolveConfigPath(
		override ?? '.cortex/library/personas/cerebrum.yaml',
	);
	const raw = readFileSync(personaPath, 'utf8');

	const parsed = yaml.parse(raw) as
		| {
				name?: unknown;
				policies?: Array<{ id?: unknown; description?: unknown }>;
				rules?: unknown;
				checks?: unknown;
		  }
		| undefined;

	const name = (parsed?.name as string | undefined) ?? 'cerebrum';

	// Start with any explicit policies declared
	const explicitPolicies: PersonaPolicy[] = (parsed?.policies ?? []).map(
		(p, i: number) => ({
			id: String((p.id as string | undefined) ?? `policy-${i}`),
			description: p.description as string | undefined,
		}),
	);

	// Also map string-based rules/checks into lightweight policy entries for enforcement middleware
	const ruleItems: PersonaPolicy[] = Array.isArray(parsed?.rules)
		? (parsed?.rules as unknown[])
				.filter(
					(r): r is string => typeof r === 'string' && r.trim().length > 0,
				)
				.map((r, i) => ({ id: `rule:${i + 1}`, description: r }))
		: [];

	const checkItems: PersonaPolicy[] = Array.isArray(parsed?.checks)
		? (parsed?.checks as unknown[])
				.filter(
					(c): c is string => typeof c === 'string' && c.trim().length > 0,
				)
				.map((c, i) => {
					const text = c.trim();
					const idx = text.indexOf(':');
					const category =
						idx > 0 ? text.slice(0, idx).trim().toLowerCase() : undefined;
					const desc = idx > 0 ? text.slice(idx + 1).trim() : text;
					return {
						id: `check:${i + 1}`,
						description: desc,
						category,
					} as PersonaPolicy;
				})
		: [];

	const policies = [...explicitPolicies, ...ruleItems, ...checkItems];
	return { name, policies };
}

export interface PersonaCompliance {
	a11y: boolean;
	security: boolean;
	reasons: string[];
}

/**
 * Evaluate persona policies into structured compliance flags.
 * - Checks are expected to be of form "<category>: <description>" (e.g., "a11y: ensure ...", "security: follow ...").
 * - Rules can reinforce specific standards (e.g., contains "WCAG 2.2 AA").
 */
export function evaluatePersonaCompliance(persona: Persona): PersonaCompliance {
	const texts = (persona.policies ?? [])
		.map((p) => p.description ?? '')
		.filter(Boolean);
	const categories = texts
		.map((t) => t.split(':')[0]?.trim().toLowerCase())
		.filter((c) => c && c.length > 0);
	const hasA11yCategory =
		categories.includes('a11y') || categories.includes('accessibility');
	const hasSecurityCategory = categories.includes('security');
	const hasWcagRule = texts.some((t) => /wcag\s*2\.2\s*aa/i.test(t));
	const hasSecurityStandards = texts.some(
		(t) => /owasp\s*asvs/i.test(t) || /llm\s*top-?10/i.test(t),
	);

	const a11y = hasA11yCategory && hasWcagRule;
	const security = hasSecurityCategory && hasSecurityStandards;
	const reasons: string[] = [];
	if (!a11y)
		reasons.push(
			'a11y requirements not fully satisfied (need a11y category and WCAG 2.2 AA)',
		);
	if (!security)
		reasons.push(
			'security requirements not fully satisfied (need security category and OWASP ASVS or LLM Top-10)',
		);
	return { a11y, security, reasons };
}
