import { InterventionLevel, TDDSkillLevel } from '../types/TDDTypes.js';

export interface CoachingAction {
	type: 'block' | 'warn' | 'suggest' | 'guide' | 'allow';
	message: string;
	detailedExplanation?: string;
	suggestedNextSteps?: string[];
	learningResource?: string;
	escalationRequired?: boolean;
}

export interface CoachingSession {
	sessionId: string;
	developerId: string;
	startTime: string;
	currentPhase: string;
	interventions: CoachingIntervention[];
	skillAssessment: TDDSkillLevel;
	progressMetrics: ProgressMetrics;
}

export interface CoachingIntervention {
	timestamp: string;
	trigger: string;
	action: CoachingAction;
	developerResponse?: 'acknowledged' | 'ignored' | 'questioned';
	effectiveness?: number; // 0-1 scale
}

export interface ProgressMetrics {
	cyclesCompleted: number;
	averageCycleTime: number;
	testFirstPercentage: number;
	refactorFrequency: number;
	violationCount: number;
	skillProgression: number; // -1 to 1, negative means regression
}

export class ContextualCoach {
	private skillProfiles: Map<string, TDDSkillLevel> = new Map();
	private sessionHistory: Map<string, CoachingSession[]> = new Map();

	generateCoachingAction(
		violation: string,
		context: {
			developerId?: string;
			currentPhase: string;
			previousViolations: string[];
			timeInPhase: number;
			recentSuccess: boolean;
		},
	): CoachingAction {
		const skillLevel = this.assessDeveloperSkill(context.developerId);
		const intervention = this.determineInterventionLevel(context, skillLevel);

		switch (intervention) {
			case InterventionLevel.COACHING:
				return this.generateCoachingGuidance(violation, context, skillLevel);

			case InterventionLevel.WARNING:
				return this.generateWarning(violation, context, skillLevel);

			case InterventionLevel.BLOCKING:
				return this.generateBlock(violation, context, skillLevel);

			case InterventionLevel.SILENT:
				return this.generateSilentGuidance(violation, context);

			default:
				return this.generateGenericGuidance(violation);
		}
	}

	private assessDeveloperSkill(developerId?: string): TDDSkillLevel {
		if (!developerId) return TDDSkillLevel.BEGINNER;

		const stored = this.skillProfiles.get(developerId);
		if (stored) return stored;

		// Initialize with beginner and learn over time
		this.skillProfiles.set(developerId, TDDSkillLevel.BEGINNER);
		return TDDSkillLevel.BEGINNER;
	}

	private determineInterventionLevel(
		context: {
			previousViolations: string[];
			timeInPhase: number;
			recentSuccess: boolean;
		},
		skillLevel: TDDSkillLevel,
	): InterventionLevel {
		// Escalation logic based on context and skill
		const violationCount = context.previousViolations.length;
		const isStuck = context.timeInPhase > 30 * 60 * 1000; // 30 minutes

		if (skillLevel === TDDSkillLevel.EXPERT && context.recentSuccess) {
			return InterventionLevel.SILENT;
		}

		if (violationCount === 0) {
			return skillLevel === TDDSkillLevel.BEGINNER
				? InterventionLevel.COACHING
				: InterventionLevel.WARNING;
		}

		if (violationCount >= 3 || isStuck) {
			return InterventionLevel.BLOCKING;
		}

		if (violationCount >= 1) {
			return InterventionLevel.WARNING;
		}

		return InterventionLevel.COACHING;
	}

	private generateCoachingGuidance(
		violation: string,
		context: { currentPhase: string },
		skillLevel: TDDSkillLevel,
	): CoachingAction {
		const guidance = this.getPhaseSpecificGuidance(
			violation,
			context.currentPhase,
			skillLevel,
		);

		return {
			type: 'guide',
			message: guidance.message,
			detailedExplanation: guidance.explanation,
			suggestedNextSteps: guidance.steps,
			learningResource: guidance.resource,
		};
	}

