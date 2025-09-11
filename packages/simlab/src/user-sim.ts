/**
 * @fileoverview User simulator for SimLab - generates realistic user interactions
 * @version 1.0.0
 * @author Cortex-OS Team
 */

import type { SimRunnerConfig } from './runner.js';
import type { SimScenario, SimTurn } from './types.js';

interface PersonaStyle {
	formality: 'casual' | 'professional' | 'technical';
	locale: string;
	tone: string;
}

/**
 * Simulates user behavior and responses based on personas and scenarios
 */
export class UserSimulator {
	private readonly config: SimRunnerConfig;
	private readonly rng: () => number;

	constructor(config: SimRunnerConfig) {
		this.config = config;

		// Use deterministic RNG if configured
		if (config.deterministic && config.seed) {
			this.rng = this.createSeededRNG(config.seed);
		} else {
			this.rng = Math.random;
		}
	}

	/**
	 * Generate the initial message from the user based on scenario
	 */
	generateInitialMessage(scenario: SimScenario): Promise<string> {
		const { persona, goal } = scenario;
		const style = this.getPersonaStyle(persona);
		return Promise.resolve(this.formatMessage(goal, style));
	}

	/**
	 * Generate a user response based on conversation history and agent response
	 */
	generateResponse(
		scenario: SimScenario,
		conversationHistory: SimTurn[],
		agentResponse: string,
	): Promise<string | null> {
		const { persona } = scenario;
		const turnCount = conversationHistory.length;

		// Determine if user should continue conversation
		if (this.shouldEndConversation(agentResponse, turnCount)) {
			return Promise.resolve(null);
		}

		// Generate response based on agent's message and persona
		const style = this.getPersonaStyle(persona);

		if (this.isHelpful(agentResponse)) {
			return Promise.resolve(this.generatePositiveResponse(style));
		}

		if (this.needsClarification(agentResponse)) {
			return Promise.resolve(this.generateClarificationRequest(style));
		}

		return Promise.resolve(this.generateFollowUpResponse(style));
	}

	/**
	 * Get communication style based on persona
	 */
	private getPersonaStyle(persona: SimScenario['persona']): PersonaStyle {
		return {
			formality: this.getTechFormalityLevel(persona.tech_fluency),
			locale: persona.locale,
			tone: persona.tone,
		};
	}

	/**
	 * Map tech fluency to formality level
	 */
	private getTechFormalityLevel(
		techFluency: 'low' | 'med' | 'high',
	): 'casual' | 'professional' | 'technical' {
		switch (techFluency) {
			case 'low':
				return 'casual';
			case 'med':
				return 'professional';
			case 'high':
				return 'technical';
			default:
				return 'professional';
		}
	}

	/**
	 * Format initial message based on goal and style
	 */
	private formatMessage(goal: string, style: PersonaStyle): string {
		if (style.formality === 'casual') {
			return `Hi! ${goal}`;
		}

		if (style.formality === 'technical') {
			return `I need assistance with: ${goal}`;
		}

		// Professional tone
		return `Hello, I would like help with ${goal}`;
	}

	/**
	 * Determine if conversation should end
	 */
	private shouldEndConversation(
		agentResponse: string,
		turnCount: number,
	): boolean {
		const completionIndicators = [
			/is there anything else/i,
			/glad i could help/i,
			/problem solved/i,
			/task completed/i,
			/happy to assist further/i,
		];

		const maxTurnsBias =
			this.config.timeout && this.config.timeout < 15000 ? 10 : 20;
		if (turnCount > maxTurnsBias) {
			return true;
		}

		return completionIndicators.some((r) => r.test(agentResponse));
	}

	/**
	 * Check if agent response is helpful
	 */
	private isHelpful(response: string): boolean {
		const helpfulIndicators = [
			/\bhere(?:'s| is)\b/i,
			/i can help/i,
			/solution/i,
			/answer/i,
			/information/i,
			/step-by-step/i,
		];

		return helpfulIndicators.some((r) => r.test(response));
	}

	/**
	 * Check if agent response needs clarification
	 */
	private needsClarification(response: string): boolean {
		const clarificationIndicators = [
			/could you clarify/i,
			/need more information/i,
			/be more specific/i,
			/what do you mean/i,
			/unclear/i,
		];
		return clarificationIndicators.some((r) => r.test(response));
	}

	/**
	 * Generate positive response
	 */
	private generatePositiveResponse(style: PersonaStyle): string {
		const responses = [
			'Thank you, that helps!',
			'Great, that works for me.',
			'Perfect, exactly what I needed.',
		];

		return this.selectRandomResponse(responses, style);
	}

	/**
	 * Generate clarification request
	 */
	private generateClarificationRequest(style: PersonaStyle): string {
		const responses = [
			'Could you explain that in more detail?',
			'I need a bit more information about that.',
			'Can you walk me through that step by step?',
		];

		return this.selectRandomResponse(responses, style);
	}

	/**
	 * Generate follow-up response
	 */
	private generateFollowUpResponse(style: PersonaStyle): string {
		const responses = [
			'I see. What should I do next?',
			'Okay, can you help me with the next step?',
			'I understand. Is there anything else I should know?',
		];

		return this.selectRandomResponse(responses, style);
	}

	/**
	 * Select random response (deterministic if seeded)
	 */
	private selectRandomResponse(
		responses: string[],
		style: PersonaStyle,
	): string {
		let options = responses;
		if (style.formality === 'casual') {
			options = responses.map((r) =>
				r.replace(/Thank you/gi, 'Thanks').replace(/Hello/gi, 'Hey'),
			);
		} else if (style.formality === 'technical') {
			options = responses.map((r) => `Technical: ${r}`);
		}
		const index = Math.floor(this.rng() * options.length);
		return options[index] || options[0];
	}

	/**
	 * Create a seeded random number generator for deterministic results
	 */
	private createSeededRNG(seed: number): () => number {
		let state = seed;
		return () => {
			state = (state * 9301 + 49297) % 233280;
			return state / 233280;
		};
	}
}

export default UserSimulator;
