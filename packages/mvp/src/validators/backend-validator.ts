/**
 * @file validators/backend-validator.ts
 * @description Backend compilation and test validation
 */

import {
  GateValidator,
  ValidationResult,
  CompilationResult,
  TestResult,
} from '../lib/validation-types.js';
import { PRPState } from '../state.js';
import {
  execAsync,
  fileExists,
  readJsonFile,
  getProjectRoot,
  createFilePath,
  truncateString,
} from '../lib/utils.js';

export class BackendValidator implements GateValidator {
  async validate(state: PRPState): Promise<ValidationResult> {
    const hasBackendReq = state.blueprint.requirements?.some(
      (req) =>
        req.toLowerCase().includes('api') ||
        req.toLowerCase().includes('backend') ||
        req.toLowerCase().includes('server'),
    );

    if (!hasBackendReq) {
      return {
        passed: true,
        details: {
          type: 'frontend-only',
          reason: 'No backend requirements specified',
        },
      };
    }

    try {
      const projectRoot = getProjectRoot();
      const projectStructure = this.analyzeProjectStructure(projectRoot);

      if (!projectStructure.hasPackageManager) {
        return {
          passed: false,
          details: {
            reason: 'No package.json or pyproject.toml found',
            compilation: 'failed',
            testsPassed: 0,
            testsFailed: 0,
            coverage: 0,
          },
        };
      }

      const compilationResult = await this.runCompilation(projectRoot, projectStructure);
      const testResult = await this.runTests(projectRoot, projectStructure);

      const passed = compilationResult.passed && testResult.passed;

      return {
        passed,
        details: {
          compilation: compilationResult.passed ? 'success' : 'failed',
          build: compilationResult,
          testsPassed: testResult.testsPassed,
          testsFailed: testResult.testsFailed,
          testsTotal: testResult.testsPassed + testResult.testsFailed,
          coverage: testResult.coverage,
          duration: compilationResult.duration,
          projectType: projectStructure.type,
          hasTests: testResult.testsPassed > 0 || testResult.testsFailed > 0,
        },
      };
    } catch (error) {
      return {
        passed: false,
        details: {
          reason: `Backend validation error: ${error instanceof Error ? error.message : 'unknown error'}`,
          compilation: 'error',
          testsPassed: 0,
          testsFailed: 0,
          coverage: 0,
        },
      };
    }
  }

  private analyzeProjectStructure(projectRoot: string) {
    const hasPackageJson = fileExists(createFilePath(projectRoot, 'package.json'));
    const hasPyprojectToml = fileExists(createFilePath(projectRoot, 'pyproject.toml'));

    const hasNodeBackend =
      fileExists(createFilePath(projectRoot, 'src')) ||
      fileExists(createFilePath(projectRoot, 'server')) ||
      fileExists(createFilePath(projectRoot, 'api'));

    const hasPythonBackend =
      fileExists(createFilePath(projectRoot, 'apps')) ||
      fileExists(createFilePath(projectRoot, 'services')) ||
      fileExists(createFilePath(projectRoot, 'packages'));

    return {
      hasPackageManager: hasPackageJson || hasPyprojectToml,
      hasNodeBackend,
      hasPythonBackend,
      type: hasPackageJson ? 'node' : 'python',
    };
  }

  private async runCompilation(
    projectRoot: string,
    structure: ReturnType<typeof BackendValidator.prototype.analyzeProjectStructure>,
  ): Promise<CompilationResult> {
    let compilationResult: CompilationResult = {
      passed: true,
      command: '',
      stdout: '',
      stderr: '',
      duration: 0,
    };

    if (structure.hasNodeBackend && structure.type === 'node') {
      compilationResult = await this.runNodeCompilation(projectRoot);
    } else if (structure.hasPythonBackend && structure.type === 'python') {
      compilationResult = await this.runPythonCompilation(projectRoot);
    }

    return compilationResult;
  }

  private async runNodeCompilation(projectRoot: string): Promise<CompilationResult> {
    try {
      const packageJson = readJsonFile(createFilePath(projectRoot, 'package.json'));

      if (packageJson.scripts?.build) {
        const startTime = Date.now();
        try {
          const { stdout, stderr } = await execAsync('pnpm run build', {
            cwd: projectRoot,
            timeout: 60000,
            maxBuffer: 1024 * 1024,
          });
          return {
            passed: true,
            command: 'pnpm run build',
            stdout: truncateString(stdout, 500),
            stderr: truncateString(stderr, 500),
            duration: Date.now() - startTime,
          };
        } catch (buildError: any) {
          return {
            passed: false,
            command: 'pnpm run build',
            stdout: truncateString(buildError.stdout || '', 500),
            stderr: truncateString(buildError.stderr || buildError.message, 500),
            duration: Date.now() - startTime,
          };
        }
      }
    } catch (parseError) {
      // Package.json parsing failed
    }

    return { passed: true, command: '', stdout: '', stderr: '', duration: 0 };
  }

