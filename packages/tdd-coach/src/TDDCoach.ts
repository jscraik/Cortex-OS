import { ContextualCoach } from './core/ContextualCoach.js';
import { TDDStateMachine } from './core/TDDStateMachine.js';
import type { TestRunConfiguration } from './reporters/BaseTestReporter.js';
import { UniversalTestReporter } from './reporters/UniversalTestReporter.js';
import {
  type ChangeSet,
  DevelopmentPhase,
  InterventionLevel,
  type TDDCoachConfig,
  TDDSkillLevel,
  TDDState,
  type TDDStateData,
  type TestResult,
  UrgencyLevel,
} from './types/TDDTypes.js';

export interface TDDCoachOptions {
  workspaceRoot: string;
  config?: Partial<TDDCoachConfig>;
  testConfig?: Partial<TestRunConfiguration>;
  developerId?: string;
}

export interface TDDValidationRequest {
  proposedChanges: ChangeSet;
  currentContext?: {
    activeFiles: string[];
    recentCommits: string[];
    branchName?: string;
  };
}

export interface TDDValidationResponse {
  allowed: boolean;
  state: TDDStateData;
  coaching: {
    level: InterventionLevel;
    message: string;
    explanation?: string;
    suggestedActions: string[];
    learningResources?: string[];
  };
  metadata: {
    sessionId: string;
    timestamp: string;
    developerId?: string;
    violationType?: string;
  };
}

export class TDDCoach {
  private stateMachine: TDDStateMachine;
  private coach: ContextualCoach;
  private testReporter: UniversalTestReporter;
  private currentState: TDDStateData;
  private config: TDDCoachConfig;
  private sessionId: string;

  constructor(options: TDDCoachOptions) {
    this.sessionId = this.generateSessionId();

    // Initialize configuration
    this.config = {
      universalMode: true,
      defaultInterventionLevel: InterventionLevel.COACHING,
      adaptiveLearning: true,
      teamCalibration: false,
      emergencyBypassEnabled: false,
      metricsCollection: true,
      aiToolIntegration: {
        github_copilot: true,
        claude_code: true,
        vs_code: true,
        codex_cli: true,
        gemini_cli: true,
        qwen_cli: true,
      },
      ...options.config,
    };

    // Initialize test configuration
    const testConfig: TestRunConfiguration = {
      workspaceRoot: options.workspaceRoot,
      testPatterns: [
        '**/*.test.*',
        '**/*.spec.*',
        '**/test_*.py',
        '**/*_test.go',
      ],
      timeout: 30000,
      coverage: false,
      parallel: true,
      ...options.testConfig,
    };

    // Initialize components
    this.testReporter = new UniversalTestReporter(testConfig);
    this.coach = new ContextualCoach();

    // Initialize state
    this.currentState = {
      current: TDDState.UNCLEAR,
      failingTests: [],
      passingTests: [],
      lastValidatedChange: null,
      testCoverage: 0,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    };

    this.stateMachine = new TDDStateMachine(this.currentState);

    // Start background test monitoring if enabled
    if (this.config.universalMode) {
      this.initializeTestWatching();
    }
  }

