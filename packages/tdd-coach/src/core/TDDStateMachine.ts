import {
  type ChangeSet,
  type DevelopmentContext,
  TDDState,
  type TDDStateData,
  type TestResult,
  type ValidationResult,
} from '../types/TDDTypes.js';

export interface StateTransition {
  from: TDDState;
  to: TDDState;
  condition: (context: TDDValidationContext) => boolean;
  action: (context: TDDValidationContext) => Promise<void>;
}

export interface TDDValidationContext {
  currentState: TDDStateData;
  proposedChange: ChangeSet;
  testResults: TestResult[];
  developmentContext: DevelopmentContext;
}

export class TDDStateMachine {
  private stateData: TDDStateData;
  private transitions: StateTransition[];

  constructor(initialState: TDDStateData) {
    this.stateData = initialState;
    this.transitions = this.defineTransitions();
  }

  private defineTransitions(): StateTransition[] {
    return [
      {
        from: TDDState.RED,
        to: TDDState.GREEN,
        condition: (ctx) => {
          // Can transition to GREEN when:
          // 1. All tests are now passing
          // 2. The change is minimal and targeted
          const allTestsPass = ctx.testResults.every(
            (test) => test.status === 'pass',
          );
          const changeIsMinimal = this.validateMinimalChange(
            ctx.proposedChange,
            ctx.currentState.failingTests,
          );
          return allTestsPass && changeIsMinimal;
        },
        action: async (_ctx) => {
          await this.unlockImplementationFiles(
            _ctx.proposedChange.files.map((f) => f.path),
          );
          this.logTransition(
            'RED → GREEN: Tests passing with minimal implementation',
          );
        },
      },
      {
        from: TDDState.GREEN,
        to: TDDState.REFACTOR,
        condition: (ctx) => {
          // Can transition to REFACTOR when:
          // 1. All tests still pass
          // 2. No new functionality being added
          const allTestsPass = ctx.testResults.every(
            (test) => test.status === 'pass',
          );
          const noNewFunctionality = this.isRefactorOnly(ctx.proposedChange);
          return allTestsPass && noNewFunctionality;
        },
        action: async (_ctx) => {
          await this.enableRefactorMode();
          this.logTransition(
            'GREEN → REFACTOR: Safe to improve code structure',
          );
        },
      },
      {
        from: TDDState.REFACTOR,
        to: TDDState.RED,
        condition: (ctx) => {
          // Return to RED when:
          // 1. New test is added
          // 2. New functionality is being implemented
          const newTestAdded = this.detectNewTest(ctx.proposedChange);
          const newFunctionality = this.detectNewFunctionality(
            ctx.proposedChange,
          );
          return newTestAdded || newFunctionality;
        },
        action: async (_ctx) => {
          await this.lockImplementationFiles();
          this.logTransition('REFACTOR → RED: New feature development started');
        },
      },
      {
        from: TDDState.UNCLEAR,
        to: TDDState.RED,
        condition: (ctx) => {
          // Move to RED when developer writes a failing test
          const hasFailingTest = ctx.testResults.some(
            (test) => test.status === 'fail',
          );
          const isTestFile = ctx.proposedChange.files.some((f) =>
            this.isTestFile(f.path),
          );
          return hasFailingTest && isTestFile;
        },
        action: async (ctx) => {
          await this.initiateTDDCycle();
          this.logTransition(
            'UNCLEAR → RED: TDD cycle initiated with failing test',
          );
        },
      },
    ];
  }

  async validateTransition(
    context: TDDValidationContext,
  ): Promise<ValidationResult> {
    const currentState = this.stateData.current;

    // Find applicable transitions
    const possibleTransitions = this.transitions.filter(
      (t) => t.from === currentState,
    );

    for (const transition of possibleTransitions) {
      if (transition.condition(context)) {
        // Valid transition - execute action
        await transition.action(context);
        this.stateData.current = transition.to;
        this.stateData.timestamp = new Date().toISOString();

        return {
          approved: true,
          reason: `Valid TDD transition: ${transition.from} → ${transition.to}`,
        };
      }
    }

    // No valid transition found - provide coaching
    return this.generateCoachingGuidance(context);
  }

  private generateCoachingGuidance(
    context: TDDValidationContext,
  ): ValidationResult {
    const currentState = this.stateData.current;

    switch (currentState) {
      case TDDState.RED:
        return this.validateRedPhaseChange(context);
      case TDDState.GREEN:
        return this.validateGreenPhaseChange(context);
      case TDDState.REFACTOR:
        return this.validateRefactorChange(context);
      case TDDState.UNCLEAR:
        return this.validateUnclearPhaseChange(context);
      default:
        return {
          approved: false,
          reason: 'Unknown TDD state - please start with a failing test',
        };
    }
  }

  private validateRedPhaseChange(
    context: TDDValidationContext,
  ): ValidationResult {
    const { proposedChange } = context;

    // RED phase: Only test files should be modified
    const nonTestFiles = proposedChange.files.filter(
      (file) => !this.isTestFile(file.path),
    );

    if (nonTestFiles.length > 0) {
      return {
        approved: false,
        reason: 'RED phase: Cannot modify implementation files',
        suggestion: 'Write failing tests first, then implement',
        blockedFiles: nonTestFiles.map((f) => f.path),
      };
    }

    // Validate that new tests actually fail
    const hasFailingTests = context.testResults.some(
      (test) => test.status === 'fail',
    );
    if (!hasFailingTests) {
      return {
        approved: false,
        reason: 'RED phase: Tests must fail before implementation',
        suggestion:
          'Write a test that fails for the feature you want to implement',
      };
    }

    return {
      approved: true,
      reason: 'Valid RED phase: Writing failing tests',
    };
  }

