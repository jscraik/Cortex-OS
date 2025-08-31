/**
 * XDG Base Directory Specification Implementation for ASBR
 * Manages config, data, state, and cache directories according to the blueprint
 */

import { constants } from 'fs';
import { access, mkdir, stat } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { logWarn } from '../lib/logger.js';
import type { XDGPaths } from '../types/index.js';

/**
 * Get XDG base directories with ASBR-specific subdirectories
 */
export function getXDGPaths(): XDGPaths {
  const home = homedir();

  // Use XDG environment variables or fallback to defaults
  const configHome = process.env.XDG_CONFIG_HOME || join(home, '.config');
  const dataHome = process.env.XDG_DATA_HOME || join(home, '.local', 'share');
  const stateHome = process.env.XDG_STATE_HOME || join(home, '.local', 'state');
  const cacheHome = process.env.XDG_CACHE_HOME || join(home, '.cache');

  return {
    config: join(configHome, 'cortex', 'asbr'),
    data: join(dataHome, 'cortex', 'asbr'),
    state: join(stateHome, 'cortex', 'asbr'),
    cache: join(cacheHome, 'cortex', 'asbr'),
  };
}

/**
 * Ensure all ASBR directories exist with proper structure
 */
export async function ensureDirectories(): Promise<void> {
  const paths = getXDGPaths();

  // Create base directories
  await mkdir(paths.config, { recursive: true });
  await mkdir(paths.data, { recursive: true });
  await mkdir(paths.state, { recursive: true });
  await mkdir(paths.cache, { recursive: true });

  // Create CONFIG subdirectories
  await mkdir(join(paths.config, 'policies'), { recursive: true });

  // Create DATA subdirectories
  await mkdir(join(paths.data, 'artifacts'), { recursive: true });
  await mkdir(join(paths.data, 'evidence'), { recursive: true });
  await mkdir(join(paths.data, 'profiles'), { recursive: true });

  // Create STATE subdirectories
  await mkdir(join(paths.state, 'checkpoints'), { recursive: true });
  await mkdir(join(paths.state, 'connectors'), { recursive: true });
  await mkdir(join(paths.state, 'receipts'), { recursive: true });

  // Create CACHE subdirectories
  await mkdir(join(paths.cache, 'indexes'), { recursive: true });
  await mkdir(join(paths.cache, 'tmp'), { recursive: true });
}

/**
 * Get path for config files
 */
export function getConfigPath(filename: string): string {
  const paths = getXDGPaths();
  return join(paths.config, filename);
}

/**
 * Get path for data files with date-based organization
 */
export function getDataPath(
  type: 'artifacts' | 'evidence' | 'profiles',
  ...segments: string[]
): string {
  const paths = getXDGPaths();
  return join(paths.data, type, ...segments);
}

/**
 * Get path for artifacts with date/UUID organization
 */
export function getArtifactPath(date: string, uuid: string, filename?: string): string {
  const paths = getXDGPaths();
  const artifactDir = join(paths.data, 'artifacts', date, uuid);
  return filename ? join(artifactDir, filename) : artifactDir;
}

/**
 * Get path for state files
 */
export function getStatePath(filename: string): string {
  const paths = getXDGPaths();
  return join(paths.state, filename);
}

/**
 * Get path for cache files
 */
export function getCachePath(...segments: string[]): string {
  const paths = getXDGPaths();
  return join(paths.cache, ...segments);
}

/**
 * Check if a path exists and is accessible
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is a directory
 */
export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get a temporary directory path in the ASBR cache
 */
export function getTempPath(prefix: string = 'tmp'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return getCachePath('tmp', `${prefix}_${timestamp}_${random}`);
}

/**
 * Clean up temporary files older than specified age
 */
export async function cleanupTempFiles(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
  const tmpDir = getCachePath('tmp');

  if (!(await pathExists(tmpDir))) {
    return;
  }

  try {
    const { readdir, stat, rm } = await import('fs/promises');
    const files = await readdir(tmpDir);
    const now = Date.now();

    for (const file of files) {
      const filePath = join(tmpDir, file);
      const stats = await stat(filePath);

      if (now - stats.mtime.getTime() > maxAgeMs) {
        await rm(filePath, { recursive: true, force: true });
      }
    }
  } catch (error) {
    logWarn('Failed to cleanup temp files', { error });
  }
}

/**
 * Initialize XDG directory structure for ASBR
 */
export async function initializeXDG(): Promise<XDGPaths> {
  await ensureDirectories();
  return getXDGPaths();
}
