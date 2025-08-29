/**
 * @file validators/security-scanner.ts
 * @description Security scanning with multiple tools (Semgrep, ESLint, Bandit)
 */

import { SecurityScanResult, SecurityVulnerability } from '../lib/validation-types.js';
import { PRPState } from '../state.js';
import {
  execAsync,
  fileExists,
  readJsonFile,
  getProjectRoot,
  createFilePath,
  getRelativePath,
} from '../lib/utils.js';

export class SecurityScanner {
  private readonly SCAN_TIMEOUT = 120000; // 2 minutes total timeout
  private readonly TOOL_TIMEOUT = 45000; // 45 seconds per tool

  async runSecurityScan(state: PRPState): Promise<SecurityScanResult> {
    const scanStartTime = Date.now();

    try {
      const projectRoot = getProjectRoot();
      let scanResults = { blockers: 0, majors: 0, vulnerabilities: [] as SecurityVulnerability[] };

      // Use Promise.allSettled to run scans in parallel with timeout
      const scanPromises = [
        this.runSemgrepScan(projectRoot),
        this.runESLintSecurityScan(projectRoot),
        this.runBanditScan(projectRoot),
      ];

      const timeoutPromise = new Promise<SecurityVulnerability[]>((_, reject) => {
        setTimeout(() => reject(new Error('Security scan timeout')), this.SCAN_TIMEOUT);
      });

      const results = await Promise.allSettled(
        scanPromises.map((p) => Promise.race([p, timeoutPromise])),
      );

      // Process results from parallel scans
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          scanResults.vulnerabilities.push(...result.value);
        } else {
          const toolNames = ['Semgrep', 'ESLint Security', 'Bandit'];
          scanResults.vulnerabilities.push({
            tool: toolNames[index].toLowerCase(),
            severity: 'info',
            type: 'scan_timeout',
            message: `${toolNames[index]} scan timed out or failed: ${result.reason}`,
            file: '',
            line: 0,
          });
        }
      });

      scanResults.blockers = scanResults.vulnerabilities.filter(
        (v) => v.severity === 'critical' || v.severity === 'high',
      ).length;
      scanResults.majors = scanResults.vulnerabilities.filter(
        (v) => v.severity === 'medium',
      ).length;

      if (
        scanResults.vulnerabilities.length === 0 ||
        this.hasOnlyInfoMessages(scanResults.vulnerabilities)
      ) {
        const basicFindings = await this.runBasicSecurityChecks(projectRoot);
        scanResults.vulnerabilities.push(...basicFindings);
        scanResults.majors += basicFindings.filter((f) => f.severity === 'medium').length;
        scanResults.blockers += basicFindings.filter((f) => f.severity === 'high').length;
      }

      const tools = this.identifyActiveTools(scanResults.vulnerabilities);

      return {
        blockers: scanResults.blockers,
        majors: scanResults.majors,
        details: {
          tools,
          vulnerabilities: scanResults.vulnerabilities,
          summary: {
            total: scanResults.vulnerabilities.length,
            critical: scanResults.vulnerabilities.filter((v) => v.severity === 'critical').length,
            high: scanResults.vulnerabilities.filter((v) => v.severity === 'high').length,
            medium: scanResults.vulnerabilities.filter((v) => v.severity === 'medium').length,
            low: scanResults.vulnerabilities.filter((v) => v.severity === 'low').length,
            info: scanResults.vulnerabilities.filter((v) => v.severity === 'info').length,
          },
        },
      };
    } catch (error) {
      return {
        blockers: 0,
        majors: 1,
        details: {
          tools: ['Error'],
          error: error instanceof Error ? error.message : 'Unknown security scan error',
          vulnerabilities: [
            {
              tool: 'system',
              severity: 'medium',
              type: 'scan_error',
              message: 'Security scan could not be completed',
              file: '',
              line: 0,
            },
          ],
          summary: {
            total: 1,
            critical: 0,
            high: 0,
            medium: 1,
            low: 0,
            info: 0,
          },
        },
      };
    }
  }

  private async runSemgrepScan(projectRoot: string): Promise<SecurityVulnerability[]> {
    try {
      await execAsync('which semgrep', { timeout: 2000 });

      const semgrepDir = createFilePath(projectRoot, '.semgrep');
      const useLocalRules = fileExists(semgrepDir);
      const semgrepCmd = useLocalRules
        ? 'semgrep --quiet --json --config .semgrep'
        : 'semgrep --quiet --json --config auto';

      try {
        const { stdout } = await execAsync(semgrepCmd, {
          cwd: projectRoot,
          timeout: this.TOOL_TIMEOUT,
          maxBuffer: 2 * 1024 * 1024,
        });

        if (stdout.trim()) {
          const results = JSON.parse(stdout);
          const findings = results.results || [];

          return findings.map((finding: any) => {
            const severity = this.mapSemgrepSeverity(finding.extra?.severity || 'INFO');
            return {
              tool: 'semgrep',
              severity,
              type: finding.check_id?.split('.').pop() || 'unknown',
              ruleId: finding.check_id,
              message: finding.extra?.message || 'Security vulnerability detected',
              file: getRelativePath(projectRoot, finding.path || ''),
              line: finding.start?.line || 0,
              column: finding.start?.col || 0,
              code: finding.extra?.lines || '',
              confidence: finding.extra?.metadata?.confidence || 'MEDIUM',
            };
          });
        }
      } catch (semgrepError: any) {
        console.warn('Semgrep scan failed:', semgrepError.message);
        return [
          {
            tool: 'semgrep',
            severity: 'info',
            type: 'scan_error',
            message: `Semgrep scan failed: ${semgrepError.message}`,
            file: '',
            line: 0,
          },
        ];
      }
    } catch (semgrepNotFound) {
      console.warn('Semgrep not found:', semgrepNotFound);
      return [
        {
          tool: 'semgrep',
          severity: 'info',
          type: 'not_available',
          message: 'Semgrep not available on PATH; skipping Semgrep scan',
          file: '',
          line: 0,
        },
      ];
    }

    return [];
  }

  private async runESLintSecurityScan(projectRoot: string): Promise<SecurityVulnerability[]> {
    try {
      if (fileExists(createFilePath(projectRoot, 'package.json'))) {
        const packageJson = readJsonFile(createFilePath(projectRoot, 'package.json'));
        const hasSecurityPlugin =
          packageJson.dependencies?.['eslint-plugin-security'] ||
          packageJson.devDependencies?.['eslint-plugin-security'];

        if (hasSecurityPlugin) {
          const { stdout } = await execAsync('npx eslint --format json --ext .js,.ts,.jsx,.tsx .', {
            cwd: projectRoot,
            timeout: this.TOOL_TIMEOUT,
            maxBuffer: 1024 * 1024,
          }).catch(() => ({ stdout: '[]' }));

          const eslintResults = JSON.parse(stdout || '[]');
          return (eslintResults || []).flatMap((result: any) =>
            (result.messages || [])
              .filter((msg: any) => msg.ruleId?.includes('security'))
              .map((msg: any) => ({
                tool: 'eslint-security',
                severity: msg.severity === 2 ? 'medium' : 'low',
                type: msg.ruleId,
                message: msg.message,
                file: getRelativePath(projectRoot, result.filePath),
                line: msg.line,
                column: msg.column,
              })),
          );
        }
      }
    } catch (eslintError: any) {
      return [
        {
          tool: 'eslint',
          severity: 'info',
          type: 'scan_error',
          message: `ESLint security scan failed: ${eslintError?.message || String(eslintError)}`,
          file: '',
          line: 0,
        },
      ];
    }

    return [];
  }

  private async runBanditScan(projectRoot: string): Promise<SecurityVulnerability[]> {
    try {
      if (
        fileExists(createFilePath(projectRoot, 'pyproject.toml')) ||
        fileExists(createFilePath(projectRoot, 'requirements.txt'))
      ) {
        await execAsync('which bandit', { timeout: 2000 });

        const { stdout } = await execAsync('bandit -r . -f json', {
          cwd: projectRoot,
          timeout: this.TOOL_TIMEOUT,
          maxBuffer: 1024 * 1024,
        }).catch(() => ({ stdout: '{"results": []}' }));

        const banditResults = JSON.parse(stdout);
        return (banditResults.results || []).map((finding: any) => ({
          tool: 'bandit',
          severity: this.mapBanditSeverity(finding.issue_severity),
          type: finding.test_id,
          message: finding.issue_text,
          file: getRelativePath(projectRoot, finding.filename || ''),
          line: finding.line_number || 0,
          column: 0,
          confidence: finding.issue_confidence,
        }));
      }
    } catch (banditError: any) {
      return [
        {
          tool: 'bandit',
          severity: 'info',
          type: 'not_available',
          message: `Bandit unavailable or failed: ${banditError?.message || String(banditError)}`,
          file: '',
          line: 0,
        },
      ];
    }

    return [];
  }

  private async runBasicSecurityChecks(projectRoot: string): Promise<SecurityVulnerability[]> {
    const findings: SecurityVulnerability[] = [];

    try {
      const glob = await import('glob');
      const patterns = ['**/*.js', '**/*.ts', '**/*.py', '**/*.jsx', '**/*.tsx'];

      for (const pattern of patterns) {
        const files = await glob.glob(pattern, {
          cwd: projectRoot,
          ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
        });

        for (const file of files.slice(0, 50)) {
          const fileFindings = await this.checkFileForSecurityIssues(projectRoot, file);
          findings.push(...fileFindings);
        }
      }
    } catch (error) {
      console.debug('Basic security checks failed:', error);
    }

    return findings.slice(0, 10);
  }

  private async checkFileForSecurityIssues(
    projectRoot: string,
    relativePath: string,
  ): Promise<SecurityVulnerability[]> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      const filePath = path.join(projectRoot, relativePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const findings: SecurityVulnerability[] = [];

      const secretPatterns = [
        /password\s*=\s*['"]\w+['"]/i,
        /api[_-]?key\s*=\s*['"]\w+['"]/i,
        /secret\s*=\s*['"]\w+['"]/i,
        /token\s*=\s*['"]\w+['"]/i,
      ];

      const sqlPatterns = [/query\s*\+\s*['"]/i, /execute\s*\([^)]*\+/i];

      lines.forEach((line, index) => {
        secretPatterns.forEach((pattern) => {
          if (pattern.test(line) && !line.includes('process.env') && !line.includes('config')) {
            findings.push({
              tool: 'basic-check',
              severity: 'high',
              type: 'hardcoded_secret',
              message: 'Potential hardcoded secret detected',
              file: relativePath,
              line: index + 1,
              code: line.trim(),
            });
          }
        });

        sqlPatterns.forEach((pattern) => {
          if (pattern.test(line)) {
            findings.push({
              tool: 'basic-check',
              severity: 'medium',
              type: 'sql_injection',
              message: 'Potential SQL injection vulnerability',
              file: relativePath,
              line: index + 1,
              code: line.trim(),
            });
          }
        });
      });

      return findings;
    } catch (error) {
      console.debug('Basic security check: failed to read file', relativePath, error);
      return [];
    }
  }

  private mapSemgrepSeverity(severity: string): SecurityVulnerability['severity'] {
    switch (severity.toUpperCase()) {
      case 'ERROR':
      case 'CRITICAL':
        return 'critical';
      case 'WARNING':
      case 'HIGH':
        return 'high';
      case 'INFO':
      case 'MEDIUM':
        return 'medium';
      case 'LOW':
        return 'low';
      default:
        return 'info';
    }
  }

  private mapBanditSeverity(severity: string): SecurityVulnerability['severity'] {
    switch (severity.toUpperCase()) {
      case 'HIGH':
        return 'high';
      case 'MEDIUM':
        return 'medium';
      case 'LOW':
        return 'low';
      default:
        return 'info';
    }
  }

  private hasOnlyInfoMessages(vulnerabilities: SecurityVulnerability[]): boolean {
    return vulnerabilities.every((v) => v.severity === 'info');
  }

  private identifyActiveTools(vulnerabilities: SecurityVulnerability[]): string[] {
    const toolsUsed = new Set(vulnerabilities.map((v) => v.tool));
    const tools = [];

    if (toolsUsed.has('semgrep')) tools.push('Semgrep');
    if (toolsUsed.has('eslint-security')) tools.push('ESLint Security');
    if (toolsUsed.has('bandit')) tools.push('Bandit');
    if (toolsUsed.has('basic-check')) tools.push('Basic Checks');

    return tools.length > 0 ? tools : ['Basic Checks'];
  }
}
