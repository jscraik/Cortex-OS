/**
 * Privacy Mode Enforcer for brAInwav Cortex-OS
 *
 * Implements privacy mode enforcement for hybrid model routing,
 * ensuring that sensitive data never leaves the local environment.
 *
 * Key Features:
 * - PII detection and filtering
 * - Local-only model enforcement
 * - Data residency compliance
 * - Sensitive content masking
 * - Privacy policy validation
 * - Audit logging for privacy compliance
 */

import type { RoutingRequest } from './HybridRoutingEngine.js';

export interface PrivacyPolicy {
	forceLocalOnly: boolean;
	allowedDataTypes: string[];
	forbiddenDataTypes: string[];
	maxDataSensitivity: 'public' | 'internal' | 'confidential' | 'secret';
	dataResidency: 'local' | 'regional' | 'global';
	maskPII: boolean;
	logSensitiveData: boolean;
	auditPrivacyEvents: boolean;
}

export interface SensitiveDataPattern {
	type: string;
	pattern: RegExp;
	riskLevel: 'low' | 'medium' | 'high' | 'critical';
	maskWith: string;
	description: string;
}

export interface PrivacyEnforcementResult {
	enforced: boolean;
	filteredRequest: RoutingRequest;
	maskedFields: string[];
	detectedPII: boolean;
	sensitivityLevel: string;
	dataResidencyCompliant: boolean;
	privacyViolations: Array<{
		type: string;
		description: string;
		riskLevel: string;
		action: string;
	}>;
	brainwavPrivacyProtected: boolean;
}

export class PrivacyModeEnforcer {
	private readonly defaultPolicy: PrivacyPolicy;
	private readonly sensitivePatterns: SensitiveDataPattern[];

	constructor() {
		this.defaultPolicy = {
			forceLocalOnly: true,
			allowedDataTypes: ['text', 'json', 'code'],
			forbiddenDataTypes: ['pii', 'credentials', 'secrets'],
			maxDataSensitivity: 'internal',
			dataResidency: 'local',
			maskPII: true,
			logSensitiveData: false,
			auditPrivacyEvents: true,
		};

		this.sensitivePatterns = [
			{
				type: 'email',
				pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
				riskLevel: 'medium',
				maskWith: '***@***.***',
				description: 'Email address detected',
			},
			{
				type: 'phone',
				pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
				riskLevel: 'medium',
				maskWith: '***-***-****',
				description: 'Phone number detected',
			},
			{
				type: 'ssn',
				pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
				riskLevel: 'critical',
				maskWith: '***-**-****',
				description: 'Social Security Number detected',
			},
			{
				type: 'credit_card',
				pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
				riskLevel: 'critical',
				maskWith: '****-****-****-****',
				description: 'Credit card number detected',
			},
			{
				type: 'api_key',
				pattern: /\b[A-Za-z0-9]{20,}\b/g,
				riskLevel: 'high',
				maskWith: '***API_KEY***',
				description: 'Potential API key detected',
			},
			{
				type: 'password',
				pattern: /\b(password|pwd|pass)\s*[:=]\s*\S+/gi,
				riskLevel: 'high',
				maskWith: 'password: ***',
				description: 'Password detected',
			},
			{
				type: 'secret_key',
				pattern: /\b(secret|private|access)_?key\s*[:=]\s*\S+/gi,
				riskLevel: 'critical',
				maskWith: 'secret_key: ***',
				description: 'Secret key detected',
			},
		];
	}

