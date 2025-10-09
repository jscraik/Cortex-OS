/**
 * @fileoverview Production guard for blocking ad-hoc system prompts
 * Ensures all system prompts go through the registered prompt system
 * following brAInwav security and governance standards
 */

import { getPrompt } from './index.js';

export interface ProductionGuardConfig {
	enabled: boolean;
	allowedAdHocEnvironments: string[];
	blockPatterns: RegExp[];
}

const DEFAULT_CONFIG: ProductionGuardConfig = {
	enabled: process.env.NODE_ENV === 'production',
	allowedAdHocEnvironments: ['development', 'test', 'staging'],
	blockPatterns: [
		/You are an? (?:AI|assistant|agent|bot)/i,
		/^System:? /i,
		/Ignore all previous instructions/i,
		/Act as if you are/i,
		/Please respond as/i,
	],
};

export class ProductionPromptGuard {
	private config: ProductionGuardConfig;

	constructor(config: Partial<ProductionGuardConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Validate that a prompt is using the registered prompt system
	 * Throws an error if ad-hoc prompts are detected in production
	 */
	validatePromptUsage(_promptText: string, promptId?: string): void {
		if (!this.config.enabled) {
			return; // Guard disabled in non-production environments
		}

		const currentEnv = process.env.NODE_ENV || 'development';
		if (this.config.allowedAdHocEnvironments.includes(currentEnv)) {
			return; // Allow ad-hoc prompts in development environments
		}

		if (promptId) {
			const registeredPrompt = getPrompt(promptId);
			if (!registeredPrompt) {
				throw new Error(
					`brAInwav production guard: Unknown prompt ID '${promptId}'. All production prompts must be registered in the prompt library.`,
				);
			}

			this.assertNoAdHocPatterns(registeredPrompt.template);
			return; // Valid registered prompt
		}

		throw new Error(
			`brAInwav production guard: Prompt ID is required in production environments. ` +
				`Register this prompt in the prompt library and reference it by id instead of embedding raw text.`,
		);
	}

	private assertNoAdHocPatterns(promptText: string): void {
		const isAdHocPrompt = this.config.blockPatterns.some((pattern) => pattern.test(promptText));

		if (isAdHocPrompt) {
			throw new Error(
				`brAInwav production guard: Ad-hoc system prompts are not allowed in production. ` +
					`Please register this prompt in the prompt library using the schema defined in packages/prompts/src/schema.ts. ` +
					`Blocked text: "${promptText.substring(0, 100)}"...`,
			);
		}

		if (promptText.length > 200 && this.containsSystemKeywords(promptText)) {
			throw new Error(
				`brAInwav production guard: Long unregistered prompt detected that appears to be a system prompt. ` +
					`Please register this prompt with appropriate risk level and ownership in the prompt library. ` +
					`Length: ${promptText.length} characters`,
			);
		}
	}

	/**
	 * Check if text contains system prompt keywords
	 */
	private containsSystemKeywords(text: string): boolean {
		const systemKeywords = [
			'you are',
			'your role',
			'system:',
			'assistant',
			'instructions',
			'guidelines',
			'behavior',
			'respond',
			'answer',
		];

		const lowerText = text.toLowerCase();
		return systemKeywords.some((keyword) => lowerText.includes(keyword));
	}

	/**
	 * Get a safe prompt from the registry with validation
	 */
	getSafePrompt(promptId: string, _variables: Record<string, unknown> = {}): string {
		this.validatePromptUsage('', promptId); // Validate the ID exists

		const prompt = getPrompt(promptId);
		if (!prompt) {
			throw new Error(`brAInwav production guard: Prompt '${promptId}' not found in registry`);
		}

		// Render the prompt with variables (this will be implemented by the calling code)
		// For now, return the template with brAInwav compliance logging
		console.log(`brAInwav prompt guard: Using registered prompt '${promptId}' v${prompt.version}`);

		return prompt.template;
	}

	/**
	 * Enable or disable the production guard
	 */
	setEnabled(enabled: boolean): void {
		this.config.enabled = enabled;
	}

	/**
	 * Add a custom block pattern
	 */
	addBlockPattern(pattern: RegExp): void {
		this.config.blockPatterns.push(pattern);
	}
}

// Global instance for easy access
export const promptGuard = new ProductionPromptGuard();

/**
 * Convenience function to validate prompt usage
 */
export function validatePromptUsage(promptText: string, promptId?: string): void {
	promptGuard.validatePromptUsage(promptText, promptId);
}

/**
 * Convenience function to get a safe prompt
 */
export function getSafePrompt(promptId: string, variables: Record<string, unknown> = {}): string {
	return promptGuard.getSafePrompt(promptId, variables);
}