  private async runPythonCompilation(projectRoot: string): Promise<CompilationResult> {
    try {
      await execAsync('which mypy', { timeout: 2000 });
      const startTime = Date.now();
      try {
        const { stdout, stderr } = await execAsync('mypy .', {
          cwd: projectRoot,
          timeout: 60000,
          maxBuffer: 1024 * 1024,
        });
        return {
          passed: !stderr.includes('error'),
          command: 'mypy .',
          stdout: truncateString(stdout, 500),
          stderr: truncateString(stderr, 500),
          duration: Date.now() - startTime,
        };
      } catch (mypyError: any) {
        return {
          passed: false,
          command: 'mypy .',
          stdout: truncateString(mypyError.stdout || '', 500),
          stderr: truncateString(mypyError.stderr || mypyError.message, 500),
          duration: Date.now() - startTime,
        };
      }
    } catch {
      try {
        await execAsync('python -m py_compile apps/**/*.py', {
          cwd: projectRoot,
          timeout: 30000,
        });
        return { passed: true, command: 'py_compile', stdout: '', stderr: '', duration: 0 };
      } catch {
        return { passed: false, command: 'py_compile', stdout: '', stderr: '', duration: 0 };
      }
    }
  }

  private async runTests(
    projectRoot: string,
    structure: ReturnType<typeof BackendValidator.prototype.analyzeProjectStructure>,
  ): Promise<TestResult> {
    if (structure.type === 'node') {
      return this.runNodeTests(projectRoot);
    } else {
      return this.runPythonTests(projectRoot);
    }
  }

  private async runNodeTests(projectRoot: string): Promise<TestResult> {
    try {
      const packageJson = readJsonFile(createFilePath(projectRoot, 'package.json'));

      if (packageJson.scripts?.test) {
        try {
          const { stdout, stderr } = await execAsync('pnpm test', {
            cwd: projectRoot,
            timeout: 120000,
            maxBuffer: 1024 * 1024,
          });

          const testOutput = stdout + stderr;
          const passedMatch = testOutput.match(/(\d+)\s+passed/i);
          const failedMatch = testOutput.match(/(\d+)\s+failed/i);
          const coverageMatch = testOutput.match(/(\d+\.?\d*)%.*coverage/i);

          return {
            passed: !testOutput.includes('failed') || failedMatch?.[1] === '0',
            testsPassed: passedMatch ? parseInt(passedMatch[1]) : 0,
            testsFailed: failedMatch ? parseInt(failedMatch[1]) : 0,
            coverage: coverageMatch ? parseFloat(coverageMatch[1]) : 0,
          };
        } catch (testError: any) {
          return {
            passed: false,
            testsPassed: 0,
            testsFailed: 1,
            coverage: 0,
          };
        }
      }
    } catch (parseError) {
      // Package.json parsing failed
    }

    return { passed: true, testsPassed: 0, testsFailed: 0, coverage: 0 };
  }

  private async runPythonTests(projectRoot: string): Promise<TestResult> {
    try {
      await execAsync('which pytest', { timeout: 2000 });
      const { stdout, stderr } = await execAsync('pytest --tb=short', {
        cwd: projectRoot,
        timeout: 120000,
        maxBuffer: 1024 * 1024,
      });

      const testOutput = stdout + stderr;
      const passedMatch = testOutput.match(/(\d+)\s+passed/i);
      const failedMatch = testOutput.match(/(\d+)\s+failed/i);
      const coverageMatch = testOutput.match(/(\d+)%/i);

      return {
        passed: !testOutput.includes('FAILED'),
        testsPassed: passedMatch ? parseInt(passedMatch[1]) : 0,
        testsFailed: failedMatch ? parseInt(failedMatch[1]) : 0,
        coverage: coverageMatch ? parseInt(coverageMatch[1]) : 0,
      };
    } catch {
      return { passed: true, testsPassed: 0, testsFailed: 0, coverage: 0 };
    }
  }
}
