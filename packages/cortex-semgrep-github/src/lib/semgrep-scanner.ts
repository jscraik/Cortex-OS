import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

export interface SecurityScanResult {
  ruleId: string;
  message: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  file: string;
  startLine?: number;
  endLine?: number;
  evidence: string;
  tags: Record<string, unknown>;
}

const SAFE_BIN_DIRS = ['/usr/bin', '/usr/local/bin', '/opt/homebrew/bin'];

async function resolveBinary(binName: 'git' | 'semgrep'): Promise<string> {
  for (const dir of SAFE_BIN_DIRS) {
    const candidate = join(dir, binName);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // continue
    }
  }
  throw new Error(`Required binary not found in safe paths: ${binName}`);
}

async function runSemgrepAnalysis(
  semgrepBin: string,
  targetDir: string,
): Promise<string> {
  const rulesets = ['auto', 'security-audit', 'owasp-top-ten'];

  return new Promise((resolve, reject) => {
    const semgrep = spawn(
      semgrepBin,
      ['--config', rulesets.join(','), '--json', '--quiet', '--timeout', '300', '--max-target-bytes', '10MB', '.'],
      {
        cwd: targetDir,
        stdio: 'pipe',
        timeout: 300000,
      },
    );

    let stdout = '';
    let stderr = '';

    semgrep.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    semgrep.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    semgrep.on('close', (code) => {
      if (code === 0 || code === 1) {
        resolve(stdout);
      } else {
        reject(new Error(`Semgrep failed with code ${code}: ${stderr}`));
      }
    });

    semgrep.on('error', (error) => {
      reject(new Error(`Semgrep execution error: ${error.message}`));
    });
  });
}

async function cloneRepository(owner: string, repo: string, sha: string): Promise<string> {
  const ownerPattern = /^[a-zA-Z0-9_.-]{1,39}$/;
  const repoPattern = /^[a-zA-Z0-9_.-]{1,100}$/;
  const shaPattern = /^[a-fA-F0-9]{40}$/;

  if (!ownerPattern.test(owner)) {
    throw new Error(`Invalid owner format: ${owner}`);
  }
  if (!repoPattern.test(repo)) {
    throw new Error(`Invalid repository name format: ${repo}`);
  }
  if (!shaPattern.test(sha)) {
    throw new Error(`Invalid SHA format: ${sha}`);
  }

  const suspiciousPatterns = ['..', '//', '\\', '$', '`', ';', '|', '&'];
  for (const input of [owner, repo]) {
    for (const pattern of suspiciousPatterns) {
      if (input.includes(pattern)) {
        throw new Error(`Input contains suspicious pattern: ${pattern}`);
      }
    }
  }

  const tempDir = `/tmp/semgrep-scan-${Date.now()}-${require('node:crypto').randomUUID()}`;
  await fs.mkdir(tempDir, { recursive: true });

  const gitBin = await resolveBinary('git');
  const repoUrl = `https://github.com/${owner}/${repo}.git`;

  return new Promise((resolve, reject) => {
    const clone = spawn(gitBin, ['clone', '--depth', '1', repoUrl, tempDir], {
      stdio: 'pipe',
    });

    const timeout = setTimeout(() => {
      clone.kill('SIGTERM');
      reject(new Error('Clone timeout exceeded'));
    }, 300000);

    let stderr = '';
    clone.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    clone.on('close', (code) => {
      clearTimeout(timeout);

      if (code === 0) {
        const checkout = spawn(gitBin, ['checkout', sha], {
          cwd: tempDir,
          stdio: 'pipe',
        });

        const checkoutTimeout = setTimeout(() => {
          checkout.kill('SIGTERM');
          reject(new Error('Checkout timeout exceeded'));
        }, 60000);

        let checkoutStderr = '';
        checkout.stderr?.on('data', (data) => {
          checkoutStderr += data.toString();
        });

        checkout.on('close', (checkoutCode) => {
          clearTimeout(checkoutTimeout);
          if (checkoutCode === 0) {
            resolve(tempDir);
          } else {
            reject(new Error(`Checkout failed: ${checkoutStderr}`));
          }
        });

        checkout.on('error', (error) => {
          clearTimeout(checkoutTimeout);
          reject(new Error(`Checkout error: ${error.message}`));
        });
      } else {
        reject(new Error(`Clone failed: ${stderr}`));
      }
    });

    clone.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Clone error: ${error.message}`));
    });
  });
}

function mapSemgrepSeverity(severity: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  switch (severity.toUpperCase()) {
    case 'ERROR':
      return 'HIGH';
    case 'WARNING':
      return 'MEDIUM';
    default:
      return 'LOW';
  }
}

export async function runSemgrepScan(
  owner: string,
  repo: string,
  sha: string,
): Promise<SecurityScanResult[]> {
  try {
    console.warn(`Running Semgrep scan for ${owner}/${repo} at ${sha}`);
    const tempDir = await cloneRepository(owner, repo, sha);
    try {
      const semgrepBin = await resolveBinary('semgrep');
      const semgrepOutput = await runSemgrepAnalysis(semgrepBin, tempDir);
      const semgrepData = JSON.parse(semgrepOutput);
      const results: SecurityScanResult[] =
        semgrepData.results?.map(
          (result: {
            check_id: string;
            message?: string;
            extra?: {
              message?: string;
              severity?: string;
              lines?: string;
              metadata?: Record<string, unknown>;
            };
            path: string;
            start?: { line: number };
            end?: { line: number };
          }) => ({
            ruleId: result.check_id,
            message:
              result.extra?.message ||
              result.message ||
              'Security issue detected',
            severity: mapSemgrepSeverity(result.extra?.severity || 'INFO'),
            file: result.path.replace(`${tempDir}/`, ''),
            startLine: result.start?.line,
            endLine: result.end?.line,
            evidence: result.extra?.lines || '',
            tags: result.extra?.metadata || {},
          }),
        ) || [];

      return results;
    } finally {
      fs.rm(tempDir, { recursive: true, force: true }).catch((error) =>
        console.error('Cleanup error:', error),
      );
    }
  } catch (error) {
    console.error('Semgrep scan failed:', error);
    return [];
  }
}