  private validateGreenPhaseChange(
    context: TDDValidationContext,
  ): ValidationResult {
    const { proposedChange, testResults } = context;

    // GREEN phase: Implementation changes must be minimal and targeted
    const failingTests = testResults.filter((test) => test.status === 'fail');

    if (failingTests.length === 0) {
      return {
        approved: false,
        reason: 'GREEN phase: No failing tests to make pass',
        suggestion: 'Add a failing test first, or move to REFACTOR phase',
      };
    }

    const minimality = this.checkMinimality(proposedChange, failingTests);
    if (!minimality.isMinimal) {
      return {
        approved: false,
        reason: 'GREEN phase: Change is not minimal',
        suggestion: minimality.suggestion,
        overImplementation: minimality.excessLines,
      };
    }

    return {
      approved: true,
      reason: 'Valid GREEN phase: Minimal implementation to make tests pass',
    };
  }

  private validateRefactorChange(
    context: TDDValidationContext,
  ): ValidationResult {
    const { proposedChange, testResults } = context;

    // REFACTOR phase: All tests must remain green
    const failingTests = testResults.filter((test) => test.status === 'fail');
    if (failingTests.length > 0) {
      return {
        approved: false,
        reason: 'REFACTOR phase: Tests are failing',
        suggestion: 'Fix failing tests before refactoring',
      };
    }

    // Must be refactoring, not new functionality
    if (!this.isRefactorOnly(proposedChange)) {
      return {
        approved: false,
        reason: 'REFACTOR phase: Cannot add new functionality',
        suggestion: 'Write a failing test first for new features',
      };
    }

    return {
      approved: true,
      reason: 'Valid REFACTOR phase: Improving code while keeping tests green',
    };
  }

  private validateUnclearPhaseChange(
    _context: TDDValidationContext,
  ): ValidationResult {
    return {
      approved: false,
      reason: 'TDD state unclear - please start with a failing test',
      suggestion:
        'Write a test that fails for the feature you want to implement',
    };
  }

  // Helper methods
  private validateMinimalChange(
    change: ChangeSet,
    _failingTests: TestResult[],
  ): boolean {
    // Implementation: Check if change is minimal relative to failing tests
    // This would analyze code coverage and change scope
    return change.totalChanges < 50; // Simplified for now
  }

  private isRefactorOnly(change: ChangeSet): boolean {
    // Implementation: Analyze if changes are purely structural
    // Look for patterns like variable renames, method extractions, etc.
    return !change.files.some((f) => f.linesAdded > f.linesDeleted * 1.2);
  }

  private detectNewTest(change: ChangeSet): boolean {
    return change.files.some(
      (f) =>
        (this.isTestFile(f.path) && f.status === 'added') ||
        (f.status === 'modified' && f.linesAdded > 0),
    );
  }

  private detectNewFunctionality(change: ChangeSet): boolean {
    return change.files.some(
      (f) => !this.isTestFile(f.path) && f.linesAdded > 0,
    );
  }

  private isTestFile(path: string): boolean {
    return (
      /\.(test|spec)\.(ts|js|py|rs)$/.test(path) ||
      /test_.*\.py$/.test(path) ||
      /.*_test\.(go|rs)$/.test(path)
    );
  }

  private checkMinimality(
    change: ChangeSet,
    _failingTests: TestResult[],
  ): {
    isMinimal: boolean;
    suggestion: string;
    excessLines?: string[];
  } {
    // Simplified minimality check
    if (change.totalChanges > 100) {
      return {
        isMinimal: false,
        suggestion:
          'Break this into smaller changes - make one test pass at a time',
        excessLines: change.files
          .filter((f) => f.linesAdded > 20)
          .map((f) => f.path),
      };
    }

    return {
      isMinimal: true,
      suggestion: 'Change looks appropriately minimal',
    };
  }

  // State management methods
  async unlockImplementationFiles(files: string[]): Promise<void> {
    // Implementation: Grant write permissions to specific files
    console.log(`Unlocking implementation files: ${files.join(', ')}`);
  }

  async enableRefactorMode(): Promise<void> {
    // Implementation: Enable broader file access for refactoring
    console.log(
      'Enabling refactor mode - all files unlocked for structural changes',
    );
  }

  async lockImplementationFiles(): Promise<void> {
    // Implementation: Restrict write access to test files only
    console.log('Locking implementation files - test-only mode active');
  }

  async initiateTDDCycle(): Promise<void> {
    // Implementation: Set up new TDD cycle
    console.log('Initiating new TDD cycle');
  }

  private logTransition(message: string): void {
    console.log(`[TDD State Machine] ${message}`);
  }

  // Public getters
  getCurrentState(): TDDStateData {
    return { ...this.stateData };
  }

  getStateHistory(): string[] {
    // Implementation: Return state transition history
    return [];
  }
}