	private generateWarning(
		violation: string,
		_context: { currentPhase: string; previousViolations: string[] },
		_skillLevel: TDDSkillLevel,
	): CoachingAction {
		const patternMatch = this.detectViolationPattern(
			_context.previousViolations,
		);

		return {
			type: 'warn',
			message: `⚠️ TDD Violation: ${violation}`,
			detailedExplanation: this.getViolationExplanation(violation, _skillLevel),
			suggestedNextSteps: this.getCorrectiveSteps(
				violation,
				_context.currentPhase,
			),
			escalationRequired: patternMatch.isRepeating,
		};
	}

	private generateBlock(
		violation: string,
		_context: { currentPhase: string; previousViolations: string[] },
		_skillLevel: TDDSkillLevel,
	): CoachingAction {
		return {
			type: 'block',
			message: `🚫 TDD Violation Blocked: ${violation}`,
			detailedExplanation: `Multiple violations detected. Let's get back on track with TDD fundamentals.`,
			suggestedNextSteps: [
				'Review the TDD cycle: Red → Green → Refactor',
				'Start with a simple failing test',
				'Implement only what makes the test pass',
				'Consider pair programming or mentoring session',
			],
			escalationRequired: true,
		};
	}

	private generateSilentGuidance(
		_violation: string,
		_context: { currentPhase: string },
	): CoachingAction {
		return {
			type: 'allow',
			message: '', // Silent for experts
			detailedExplanation: `Expert-level flexibility: ${_violation} permitted`,
			suggestedNextSteps: [],
		};
	}

	private generateGenericGuidance(violation: string): CoachingAction {
		return {
			type: 'suggest',
			message: `Consider TDD best practices: ${violation}`,
			suggestedNextSteps: [
				'Review TDD fundamentals',
				'Start with a failing test',
			],
		};
	}

	private getPhaseSpecificGuidance(
		_violation: string,
		phase: string,
		skillLevel: TDDSkillLevel,
	): {
		message: string;
		explanation: string;
		steps: string[];
		resource?: string;
	} {
		const baseGuidance = {
			RED: {
				message: 'In the RED phase, focus on writing failing tests',
				explanation:
					'The RED phase is about defining what you want to build through failing tests. Implementation comes later.',
				steps: [
					'Write a test that describes the behavior you want',
					'Run the test to confirm it fails',
					"Don't implement yet - stay in RED until you have a clear failing test",
				],
				resource: undefined as string | undefined,
			},
			GREEN: {
				message:
					'In the GREEN phase, implement the minimum code to make tests pass',
				explanation:
					'The GREEN phase is about making tests pass with the simplest implementation possible. Resist the urge to over-engineer.',
				steps: [
					'Look at the failing test',
					'Write the minimal code to make it pass',
					"Run tests to confirm they're green",
					'Save optimization for the REFACTOR phase',
				],
				resource: undefined as string | undefined,
			},
			REFACTOR: {
				message:
					'In the REFACTOR phase, improve code structure while keeping tests green',
				explanation:
					'The REFACTOR phase is about improving code quality without changing behavior. Tests should remain green throughout.',
				steps: [
					'Keep all tests passing',
					'Improve code structure, readability, and performance',
					'Run tests frequently to ensure nothing breaks',
					'Focus on one improvement at a time',
				],
				resource: undefined as string | undefined,
			},
		};

		const guidance =
			baseGuidance[phase as keyof typeof baseGuidance] || baseGuidance.RED;

		// Adjust for skill level
		if (skillLevel === TDDSkillLevel.BEGINNER) {
			guidance.resource =
				'https://martinfowler.com/articles/practical-test-pyramid.html';
		}

		return guidance;
	}

	private getViolationExplanation(
		violation: string,
		skillLevel: TDDSkillLevel,
	): string {
		const explanations: Record<string, string> = {
			implementation_before_test:
				'Writing implementation before tests skips the RED phase, which is crucial for defining requirements.',
			test_after_implementation:
				'Writing tests after implementation often leads to tests that confirm existing behavior rather than drive design.',
			over_implementation:
				'Implementing more than needed violates the GREEN phase principle of minimal implementation.',
			refactor_with_failing_tests:
				'Refactoring with failing tests is dangerous and violates the safety net that TDD provides.',
		};

		const explanation =
			explanations[violation] ||
			"This action doesn't align with TDD principles.";

		if (skillLevel === TDDSkillLevel.BEGINNER) {
			return `${explanation} As you're learning TDD, strict adherence to the cycle helps build good habits.`;
		}

		return explanation;
	}