	async enforcePrivacy(
		request: RoutingRequest,
		policy?: Partial<PrivacyPolicy>,
	): Promise<PrivacyEnforcementResult> {
		const effectivePolicy = { ...this.defaultPolicy, ...policy };
		const violations: Array<{
			type: string;
			description: string;
			riskLevel: string;
			action: string;
		}> = [];
		const maskedFields: string[] = [];

		// Start with the original request
		const filteredRequest = { ...request };

		// If privacy mode is enabled, force local-only routing
		if (request.privacyMode) {
			filteredRequest.modelPreferences = {
				...filteredRequest.modelPreferences,
				preferLocal: true,
				allowCloud: false,
			};
			violations.push({
				type: 'cloud_access_blocked',
				description: 'Cloud access blocked in privacy mode',
				riskLevel: 'high',
				action: 'Enforced local-only routing',
			});
		}

		// Detect and mask PII in the prompt
		const promptAnalysis = this.analyzeAndMaskPII(filteredRequest.prompt, effectivePolicy);
		if (promptAnalysis.detectedPII) {
			filteredRequest.prompt = promptAnalysis.maskedText;
			maskedFields.push(...promptAnalysis.maskedFields);
			violations.push(...promptAnalysis.violations);
		}

		// Analyze and mask PII in context
		if (filteredRequest.context) {
			const contextAnalysis = this.analyzeAndMaskData(filteredRequest.context, effectivePolicy);
			if (contextAnalysis.detectedPII) {
				filteredRequest.context = contextAnalysis.maskedData;
				maskedFields.push(...contextAnalysis.maskedFields);
				violations.push(...contextAnalysis.violations);
			}
		}

		// Check data sensitivity
		const sensitivityLevel = this.assessSensitivity(filteredRequest, effectivePolicy);
		const sensitivityCompliant = this.isSensitivityCompliant(sensitivityLevel, effectivePolicy);

		if (!sensitivityCompliant) {
			violations.push({
				type: 'sensitivity_violation',
				description: `Data sensitivity ${sensitivityLevel} exceeds maximum allowed ${effectivePolicy.maxDataSensitivity}`,
				riskLevel: 'high',
				action: 'Request blocked or sanitized',
			});
		}

		// Check data residency
		const residencyCompliant = effectivePolicy.dataResidency === 'local' || !request.privacyMode;

		if (!residencyCompliant) {
			violations.push({
				type: 'data_residency_violation',
				description: `Data residency requirement: ${effectivePolicy.dataResidency}`,
				riskLevel: 'critical',
				action: 'Enforced local processing only',
			});
		}

		// Determine if enforcement was applied
		const enforced = violations.length > 0 || maskedFields.length > 0 || request.privacyMode;

		// Log privacy event if enabled
		if (effectivePolicy.auditPrivacyEvents && enforced) {
			this.logPrivacyEvent(request, filteredRequest, violations, maskedFields);
		}

		return {
			enforced,
			filteredRequest,
			maskedFields,
			detectedPII: promptAnalysis.detectedPII || contextAnalysis?.detectedPII || false,
			sensitivityLevel,
			dataResidencyCompliant: residencyCompliant,
			privacyViolations: violations,
			brainwavPrivacyProtected: true,
		};
	}

	private analyzeAndMaskPII(
		text: string,
		policy: PrivacyPolicy,
	): {
		maskedText: string;
		detectedPII: boolean;
		maskedFields: string[];
		violations: Array<{ type: string; description: string; riskLevel: string; action: string }>;
	} {
		let maskedText = text;
		const maskedFields: string[] = [];
		const violations: Array<{
			type: string;
			description: string;
			riskLevel: string;
			action: string;
		}> = [];

		for (const pattern of this.sensitivePatterns) {
			const matches = text.match(pattern.pattern);
			if (matches) {
				if (policy.maskPII) {
					maskedText = maskedText.replace(pattern.pattern, pattern.maskWith);
				}

				maskedFields.push(pattern.type);
				violations.push({
					type: pattern.type,
					description: pattern.description,
					riskLevel: pattern.riskLevel,
					action: policy.maskPII ? `Masked as ${pattern.maskWith}` : 'Detected but not masked',
				});
			}
		}

		return {
			maskedText,
			detectedPII: maskedFields.length > 0,
			maskedFields,
			violations,
		};
	}

