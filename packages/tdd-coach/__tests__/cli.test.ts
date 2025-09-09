import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { resolve } from 'path';

describe('TDD Coach CLI', () => {
  const cliPath = resolve(__dirname, '../dist/cli/tdd-coach.js');
  
  it('should show help when run without arguments', async () => {
    const { stdout, stderr } = await runCLI([]);
    expect(stderr).toBe('');
    expect(stdout).toContain('Usage: tdd-coach [options] [command]');
  });

  it('should show version when --version flag is used', async () => {
    const { stdout, stderr } = await runCLI(['--version']);
    expect(stderr).toBe('');
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should show help for validate command', async () => {
    const { stdout, stderr } = await runCLI(['validate', '--help']);
    expect(stderr).toBe('');
    expect(stdout).toContain('validate');
    expect(stdout).toContain('Validate changes against TDD principles');
  });

  it('should show help for status command', async () => {
    const { stdout, stderr } = await runCLI(['status', '--help']);
    expect(stderr).toBe('');
    expect(stdout).toContain('status');
    expect(stdout).toContain('Get current TDD status');
  });

  it('should show help for run-tests command', async () => {
    const { stdout, stderr } = await runCLI(['run-tests', '--help']);
    expect(stderr).toBe('');
    expect(stdout).toContain('run-tests');
    expect(stdout).toContain('Run tests and update TDD state');
  });
});

function runCLI(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const cliProcess = spawn('node', [cliPath, ...args], {
      cwd: process.cwd(),
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    cliProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    cliProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    cliProcess.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code || 0,
      });
    });

    cliProcess.on('error', (error) => {
      reject(error);
    });
  });
}