import { spawn } from 'child_process';
import type { PythonRunner } from '../ports/PythonRunner.js';

export class NodePythonRunner implements PythonRunner {
  async run(path: string, args: string[], options: Record<string, unknown> = {}): Promise<string> {
    return await new Promise((resolve, reject) => {
      const exe = typeof options.python === 'string' ? (options.python as string) : 'python3';
      // Allow typical path characters: word, dot, dash, slash, backslash, colon, space
      // Disallow dangerous shell metacharacters
      if (!/^[\w.\-\\/:\s]+$/.test(exe) || /[;&|`$<>]/.test(exe)) {
        return reject(new Error('invalid python path'));
      }
      /* nosemgrep javascript.lang.security.detect-child-process.detect-child-process */
      const proc = spawn(exe, [path, ...args], {
        env: { ...process.env, ...(options.envOverrides as any) },
      });
      const chunks: Buffer[] = [];
      const errs: Buffer[] = [];
      proc.stdout.on('data', (c: Buffer) => chunks.push(Buffer.from(c)));
      proc.stderr.on('data', (c: Buffer) => errs.push(Buffer.from(c)));
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) resolve(Buffer.concat(chunks).toString('utf8'));
        else reject(new Error(Buffer.concat(errs).toString('utf8')));
      });
    });
  }
}
