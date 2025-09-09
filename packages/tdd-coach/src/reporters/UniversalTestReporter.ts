import type { TestResult } from '../types/TDDTypes.js';
import type { TestReporter, TestRunConfiguration } from './BaseTestReporter.js';
import {
  GoTestReporter,
  JestReporter,
  PytestReporter,
  RustTestReporter,
} from './LanguageReporters.js';
import { VitestReporter } from './VitestReporter.js';

export class UniversalTestReporter {
  private reporters: Map<string, TestReporter> = new Map();
  private activeWatchers: Map<string, () => Promise<void>> = new Map();

  constructor(private config: TestRunConfiguration) {
    this.initializeReporters();
  }

  private initializeReporters(): void {
    // Register all built-in reporters
    this.registerReporter(new VitestReporter(this.config));
    this.registerReporter(new PytestReporter(this.config));
    this.registerReporter(new RustTestReporter(this.config));
    this.registerReporter(new JestReporter(this.config));
    this.registerReporter(new GoTestReporter(this.config));
  }

  registerReporter(reporter: TestReporter): void {
    this.reporters.set(reporter.name, reporter);
  }

  async detectReporter(filePath: string): Promise<TestReporter | null> {
    for (const [, reporter] of this.reporters) {
      if (reporter.detectsTestFiles(filePath)) {
        return reporter;
      }
    }
    return null;
  }

  async runAllTests(): Promise<Map<string, TestResult[]>> {
    const results = new Map<string, TestResult[]>();

    for (const [name, reporter] of this.reporters) {
      try {
        const testResults = await reporter.runTests();
        if (testResults.length > 0) {
          results.set(name, testResults);
        }
      } catch (error) {
        console.warn(`Failed to run tests with ${name}:`, error);
        results.set(name, [
          {
            id: `${name}-error`,
            name: `${name} Test Runner Error`,
            status: 'fail',
            duration: 0,
            file: 'unknown',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ]);
      }
    }

    return results;
  }

  async runTestsForFile(filePath: string): Promise<TestResult[]> {
    const reporter = await this.detectReporter(filePath);
    if (!reporter) {
      throw new Error(`No test reporter found for file: ${filePath}`);
    }

    return reporter.runTests([filePath]);
  }

  async startWatching(
    callback: (results: Map<string, TestResult[]>) => void,
  ): Promise<void> {
    for (const [name, reporter] of this.reporters) {
      if (reporter.watchTests) {
        try {
          await reporter.watchTests((results) => {
            const allResults = new Map([[name, results]]);
            callback(allResults);
          });

          if (reporter.killWatcher) {
            this.activeWatchers.set(name, reporter.killWatcher.bind(reporter));
          }
        } catch (error) {
          console.warn(`Failed to start watcher for ${name}:`, error);
        }
      }
    }
  }

  async stopWatching(): Promise<void> {
    for (const [name, killWatcher] of this.activeWatchers) {
      try {
        await killWatcher();
      } catch (error) {
        console.warn(`Failed to stop watcher for ${name}:`, error);
      }
    }
    this.activeWatchers.clear();
  }

  getReporterInfo(): Array<{
    name: string;
    language: string;
    available: boolean;
  }> {
    return Array.from(this.reporters.values()).map((reporter) => ({
      name: reporter.name,
      language: reporter.language,
      available: true, // Could add health checks here
    }));
  }
}
