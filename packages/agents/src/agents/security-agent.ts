/**
 * Security Agent (LlamaGuard policy evaluator)
 *
 * Purpose: evaluate prompts/responses/tool-calls for security risks
 * aligned with OWASP LLM-10, MITRE ATT&CK/ATLAS, CWE/CAPEC, D3FEND.
 *
 * Works with any ModelProvider (MLX LlamaGuard recommended) and emits
 * structured decisions with mitigation guidance.
 */

import { z } from 'zod';
import {
	assessDependabotConfig,
	loadDependabotConfig,
} from '../integrations/dependabot.js';
import type {
	Agent,
	EventBus,
	ExecutionContext,
	GenerateOptions,
	GenerateResult,
	MCPClient,
	MemoryPolicy,
	ModelProvider,
} from '../lib/types.js';
import {
	generateAgentId,
	generateTraceId,
	withTimeout,
} from '../lib/utils.js';
import { validateSchema } from '../lib/validate.js';

// Input schema
export const securityInputSchema = z.object({
	content: z.string().min(1),
	phase: z.enum(['prompt', 'response', 'tool']),
	context: z
		.object({
			capability: z.string().optional(),
			toolsAllowed: z.array(z.string()).optional(),
			egressAllowed: z.array(z.string()).optional(),
			piiPolicy: z.enum(['block', 'mask', 'allow']).default('block'),
		})
		.default({ piiPolicy: 'block' }),
	riskThreshold: z.enum(['low', 'medium', 'high']).default('medium'),
	seed: z.number().int().positive().optional(),
	maxTokens: z.number().int().positive().max(4096).optional(),
});

// Output schema
export const securityOutputSchema = z.object({
	decision: z.enum(['allow', 'flag', 'block']),
	risk: z.enum(['low', 'medium', 'high', 'critical']),
	categories: z.array(z.string()),
	findings: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			description: z.string(),
			refs: z.array(z.string()),
			severity: z.enum(['low', 'medium', 'high', 'critical']),
		}),
	),
	mitigations: z.array(z.string()),
	labels: z.object({
		owasp_llm10: z.array(z.string()),
		mitre_attack: z.array(z.string()),
		mitre_atlas: z.array(z.string()),
		cwe: z.array(z.string()),
		capec: z.array(z.string()),
		d3fend: z.array(z.string()),
	}),
	confidence: z.number().min(0).max(1),
	processingTime: z.number().min(0),
});

export type SecurityInput = z.infer<typeof securityInputSchema>;
export type SecurityOutput = z.infer<typeof securityOutputSchema>;

export interface SecurityAgentConfig {
	provider: ModelProvider; // MLX LlamaGuard recommended
	eventBus: EventBus;
	mcpClient: MCPClient;
	timeout?: number;
	dependabotPath?: string; // optional override for config path
	memoryPolicy?: MemoryPolicy; // per-capability limits (TTL/size/namespacing)
}


// Helper: publish event
import { randomUUID } from 'crypto';

function publishEvent(eventBus: EventBus, type: string, data: Record<string, unknown>) {
	eventBus.publish({
		specversion: '1.0' as const,
		id: randomUUID(),
		type,
		source: 'urn:cortex:agent:security',
		time: new Date().toISOString(),
		ttlMs: 60000,
		headers: {},
		data,
	});
}

// Helper: load dependabot config and publish event
async function loadAndPublishDependabot(eventBus: EventBus, dependabotPath?: string) {
	const dep = await loadDependabotConfig(process.cwd(), dependabotPath);
	if (dep) {
		publishEvent(eventBus, 'security.dependabot_config_loaded', {
			path: dep.path,
			projects: dep.projects,
			timestamp: new Date().toISOString(),
		});
	}
	return dep;
}