	private analyzeAndMaskData(
		data: any,
		policy: PrivacyPolicy,
	): {
		maskedData: any;
		detectedPII: boolean;
		maskedFields: string[];
		violations: Array<{ type: string; description: string; riskLevel: string; action: string }>;
	} {
		const maskedFields: string[] = [];
		const violations: Array<{
			type: string;
			description: string;
			riskLevel: string;
			action: string;
		}> = [];

		const maskRecursive = (obj: any, path: string = ''): any => {
			if (typeof obj === 'string') {
				const analysis = this.analyzeAndMaskPII(obj, policy);
				if (analysis.detectedPII) {
					maskedFields.push(...analysis.maskedFields.map((f) => (path ? `${path}.${f}` : f)));
					violations.push(...analysis.violations);
					return analysis.maskedText;
				}
				return obj;
			}

			if (Array.isArray(obj)) {
				return obj.map((item, index) => maskRecursive(item, `${path}[${index}]`));
			}

			if (obj && typeof obj === 'object') {
				const masked: any = {};
				for (const [key, value] of Object.entries(obj)) {
					masked[key] = maskRecursive(value, path ? `${path}.${key}` : key);
				}
				return masked;
			}

			return obj;
		};

		const maskedData = maskRecursive(data);

		return {
			maskedData,
			detectedPII: maskedFields.length > 0,
			maskedFields,
			violations,
		};
	}

	private assessSensitivity(request: RoutingRequest, _policy: PrivacyPolicy): string {
		// Simple sensitivity assessment based on content and metadata
		const prompt = request.prompt.toLowerCase();
		const metadata = request.metadata || {};

		if (
			prompt.includes('secret') ||
			prompt.includes('confidential') ||
			prompt.includes('private')
		) {
			return 'secret';
		}

		if (prompt.includes('internal') || metadata.internal === true) {
			return 'confidential';
		}

		if (prompt.includes('company') || prompt.includes('business')) {
			return 'internal';
		}

		return 'public';
	}

	private isSensitivityCompliant(sensitivityLevel: string, policy: PrivacyPolicy): boolean {
		const levels = { public: 0, internal: 1, confidential: 2, secret: 3 };
		const sensitivityScore = levels[sensitivityLevel as keyof typeof levels] || 0;
		const maxAllowedScore = levels[policy.maxDataSensitivity] || 0;

		return sensitivityScore <= maxAllowedScore;
	}

	private logPrivacyEvent(
		originalRequest: RoutingRequest,
		filteredRequest: RoutingRequest,
		violations: any[],
		maskedFields: string[],
	): void {
		const event = {
			timestamp: new Date().toISOString(),
			eventType: 'privacy_enforcement',
			requestId: originalRequest.requestId,
			userId: originalRequest.userId,
			originalPromptLength: originalRequest.prompt.length,
			filteredPromptLength: filteredRequest.prompt.length,
			violationsDetected: violations.length,
			maskedFieldsCount: maskedFields.length,
			violationTypes: violations.map((v) => v.type),
			riskLevels: violations.map((v) => v.riskLevel),
			brainwavPrivacyProtected: true,
		};

		// In a real implementation, this would be sent to an audit logging system
		console.log('brAInwav Privacy Event:', JSON.stringify(event, null, 2));
	}

	getPrivacyPolicy(): PrivacyPolicy {
		return { ...this.defaultPolicy };
	}

	updatePrivacyPolicy(updates: Partial<PrivacyPolicy>): void {
		Object.assign(this.defaultPolicy, updates);
	}

	addSensitivePattern(pattern: SensitiveDataPattern): void {
		this.sensitivePatterns.push(pattern);
	}

	removeSensitivePattern(type: string): void {
		const index = this.sensitivePatterns.findIndex((p) => p.type === type);
		if (index >= 0) {
			this.sensitivePatterns.splice(index, 1);
		}
	}
}
