/**
 * @file Mock child process for testing
 * @description Mock implementation of ProcessLike interface for unit tests
 */

import { EventEmitter } from 'events';
import { Readable, Writable } from 'stream';
import { ProcessLike } from '../../src/lib/child-process-factory.js';

export class MockProcess extends EventEmitter implements ProcessLike {
  stdin: Writable | null;
  stdout: Readable | null;
  stderr: Readable | null;
  pid?: number;
  killed = false;

  private _exitCode: number | null = null;
  private _signal: string | null = null;

  constructor() {
    super();

    this.stdin = new Writable({
      write: (chunk, encoding, callback) => {
        this.emit('stdin-data', chunk.toString());
        callback();
      },
    });

    this.stdout = new Readable({ read() {} });
    this.stderr = new Readable({ read() {} });
    this.pid = 12345;
  }

  kill(signal?: string): boolean {
    if (this.killed) return false;

    this.killed = true;
    this._signal = signal || 'SIGTERM';

    // Simulate async process termination
    setTimeout(() => {
      this.emit('exit', this._exitCode, this._signal);
      this.emit('close', this._exitCode, this._signal);
    }, 10);

    return true;
  }

  // Test utilities
  simulateStdout(data: string): void {
    if (this.stdout) {
      this.stdout.push(data);
    }
  }

  simulateStderr(data: string): void {
    if (this.stderr) {
      this.stderr.push(data);
    }
  }

  simulateExit(code: number, signal?: string): void {
    this._exitCode = code;
    this._signal = signal || null;
    this.killed = true;
    this.emit('exit', code, signal);
  }

  simulateError(error: Error): void {
    this.emit('error', error);
  }

  simulateReady(): void {
    this.simulateStdout('BRIDGE_READY\n');
  }

  getStdinData(): string[] {
    const data: string[] = [];
    this.on('stdin-data', (chunk: string) => data.push(chunk));
    return data;
  }
}
