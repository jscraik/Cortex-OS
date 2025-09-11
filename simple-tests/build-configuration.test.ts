import { spawn } from 'child_process';
import { expect, test } from 'vitest';

test('kernel package builds successfully with nx', async () => {
    const buildProcess = spawn('npx', ['nx', 'build', '@cortex-os/kernel'], {
        cwd: '.',
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
    expect(stdout).toContain('Successfully ran target build');

    // Should not have flag errors
    expect(stderr).not.toContain('Unknown option');
    expect(stderr).not.toContain('Unknown compiler option');
});
