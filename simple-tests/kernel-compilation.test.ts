import { test, expect } from 'vitest';
import { spawn } from 'child_process';

test('kernel package compiles without TypeScript errors', async () => {
  const tscProcess = spawn('npx', ['tsc', '--noEmit'], {
    cwd: './packages/kernel',
    stdio: 'pipe'
  });
  
  let stderr = '';
  let stdout = '';
  
  tscProcess.stdout.on('data', (data) => {
    stdout += data.toString();
  });
  
  tscProcess.stderr.on('data', (data) => {
    stderr += data.toString();
  });
  
  const exitCode = await new Promise((resolve) => {
    tscProcess.on('close', resolve);
  });
  
  expect(exitCode).toBe(0);
  expect(stderr).toBe('');
  
  // Should have no compilation errors
  expect(stdout).not.toContain('error TS');
});