import { createTool, z } from '../mocks/voltagent-core';

export const createSecurityGuardTool = () =>
	createTool({
		id: 'security-guard',
		name: 'security_guard',
		description:
			'Security monitoring and content safety validation using Llama Guard MLX model',

		parameters: z.object({
			content: z.string().min(1),
			checkType: z
				.enum(['input', 'output', 'conversation'])
				.optional()
				.default('input'),
			strictness: z
				.enum(['low', 'medium', 'high'])
				.optional()
				.default('medium'),
		}),

		async execute(
			params: {
				content: string;
				checkType?: 'input' | 'output' | 'conversation';
				strictness?: 'low' | 'medium' | 'high';
			},
			_context: any,
		) {
			// Mock implementation - in real usage would call the Python MLX service
			const securityCheck = await performSecurityCheck(
				params.content,
				params.checkType || 'input',
				params.strictness || 'medium',
			);

			return {
				success: true,
				isSafe: securityCheck.isSafe,
				riskLevel: securityCheck.riskLevel,
				violations: securityCheck.violations,
				recommendations: securityCheck.recommendations,
				timestamp: new Date().toISOString(),
				model: 'mlx/LlamaGuard-7B',
			};
		},
	});

// Security check types
interface SecurityCheckResult {
	isSafe: boolean;
	riskLevel: 'low' | 'medium' | 'high' | 'critical';
	violations: SecurityViolation[];
	recommendations: string[];
}

interface SecurityViolation {
	type: string;
	category: string;
	description: string;
	severity: 'low' | 'medium' | 'high' | 'critical';
	confidence: number;
}

// Mock security check function - would integrate with Python MLX service
async function performSecurityCheck(
	content: string,
	_checkType: 'input' | 'output' | 'conversation',
	strictness: 'low' | 'medium' | 'high',
): Promise<SecurityCheckResult> {
	// Simulate security analysis
	const violations: SecurityViolation[] = [];
	let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

	// Check for common patterns (simplified)
	const patterns = {
		personalInfo:
			/\b(?:ssn|social security|credit card|password|secret key)\b/i,
		maliciousCode: /\b(?:rm -rf|format c:|drop table)\b/i,
		harmfulContent: /\b(?:hate|violence|abuse|illegal)\b/i,
		pii: /\b\d{3}-\d{2}-\d{4}\b|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
	};

	if (patterns.personalInfo.test(content)) {
		violations.push({
			type: 'personal_information',
			category: 'privacy',
			description: 'Potential personal information detected',
			severity: 'medium',
			confidence: 0.8,
		});
		riskLevel = 'medium';
	}

	if (patterns.maliciousCode.test(content)) {
		violations.push({
			type: 'malicious_code',
			category: 'security',
			description: 'Potentially harmful code pattern detected',
			severity: 'high',
			confidence: 0.9,
		});
		riskLevel = 'high';
	}

	if (patterns.harmfulContent.test(content)) {
		violations.push({
			type: 'harmful_content',
			category: 'safety',
			description: 'Potentially harmful content detected',
			severity: strictness === 'high' ? 'high' : 'medium',
			confidence: 0.7,
		});
		if (strictness === 'high') riskLevel = 'high';
	}

	if (patterns.pii.test(content)) {
		violations.push({
			type: 'pii_leak',
			category: 'privacy',
			description: 'PII information detected',
			severity: 'medium',
			confidence: 0.6,
		});
		if (riskLevel === 'low') riskLevel = 'medium';
	}

	const recommendations =
		violations.length > 0
			? [
					'Review content for sensitive information',
					'Consider redacting personal data',
					'Ensure content follows security guidelines',
				]
			: ['Content appears safe'];

	return {
		isSafe: violations.length === 0,
		riskLevel,
		violations,
		recommendations,
	};
}