	private getCorrectiveSteps(violation: string, _phase: string): string[] {
		const steps: Record<string, string[]> = {
			implementation_before_test: [
				'Undo the implementation',
				'Write a failing test first',
				'Then implement to make it pass',
			],
			over_implementation: [
				'Remove unnecessary code',
				'Keep only what makes the current test pass',
				'Add more tests for additional behavior',
			],
			refactor_with_failing_tests: [
				'First make all tests pass',
				'Then refactor while keeping tests green',
				'Run tests frequently during refactor',
			],
		};

		return (
			steps[violation] || [
				'Return to proper TDD cycle',
				'Start with a failing test',
			]
		);
	}

	private detectViolationPattern(previousViolations: string[]): {
		isRepeating: boolean;
		pattern?: string;
	} {
		if (previousViolations.length < 2) {
			return { isRepeating: false };
		}

		// Look for repeated violations in last 3 attempts
		const recent = previousViolations.slice(-3);
		const unique = new Set(recent);

		if (unique.size === 1) {
			return {
				isRepeating: true,
				pattern: `Repeated ${recent[0]} violations`,
			};
		}

		return { isRepeating: false };
	}

	// Session management
	startSession(developerId: string): CoachingSession {
		const session: CoachingSession = {
			sessionId: this.generateSessionId(),
			developerId,
			startTime: new Date().toISOString(),
			currentPhase: 'UNCLEAR',
			interventions: [],
			skillAssessment: this.assessDeveloperSkill(developerId),
			progressMetrics: {
				cyclesCompleted: 0,
				averageCycleTime: 0,
				testFirstPercentage: 0,
				refactorFrequency: 0,
				violationCount: 0,
				skillProgression: 0,
			},
		};

		const history = this.sessionHistory.get(developerId) || [];
		history.push(session);
		this.sessionHistory.set(developerId, history);

		return session;
	}

	private generateSessionId(): string {
		return `session_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
	}

	// Skill progression tracking
	updateSkillAssessment(developerId: string, session: CoachingSession): void {
		const metrics = session.progressMetrics;
		let newSkillLevel =
			this.skillProfiles.get(developerId) || TDDSkillLevel.BEGINNER;

		// Promote based on consistent good practices
		if (
			metrics.testFirstPercentage > 0.8 &&
			metrics.violationCount < 2 &&
			metrics.cyclesCompleted > 5
		) {
			switch (newSkillLevel) {
				case TDDSkillLevel.BEGINNER:
					newSkillLevel = TDDSkillLevel.INTERMEDIATE;
					break;
				case TDDSkillLevel.INTERMEDIATE:
					if (metrics.refactorFrequency > 0.5) {
						newSkillLevel = TDDSkillLevel.ADVANCED;
					}
					break;
				case TDDSkillLevel.ADVANCED:
					if (metrics.averageCycleTime < 300000) {
						// 5 minutes
						newSkillLevel = TDDSkillLevel.EXPERT;
					}
					break;
			}
		}

		// Demote based on persistent violations
		if (metrics.violationCount > 5 || metrics.testFirstPercentage < 0.3) {
			switch (newSkillLevel) {
				case TDDSkillLevel.EXPERT:
					newSkillLevel = TDDSkillLevel.ADVANCED;
					break;
				case TDDSkillLevel.ADVANCED:
					newSkillLevel = TDDSkillLevel.INTERMEDIATE;
					break;
				case TDDSkillLevel.INTERMEDIATE:
					newSkillLevel = TDDSkillLevel.BEGINNER;
					break;
			}
		}

		this.skillProfiles.set(developerId, newSkillLevel);
	}
}