  /**
   * Main validation method - validates proposed changes against TDD principles
   */
  async validateChange(
    request: TDDValidationRequest,
  ): Promise<TDDValidationResponse> {
    try {
      // Run tests to get current state
      const testResults = await this.runRelevantTests(request.proposedChanges);

      // Update current state with test results
      this.updateCurrentState(testResults);

      // Validate the change through the state machine
      const validation = await this.stateMachine.validateTransition({
        currentState: this.currentState,
        proposedChange: request.proposedChanges,
        testResults,
        developmentContext: {
          phase: this.inferDevelopmentPhase(request),
          urgency: UrgencyLevel.MEDIUM, // Could be inferred from context
          experience: TDDSkillLevel.INTERMEDIATE, // Could be tracked per developer
          teamSize: 1,
          projectType: 'greenfield',
        },
      });

      // Generate coaching guidance
      const coachingAction = this.coach.generateCoachingAction(
        validation.reason,
        {
          developerId: 'anonymous', // Could be extracted from git
          currentPhase: this.currentState.current,
          previousViolations: [], // Would be tracked in real implementation
          timeInPhase:
            Date.now() - new Date(this.currentState.timestamp).getTime(),
          recentSuccess: this.currentState.passingTests.length > 0,
        },
      );

      return {
        allowed: validation.approved,
        state: { ...this.currentState },
        coaching: {
          level: this.getInterventionLevel(coachingAction.type),
          message: coachingAction.message,
          explanation: coachingAction.detailedExplanation,
          suggestedActions: coachingAction.suggestedNextSteps || [],
          learningResources: coachingAction.learningResource
            ? [coachingAction.learningResource]
            : [],
        },
        metadata: {
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
          developerId: request.currentContext?.branchName || 'anonymous',
          violationType: validation.approved ? undefined : validation.reason,
        },
      };
    } catch (error) {
      console.error('TDD Coach validation error:', error);

      // Fail safe - allow change but provide guidance
      return {
        allowed: true,
        state: this.currentState,
        coaching: {
          level: InterventionLevel.WARNING,
          message:
            'TDD validation temporarily unavailable - proceeding with caution',
          suggestedActions: [
            'Run tests manually',
            'Verify TDD cycle before committing',
          ],
        },
        metadata: {
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
          violationType: 'validation_error',
        },
      };
    }
  }

  /**
   * Quick status check - returns current TDD state without validation
   */
  async getStatus(): Promise<{
    state: TDDState;
    testsStatus: { passing: number; failing: number; total: number };
    lastUpdate: string;
    coaching: string;
  }> {
    const allTests = [
      ...this.currentState.passingTests,
      ...this.currentState.failingTests,
    ];

    return {
      state: this.currentState.current,
      testsStatus: {
        passing: this.currentState.passingTests.length,
        failing: this.currentState.failingTests.length,
        total: allTests.length,
      },
      lastUpdate: this.currentState.timestamp,
      coaching: this.generateQuickCoaching(),
    };
  }

  /**
   * Run tests and update TDD state accordingly
   */
  async runTests(filePaths?: string[]): Promise<TestResult[]> {
    try {
      const results: TestResult[] = [];

      if (filePaths && filePaths.length > 0) {
        // Run tests for specific files
        for (const filePath of filePaths) {
          const fileResults = await this.testReporter.runTestsForFile(filePath);
          results.push(...fileResults);
        }
      } else {
        // Run all tests
        const allResults = await this.testReporter.runAllTests();
        for (const [, testResults] of allResults) {
          results.push(...testResults);
        }
      }

      // Update state based on test results
      this.updateCurrentState(results);

      return results;
    } catch (error) {
      console.error('Test execution failed:', error);
      return [];
    }
  }

  /**
   * Enable test watching for real-time TDD state updates
   */
  async startTestWatching(): Promise<void> {
    await this.testReporter.startWatching((results) => {
      const allTests: TestResult[] = [];
      for (const [, testResults] of results) {
        allTests.push(...testResults);
      }
      this.updateCurrentState(allTests);
    });
  }

  /**
   * Stop test watching
   */
  async stopTestWatching(): Promise<void> {
    await this.testReporter.stopWatching();
  }

  /**
   * Get information about available test reporters
   */
  getTestReporterInfo(): Array<{
    name: string;
    language: string;
    available: boolean;
  }> {
    return this.testReporter.getReporterInfo();
  }

  // Private helper methods
  private async runRelevantTests(changeSet: ChangeSet): Promise<TestResult[]> {
    // Identify test files and related implementation files
    const testFiles = changeSet.files
      .filter((file) => this.isTestFile(file.path))
      .map((file) => file.path);

    // If no test files are being changed, run all tests
    if (testFiles.length === 0) {
      const allResults = await this.testReporter.runAllTests();
      const combined: TestResult[] = [];
      for (const [, results] of allResults) {
        combined.push(...results);
      }
      return combined;
    }

    // Run tests for changed test files
    const results: TestResult[] = [];
    for (const testFile of testFiles) {
      try {
        const fileResults = await this.testReporter.runTestsForFile(testFile);
        results.push(...fileResults);
      } catch (error) {
        console.warn(`Failed to run tests for ${testFile}:`, error);
      }
    }

    return results;
  }

