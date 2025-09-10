import { test, expect } from 'vitest';
import { spawn } from 'child_process';

test('kernel package builds without invalid flag errors', async () => {
  const buildProcess = spawn('npx', ['tsc'], {
    cwd: './packages/kernel',
    stdio: 'pipe'
  });
  
  let stderr = '';
  let stdout = '';
  
  buildProcess.stdout.on('data', (data) => {
    stdout += data.toString();
  });
  
  buildProcess.stderr.on('data', (data) => {
    stderr += data.toString();
  });
  
  const exitCode = await new Promise((resolve) => {
    buildProcess.on('close', resolve);
  });
  
  expect(exitCode).toBe(0);
  
  // Should not have invalid flag errors
  expect(stderr).not.toContain('Unknown option');
  expect(stderr).not.toContain('Unknown compiler option');
  expect(stdout).not.toContain('error TS');
});