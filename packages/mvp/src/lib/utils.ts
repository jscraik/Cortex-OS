import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { generateId } from '../utils/id.js';

export const execAsync = promisify(exec);

export function createFilePath(...segments: string[]): string {
  return path.join(...segments);
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function readJsonFile<T = any>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function getBasename(filePath: string): string {
  return path.basename(filePath);
}

export function getProjectRoot(): string {
  return process.cwd();
}

export function getRelativePath(root: string, target: string): string {
  return path.relative(root, target);
}

export function truncateString(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

export function generateEvidenceId(prefix: string): string {
  return generateId(prefix, true);
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