  private updateCurrentState(testResults: TestResult[]): void {
    const passing = testResults.filter((test) => test.status === 'pass');
    const failing = testResults.filter((test) => test.status === 'fail');

    // Determine new TDD state based on test results
    let newState = this.currentState.current;

    if (failing.length > 0 && this.currentState.current !== TDDState.RED) {
      newState = TDDState.RED;
    } else if (failing.length === 0 && passing.length > 0) {
      if (this.currentState.current === TDDState.RED) {
        newState = TDDState.GREEN;
      } else if (this.currentState.current === TDDState.GREEN) {
        // Could transition to REFACTOR, but need to detect if code is being refactored
        // For now, stay in GREEN
      }
    } else if (testResults.length === 0) {
      newState = TDDState.UNCLEAR;
    }

    this.currentState = {
      ...this.currentState,
      current: newState,
      passingTests: passing,
      failingTests: failing,
      testCoverage: this.calculateCoverage(testResults),
      timestamp: new Date().toISOString(),
    };
  }

  private inferDevelopmentPhase(
    request: TDDValidationRequest,
  ): DevelopmentPhase {
    // Simple heuristics to infer development phase
    const hasNewTests = request.proposedChanges.files.some(
      (f) => this.isTestFile(f.path) && f.status === 'added',
    );

    const hasNewImplementation = request.proposedChanges.files.some(
      (f) => !this.isTestFile(f.path) && f.status === 'added',
    );

    if (hasNewTests && !hasNewImplementation) {
      return DevelopmentPhase.EXPLORATION;
    } else if (hasNewImplementation) {
      return DevelopmentPhase.IMPLEMENTATION;
    } else {
      return DevelopmentPhase.REFACTORING;
    }
  }

  private isTestFile(filePath: string): boolean {
    return (
      /\.(test|spec)\.(ts|js|py|rs|go)$/.test(filePath) ||
      /test_.*\.py$/.test(filePath) ||
      /_test\.(go|rs)$/.test(filePath)
    );
  }

  private calculateCoverage(testResults: TestResult[]): number {
    // Simplified coverage calculation
    if (testResults.length === 0) return 0;
    const passing = testResults.filter((test) => test.status === 'pass').length;
    return (passing / testResults.length) * 100;
  }

  private getInterventionLevel(actionType: string): InterventionLevel {
    switch (actionType) {
      case 'block':
        return InterventionLevel.BLOCKING;
      case 'warn':
        return InterventionLevel.WARNING;
      case 'guide':
        return InterventionLevel.COACHING;
      case 'allow':
        return InterventionLevel.SILENT;
      default:
        return InterventionLevel.COACHING;
    }
  }

  private generateQuickCoaching(): string {
    switch (this.currentState.current) {
      case TDDState.RED:
        return 'Write minimal code to make tests pass';
      case TDDState.GREEN:
        return 'All tests passing - safe to refactor or add new tests';
      case TDDState.REFACTOR:
        return 'Improve code structure while keeping tests green';
      case TDDState.UNCLEAR:
        return 'Start with a failing test to begin TDD cycle';
      default:
        return 'Follow TDD: Red → Green → Refactor';
    }
  }

  private async initializeTestWatching(): Promise<void> {
    try {
      await this.startTestWatching();
    } catch (error) {
      console.warn('Failed to initialize test watching:', error);
    }
  }

  private generateSessionId(): string {
    return `tdd-session-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  }
}

// Convenience factory function
export function createTDDCoach(options: TDDCoachOptions): TDDCoach {
  return new TDDCoach(options);
}