export function createSecurityAgent(config: SecurityAgentConfig): Agent<SecurityInput, SecurityOutput> {
	const agentId = generateAgentId();
	const timeout = config.timeout ?? 60000;
	// Minimal system prompt builder for security agent
	const buildSystemPrompt = (phase: string): string => {
		return `You are a security policy evaluator. Phase: ${phase}`;
	};

	// Minimal prompt builder for security agent
	const buildPrompt = (input: SecurityInput): string => {
		return `Evaluate the following content for security risks:\n${input.content}`;
	};
	type ModelResponse = { text: string; latencyMs?: number };
	type Finding = {
		id: string;
		title: string;
		description: string;
		refs: string[];
		severity: 'low' | 'medium' | 'high' | 'critical';
	};

	function findFirstJsonBounds(text: string): [number, number] | null {
		let depth = 0, start = -1;
		for (let i = 0; i < text.length; i++) {
			if (text[i] === '{') {
				if (depth === 0) start = i;
				depth++;
			} else if (text[i] === '}') {
				depth--;
				if (depth === 0 && start !== -1) {
					return [start, i + 1];
				}
			}
		}
		return null;
	}

	function safeParseJson(str: string): unknown {
		try {
			const parsed = JSON.parse(str);
			return typeof parsed === 'object' && parsed !== null ? parsed : {};
		} catch {
			return {};
		}
	}

	function extractFirstJsonObject(text: string): unknown {
		const bounds = findFirstJsonBounds(text);
		if (!bounds) return {};
		const [start, end] = bounds;
		const jsonStr = text.slice(start, end);
		return safeParseJson(jsonStr);
	}

	function normalizeFindings(findings: unknown): Finding[] {
		if (!Array.isArray(findings)) return [];
		return findings.map((f: Partial<Finding>) => ({
			id: f.id || 'unknown',
			title: f.title || 'Untitled',
			description: f.description || '',
			refs: Array.isArray(f.refs) ? f.refs : [],
			severity: f.severity || 'medium',
		}));
	}

	const parseResult = (response: ModelResponse): SecurityOutput => {
		try {
			const parsed = extractFirstJsonObject(response.text);
			const safe = ensureObjectType(parsed);
			const labels = ensureObjectType(safe.labels);

			const decision = determineSecurityDecision(safe, response.text);
			const risk = determineRiskLevel(safe, decision);
			const categories = determineCategories(safe, response.text);

			const merged: SecurityOutput = {
				decision: decision as 'allow' | 'flag' | 'block',
				risk: risk as 'low' | 'medium' | 'high' | 'critical',
				categories,
				findings: normalizeFindings(safe.findings),
				mitigations: Array.isArray(safe.mitigations) ? safe.mitigations : [],
				labels: {
					owasp_llm10: Array.isArray(labels.owasp_llm10) ? labels.owasp_llm10 : [],
					mitre_attack: Array.isArray(labels.mitre_attack) ? labels.mitre_attack : [],
					mitre_atlas: Array.isArray(labels.mitre_atlas) ? labels.mitre_atlas : [],
					cwe: Array.isArray(labels.cwe) ? labels.cwe : [],
					capec: Array.isArray(labels.capec) ? labels.capec : [],
					d3fend: Array.isArray(labels.d3fend) ? labels.d3fend : [],
				},
				confidence: typeof safe.confidence === 'number' ? safe.confidence : 0.75,
				processingTime: response.latencyMs || 1000,
			};
			return merged;
		} catch (_error) {
			console.warn('Security agent parsing error:', _error);
			return createFallbackSecurityOutput(response.latencyMs || 1000);
		}
	};

	// Helper functions to reduce cognitive complexity
	const ensureObjectType = (val: unknown): Record<string, unknown> =>
		typeof val === 'object' && val !== null ? val as Record<string, unknown> : {};

	const determineSecurityDecision = (safe: Record<string, unknown>, rawText: string): string => {
		if ('decision' in safe && typeof safe.decision === 'string') {
			return safe.decision;
		}

		// Apply heuristics when no explicit decision
		const raw = rawText.toLowerCase();
		if (/\bblock\b/.test(raw)) return 'block';
		if (/\bflag\b|\brisk\b|\bunsafe\b|\bviolation\b/.test(raw)) return 'flag';

		// Check findings as last resort
		const findings = safe.findings;
		const hasFindings = Array.isArray(findings) && findings.length > 0;
		return hasFindings ? 'flag' : 'allow';
	};

	const determineRiskLevel = (safe: Record<string, unknown>, decision: string): string => {
		if ('risk' in safe && typeof safe.risk === 'string') {
			return safe.risk;
		}

		// Escalate risk for blocked content
		if (decision === 'block') return 'high';
		return decision === 'allow' ? 'low' : 'medium';
	};

	const determineCategories = (safe: Record<string, unknown>, rawText: string): string[] => {
		if (Array.isArray(safe.categories) && safe.categories.length > 0) {
			return safe.categories;
		}

		// Apply heuristic categorization
		const raw = rawText.toLowerCase();
		const cats: string[] = [];
		if (/tool|command|shell/.test(raw)) cats.push('tool-abuse');
		if (/exfil|leak|secret/.test(raw)) cats.push('data-exfiltration');
		if (/block|unsafe|violation/.test(raw)) cats.push('policy-violation');
		return cats.length > 0 ? cats : ['unclassified'];
	};

	const createFallbackSecurityOutput = (processingTime: number): SecurityOutput => {
		const fallback: SecurityOutput = {
			decision: 'flag',
			risk: 'medium',
			categories: ['parsing-fallback'],
			findings: [
				{
					id: 'FALLBACK-JSON',
					title: 'Unable to parse security JSON',
					description: 'Fallback applied; review content manually',
					refs: [],
					severity: 'medium',
				},
			],
			mitigations: ['Re-run with stricter policy', 'Manual review required'],
			labels: {
				owasp_llm10: [],
				mitre_attack: [],
				mitre_atlas: [],
				cwe: [],
				capec: [],
				d3fend: [],
			},
			confidence: 0.5,
			processingTime,
		};

		return fallback;
	};



	const evaluate = async (input: SecurityInput): Promise<SecurityOutput> => {
		const systemPrompt = buildSystemPrompt(input.phase);
		// Enrich context with Dependabot configuration when available
		const dep = await loadDependabotConfig(
			process.cwd(),
			config.dependabotPath,
		);
		if (dep && input.context && typeof input.context === 'object') {
			(input.context as { dependabot?: unknown }).dependabot = { projects: dep.projects };
		}
		const prompt = buildPrompt(input);
		const options: GenerateOptions = {
			maxTokens: Math.min(512, input.maxTokens ?? 4096),
			temperature: 0.0,
			responseFormat: { type: 'json' },
			systemPrompt,
			stop: ['\n\n```'], // Moved inside options
			seed: input.seed,
		};
		const extractText = (r: unknown): string => {
			if (typeof r === 'string') return r;
			if (r && typeof r === 'object') {
				if ('text' in r && typeof (r as { text?: unknown }).text === 'string') return (r as { text: string }).text;
				if ('content' in r && typeof (r as { content?: unknown }).content === 'string') return (r as { content: string }).content;
			}
			return '';
		};
		const res = await config.provider.generate(prompt, options);
		const text = extractText(res);
		let out = parseResult({ text });
		// Post-process with Dependabot assessment if available
		if (dep) {
			const assessment = assessDependabotConfig(dep);
			// emit assessment event (no separate timestamp field; envelope has time already)
			publishEvent(config.eventBus, 'security.dependabot_assessed', {
				path: dep.path,
				...assessment,
			});
			// Add findings for weak projects
			const newFindings = [...out.findings];
			if (assessment.weakProjects.length > 0) {
				for (const p of assessment.weakProjects) {
					newFindings.push({
						id: `DEPENDABOT-SCHEDULE-${p.directory}`,
						title: 'Weak Dependabot schedule',
						description: `Project ${p.packageEcosystem} at ${p.directory} uses '${p.scheduleInterval || 'unspecified'}' interval; prefer weekly or daily.`,
						refs: [
							'https://docs.github.com/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file#scheduleinterval',
						],
						severity: 'medium',
					});
				}
			}
			// Category and labels
			const newCategories = Array.from(
				new Set([...(out.categories || []), 'supply-chain', 'dependabot']),
			);
			// @ts-expect-error - Type compatibility issue with zod schema inference
			out = validateSchema(securityOutputSchema, {
				...out,
				categories: newCategories,
				findings: newFindings,
			} as SecurityOutput);
		}
		return out;
	};
	// Removed stray stop label

	// createEvent helper removed (publishEvent used directly for consistency)

	interface SecurityGenerateResult extends GenerateResult<SecurityOutput>, SecurityOutput { }

	return {
		id: agentId,
		name: 'Security Agent',
		capability: 'security',
		inputSchema: securityInputSchema,
		outputSchema: securityOutputSchema,
		capabilities: [
			{
				name: 'security-analysis',
				description: 'Security risk assessment and threat detection',
			},
		],
		execute: async (
			context: ExecutionContext<SecurityInput> | SecurityInput,
		): Promise<SecurityGenerateResult> => {
			const input = (typeof context === 'object' && context !== null && 'input' in context)
				? context.input
				: context;
			const traceId = generateTraceId();
			const start = Date.now();
			const validated = validateSchema(securityInputSchema, input);
			const validatedWithContext = {
				...validated,
				context: {
					piiPolicy: validated.context?.piiPolicy || ('allow' as const),
					capability: validated.context?.capability,
					toolsAllowed: validated.context?.toolsAllowed,
					egressAllowed: validated.context?.egressAllowed,
				},
				riskThreshold: validated.riskThreshold || ('medium' as const),
			};

			publishEvent(config.eventBus, 'agent.started', {
				agentId,
				traceId,
				capability: 'security',
				input: { phase: validatedWithContext.phase },
				timestamp: new Date().toISOString(),
			});

			if (typeof validatedWithContext === 'object' && validatedWithContext !== null && '_suppressLifecycle' in validatedWithContext) {
				// proceed without emitting lifecycle; orchestrator proxies events
			}

			try {
				await loadAndPublishDependabot(config.eventBus, config.dependabotPath);
				const out = await withTimeout(evaluate(validatedWithContext), timeout);
				const dur = Math.max(1, Date.now() - start);
				const suppress = typeof validatedWithContext === 'object' && validatedWithContext !== null && '_suppressLifecycle' in validatedWithContext && (validatedWithContext as Record<string, unknown>)._suppressLifecycle === true;
				if (!suppress) {
					publishEvent(config.eventBus, 'agent.completed', {
						agentId,
						traceId,
						capability: 'security',
						result: out,
						evidence: [],
						metrics: { latencyMs: dur },
						timestamp: new Date().toISOString(),
					});
				}

				// Return output matching securityOutputSchema (all required fields, not nested)
				return {
					content: JSON.stringify(out),
					data: out,
					// Flatten core output properties for backward-compatible test expectations
					decision: out.decision,
					risk: out.risk,
					categories: out.categories,
					findings: out.findings,
					mitigations: out.mitigations,
					labels: out.labels,
					confidence: out.confidence,
					processingTime: out.processingTime,
				};
			} catch (err) {
				const dur = Math.max(1, Date.now() - start);
				publishEvent(config.eventBus, 'agent.failed', {
					agentId,
					traceId,
					capability: 'security',
					error: err instanceof Error ? err.message : 'Unknown error',
					errorCode: typeof err === 'object' && err !== null && 'code' in err ? (err as { code?: string }).code : undefined,
					status: typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status?: number }).status === 'number'
						? (err as { status?: number }).status
						: undefined,
					metrics: { latencyMs: dur },
					timestamp: new Date().toISOString(),
				});
				const fallback: SecurityOutput = {
					decision: 'block',
					risk: 'critical',
					categories: [],
					findings: [],
					mitigations: [],
					labels: {
						owasp_llm10: [],
						mitre_attack: [],
						mitre_atlas: [],
						cwe: [],
						capec: [],
						d3fend: [],
					},
					confidence: 0,
					processingTime: 0,
				};
				return {
					content: JSON.stringify(fallback),
					data: fallback,
					decision: fallback.decision,
					risk: fallback.risk,
					categories: fallback.categories,
					findings: fallback.findings,
					mitigations: fallback.mitigations,
					labels: fallback.labels,
					confidence: fallback.confidence,
					processingTime: fallback.processingTime,
				};
			}
		},
	};
}

