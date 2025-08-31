/**
 * Evidence Storage System
 * XDG-compliant persistence for evidence with governance features
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { gunzip, gzip } from 'zlib';
import type { Evidence } from '../types/index.js';
import { ValidationError } from '../types/index.js';
import { getDataPath, pathExists } from '../xdg/index.js';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface StorageOptions {
  compression?: boolean;
  encryption?: boolean;
  retention?: {
    days: number;
    autoCleanup: boolean;
  };
}

export interface EvidenceQuery {
  ids?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  source?: string;
  riskLevel?: string;
  confidence?: {
    min?: number;
    max?: number;
  };
  limit?: number;
  offset?: number;
}

export interface StorageStats {
  totalEvidence: number;
  sizeBytes: number;
  oldestEntry: string;
  newestEntry: string;
  sourceBreakdown: Record<string, number>;
}

/**
 * Evidence storage with XDG compliance and governance
 */
export class EvidenceStorage {
  private options: StorageOptions;
  private evidenceCache = new Map<string, Evidence>();
  private cacheExpiry = new Map<string, number>();

  constructor(options: StorageOptions = {}) {
    this.options = {
      compression: false,
      encryption: false,
      retention: {
        days: 365,
        autoCleanup: false,
      },
      ...options,
    };
  }

  /**
   * Store evidence with XDG-compliant organization
   */
  async storeEvidence(evidence: Evidence): Promise<void> {
    // Organize by date for efficient cleanup
    const date = new Date(evidence.createdAt);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

    const evidenceDir = getDataPath('evidence', dateStr);
    await mkdir(evidenceDir, { recursive: true });

    const filename = `${evidence.id}.json`;
    const filepath = join(evidenceDir, filename);

    try {
      let content = JSON.stringify(evidence, null, 2);

      if (this.options.compression) {
        content = await this.compress(content);
      }

      if (this.options.encryption) {
        content = await this.encrypt(content);
      }

      await writeFile(filepath, content, 'utf-8');

      // Update cache
      this.evidenceCache.set(evidence.id, evidence);
      this.cacheExpiry.set(evidence.id, Date.now() + 60000); // 1 minute cache
    } catch (error) {
      throw new ValidationError(
        `Failed to store evidence ${evidence.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Retrieve evidence by ID
   */
  async getEvidence(evidenceId: string): Promise<Evidence | null> {
    // Check cache first
    if (this.evidenceCache.has(evidenceId)) {
      const expiry = this.cacheExpiry.get(evidenceId);
      if (expiry && expiry > Date.now()) {
        return this.evidenceCache.get(evidenceId)!;
      }
    }

    // Search through date directories
    const evidenceBaseDir = getDataPath('evidence');

    if (!(await pathExists(evidenceBaseDir))) {
      return null;
    }

    try {
      const dateDirs = await readdir(evidenceBaseDir);

      for (const dateDir of dateDirs) {
        const filepath = join(evidenceBaseDir, dateDir, `${evidenceId}.json`);

        if (await pathExists(filepath)) {
          const evidence = await this.loadEvidenceFile(filepath);

          // Update cache
          this.evidenceCache.set(evidenceId, evidence);
          this.cacheExpiry.set(evidenceId, Date.now() + 60000);

          return evidence;
        }
      }

      return null;
    } catch (error) {
      throw new ValidationError(
        `Failed to retrieve evidence ${evidenceId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Query evidence with filters
   */
  async queryEvidence(query: EvidenceQuery): Promise<{
    evidence: Evidence[];
    total: number;
    hasMore: boolean;
  }> {
    const evidenceBaseDir = getDataPath('evidence');

    if (!(await pathExists(evidenceBaseDir))) {
      return { evidence: [], total: 0, hasMore: false };
    }

    const results: Evidence[] = [];

    try {
      const dateDirs = await readdir(evidenceBaseDir);
      const filteredDirs = this.filterDateDirs(dateDirs, query.dateRange);

      for (const dateDir of filteredDirs) {
        const dateDirPath = join(evidenceBaseDir, dateDir);
        const files = await readdir(dateDirPath);

        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const evidenceId = file.replace('.json', '');

          // Skip if specific IDs requested and this isn't one
          if (query.ids && !query.ids.includes(evidenceId)) {
            continue;
          }

          const filepath = join(dateDirPath, file);
          const evidence = await this.loadEvidenceFile(filepath);

          // Apply filters
          if (this.matchesQuery(evidence, query)) {
            results.push(evidence);
          }
        }
      }

      // Sort by creation date (newest first)
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const total = results.length;
      const offset = query.offset || 0;
      const limit = query.limit || 50;

      const paginatedResults = results.slice(offset, offset + limit);
      const hasMore = offset + limit < total;

      return {
        evidence: paginatedResults,
        total,
        hasMore,
      };
    } catch (error) {
      throw new ValidationError(
        `Failed to query evidence: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete evidence by ID (with audit trail)
   */
  async deleteEvidence(evidenceId: string): Promise<void> {
    const evidence = await this.getEvidence(evidenceId);
    if (!evidence) {
      throw new ValidationError(`Evidence ${evidenceId} not found`);
    }

    // Create deletion receipt
    const receipt = {
      evidenceId,
      deletedAt: new Date().toISOString(),
      originalEvidence: evidence,
      deletedBy: 'system', // In real implementation, would track user
    };

    const receiptPath = getDataPath(
      'evidence',
      'receipts',
      `delete_${evidenceId}_${Date.now()}.json`,
    );
    await writeFile(receiptPath, JSON.stringify(receipt, null, 2), 'utf-8');

    // Remove the actual evidence file
    const date = new Date(evidence.createdAt).toISOString().split('T')[0];
    const filepath = join(getDataPath('evidence', date), `${evidenceId}.json`);

    if (await pathExists(filepath)) {
      await rm(filepath);
    }

    // Remove from cache
    this.evidenceCache.delete(evidenceId);
    this.cacheExpiry.delete(evidenceId);
  }

  /**
   * Clean up old evidence based on retention policy
   */
  async cleanupOldEvidence(): Promise<{
    deletedCount: number;
    freedBytes: number;
  }> {
    if (!this.options.retention?.autoCleanup) {
      return { deletedCount: 0, freedBytes: 0 };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.options.retention.days);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    const evidenceBaseDir = getDataPath('evidence');

    if (!(await pathExists(evidenceBaseDir))) {
      return { deletedCount: 0, freedBytes: 0 };
    }

    let deletedCount = 0;
    let freedBytes = 0;

    try {
      const dateDirs = await readdir(evidenceBaseDir);

      for (const dateDir of dateDirs) {
        if (dateDir < cutoffDateStr) {
          const dateDirPath = join(evidenceBaseDir, dateDir);
          const files = await readdir(dateDirPath);

          for (const file of files) {
            const filepath = join(dateDirPath, file);
            const stats = await import('fs/promises').then((fs) => fs.stat(filepath));
            freedBytes += stats.size;

            // Create deletion receipt before removing
            const evidenceId = file.replace('.json', '');
            const evidence = await this.loadEvidenceFile(filepath);

            await this.createDeletionReceipt(evidenceId, evidence, 'retention_policy');

            await rm(filepath);
            deletedCount++;
          }

          // Remove empty directory
          const remainingFiles = await readdir(dateDirPath);
          if (remainingFiles.length === 0) {
            await rm(dateDirPath, { recursive: true });
          }
        }
      }

      return { deletedCount, freedBytes };
    } catch (error) {
      throw new ValidationError(
        `Failed to cleanup old evidence: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    const evidenceBaseDir = getDataPath('evidence');

    if (!(await pathExists(evidenceBaseDir))) {
      return {
        totalEvidence: 0,
        sizeBytes: 0,
        oldestEntry: '',
        newestEntry: '',
        sourceBreakdown: {},
      };
    }

    let totalEvidence = 0;
    let sizeBytes = 0;
    let oldestDate = '';
    let newestDate = '';
    const sourceBreakdown: Record<string, number> = {};

    try {
      const dateDirs = await readdir(evidenceBaseDir);
      dateDirs.sort();

      if (dateDirs.length > 0) {
        oldestDate = dateDirs[0];
        newestDate = dateDirs[dateDirs.length - 1];
      }

      for (const dateDir of dateDirs) {
        const dateDirPath = join(evidenceBaseDir, dateDir);
        const files = await readdir(dateDirPath);

        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const filepath = join(dateDirPath, file);
          const stats = await import('fs/promises').then((fs) => fs.stat(filepath));
          sizeBytes += stats.size;
          totalEvidence++;

          // Load evidence to get source info
          try {
            const evidence = await this.loadEvidenceFile(filepath);
            sourceBreakdown[evidence.source] = (sourceBreakdown[evidence.source] || 0) + 1;
          } catch {
            // Skip corrupted files
          }
        }
      }

      return {
        totalEvidence,
        sizeBytes,
        oldestEntry: oldestDate,
        newestEntry: newestDate,
        sourceBreakdown,
      };
    } catch (error) {
      throw new ValidationError(
        `Failed to get storage stats: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Export evidence for external systems
   */
  async exportEvidence(
    query: EvidenceQuery,
    format: 'json' | 'jsonl' | 'csv' = 'jsonl',
  ): Promise<string> {
    const result = await this.queryEvidence({ ...query, limit: undefined });

    switch (format) {
      case 'json':
        return JSON.stringify(result.evidence, null, 2);

      case 'jsonl':
        return result.evidence.map((e) => JSON.stringify(e)).join('\n');

      case 'csv':
        return this.convertToCSV(result.evidence);

      default:
        throw new ValidationError(`Unsupported export format: ${format}`);
    }
  }

  private async loadEvidenceFile(filepath: string): Promise<Evidence> {
    let content = await readFile(filepath, 'utf-8');

    if (this.options.encryption) {
      content = await this.decrypt(content);
    }

    if (this.options.compression) {
      content = await this.decompress(content);
    }

    return JSON.parse(content);
  }

  private filterDateDirs(dateDirs: string[], dateRange?: { start: string; end: string }): string[] {
    if (!dateRange) {
      return dateDirs;
    }

    return dateDirs.filter((dateDir) => {
      return dateDir >= dateRange.start.split('T')[0] && dateDir <= dateRange.end.split('T')[0];
    });
  }

  private matchesQuery(evidence: Evidence, query: EvidenceQuery): boolean {
    if (query.source && evidence.source !== query.source) {
      return false;
    }

    if (query.riskLevel && evidence.risk !== query.riskLevel) {
      return false;
    }

    if (query.confidence) {
      if (query.confidence.min !== undefined && evidence.confidence < query.confidence.min) {
        return false;
      }
      if (query.confidence.max !== undefined && evidence.confidence > query.confidence.max) {
        return false;
      }
    }

    return true;
  }

  private async createDeletionReceipt(
    evidenceId: string,
    evidence: Evidence,
    reason: string,
  ): Promise<void> {
    const receipt = {
      evidenceId,
      deletedAt: new Date().toISOString(),
      reason,
      originalEvidence: evidence,
    };

    const receiptDir = getDataPath('evidence', 'receipts');
    await mkdir(receiptDir, { recursive: true });

    const receiptPath = join(receiptDir, `delete_${evidenceId}_${Date.now()}.json`);
    await writeFile(receiptPath, JSON.stringify(receipt, null, 2), 'utf-8');
  }

  private convertToCSV(evidence: Evidence[]): string {
    const headers = ['id', 'source', 'claim', 'confidence', 'risk', 'createdAt', 'pointerCount'];
    const rows = evidence.map((e) => [
      e.id,
      e.source,
      e.claim.replace(/"/g, '""'), // Escape quotes
      e.confidence.toString(),
      e.risk,
      e.createdAt,
      e.pointers.length.toString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  private async encrypt(content: string): Promise<string> {
    const key = this.getEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  private async decrypt(content: string): Promise<string> {
    const data = Buffer.from(content, 'base64');
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);
    const key = this.getEncryptionKey();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }

  private async compress(content: string): Promise<string> {
    return new Promise((resolve, reject) => {
      gzip(content, (err, buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(buffer.toString('base64'));
        }
      });
    });
  }

  private async decompress(content: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const buffer = Buffer.from(content, 'base64');
      gunzip(buffer, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.toString('utf-8'));
        }
      });
    });
  }

  private getEncryptionKey(): Buffer {
    const keyHex = process.env.EVIDENCE_ENCRYPTION_KEY;
    if (!keyHex) {
      throw new ValidationError(
        'EVIDENCE_ENCRYPTION_KEY environment variable not set. Please provide a 64-character hex string (32 bytes) as EVIDENCE_ENCRYPTION_KEY in your environment.',
      );
    }
    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== 32) {
      throw new ValidationError(
        'EVIDENCE_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Generate with: openssl rand -hex 32',
      );
    }
    return key;
  }
}
