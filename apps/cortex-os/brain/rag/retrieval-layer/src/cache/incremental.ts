/**
 * @file_path packages/retrieval-layer/src/cache/incremental.ts
 * @description Incremental indexing with content hash cache implementation
 */

import { createHash } from "crypto";
import { promises as fs } from "fs";
import { ensureDir, pathExists, readFile, writeFile } from "fs-extra";
import * as path from "path";
import { Document } from "../types";

// Manifest entry for tracking file changes
export interface ManifestEntry {
  path: string;
  size: number;
  mtime: number;
  hash: string;
}

// Cache manifest for incremental indexing
export interface CacheManifest {
  version: string;
  createdAt: Date;
  lastUpdated: Date;
  entries: ManifestEntry[];
  totalFiles: number;
  totalSize: number;
}

export class IncrementalIndexCache {
  private cacheDir: string;
  private manifestPath: string;
  private documentsPath: string;
  private manifest: CacheManifest | null = null;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    this.manifestPath = path.join(cacheDir, "manifest.json");
    this.documentsPath = path.join(cacheDir, "documents.json");
  }

  /**
   * Initialize cache directory and load existing manifest
   */
  async initialize(): Promise<void> {
    await ensureDir(this.cacheDir);

    if (await pathExists(this.manifestPath)) {
      const manifestData = await readFile(this.manifestPath, "utf-8");
      this.manifest = JSON.parse(manifestData);
      // Convert date strings back to Date objects
      this.manifest!.createdAt = new Date(this.manifest!.createdAt);
      this.manifest!.lastUpdated = new Date(this.manifest!.lastUpdated);
    } else {
      this.manifest = {
        version: "1.0.0",
        createdAt: new Date(),
        lastUpdated: new Date(),
        entries: [],
        totalFiles: 0,
        totalSize: 0,
      };
    }
  }

  /**
   * Generate file hash for content comparison
   */
  private async generateFileHash(filePath: string): Promise<string> {
    const content = await readFile(filePath, "utf-8");
    return createHash("sha256").update(content).digest("hex");
  }

  /**
   * Generate file manifest entry
   */
  async generateManifestEntry(filePath: string): Promise<ManifestEntry> {
    const stats = await fs.stat(filePath);
    const hash = await this.generateFileHash(filePath);

    return {
      path: path.relative(process.cwd(), filePath),
      size: stats.size,
      mtime: Math.floor(stats.mtime.getTime() / 1000),
      hash,
    };
  }

  /**
   * Check if file has changed since last indexing
   */
  async hasFileChanged(filePath: string): Promise<boolean> {
    if (!this.manifest) {
      throw new Error("Cache not initialized");
    }

    const relativePath = path.relative(process.cwd(), filePath);
    const existingEntry = this.manifest.entries.find(
      (e) => e.path === relativePath,
    );

    if (!existingEntry) {
      return true; // New file
    }

    try {
      const currentEntry = await this.generateManifestEntry(filePath);

      // Compare hash, size, and modification time
      return (
        currentEntry.hash !== existingEntry.hash ||
        currentEntry.size !== existingEntry.size ||
        currentEntry.mtime !== existingEntry.mtime
      );
    } catch {
      // File might have been deleted
      return true;
    }
  }

  /**
   * Get changed files since last indexing
   */
  async getChangedFiles(filePaths: string[]): Promise<{
    changed: string[];
    unchanged: string[];
    deleted: string[];
  }> {
    if (!this.manifest) {
      throw new Error("Cache not initialized");
    }

    const changed: string[] = [];
    const unchanged: string[] = [];
    const currentPaths = new Set(filePaths);

    // Check for changed and unchanged files
    for (const filePath of filePaths) {
      if (await this.hasFileChanged(filePath)) {
        changed.push(filePath);
      } else {
        unchanged.push(filePath);
      }
    }

    // Check for deleted files
    const deleted: string[] = [];
    for (const entry of this.manifest.entries) {
      const fullPath = path.resolve(entry.path);
      if (!currentPaths.has(fullPath) || !(await pathExists(fullPath))) {
        deleted.push(fullPath);
      }
    }

    return { changed, unchanged, deleted };
  }

  /**
   * Update manifest with new file entries
   */
  async updateManifest(filePaths: string[]): Promise<void> {
    if (!this.manifest) {
      throw new Error("Cache not initialized");
    }

    const newEntries: ManifestEntry[] = [];
    let totalSize = 0;

    for (const filePath of filePaths) {
      try {
        const entry = await this.generateManifestEntry(filePath);
        newEntries.push(entry);
        totalSize += entry.size;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.emitWarning(
          `Failed to generate manifest entry for ${filePath}: ${message}`,
        );
      }
    }

    // Update manifest
    this.manifest = {
      ...this.manifest,
      lastUpdated: new Date(),
      entries: newEntries,
      totalFiles: newEntries.length,
      totalSize,
    };

    // Save manifest to disk
    await this.saveManifest();
  }

  /**
   * Save manifest to disk
   */
  async saveManifest(): Promise<void> {
    if (!this.manifest) {
      throw new Error("No manifest to save");
    }

    await writeFile(this.manifestPath, JSON.stringify(this.manifest, null, 2));
  }

  /**
   * Load cached documents
   */
  async loadCachedDocuments(): Promise<Document[]> {
    if (!(await pathExists(this.documentsPath))) {
      return [];
    }

    const documentsData = await readFile(this.documentsPath, "utf-8");
    return JSON.parse(documentsData);
  }

  /**
   * Save documents to cache
   */
  async saveCachedDocuments(documents: Document[]): Promise<void> {
    await writeFile(this.documentsPath, JSON.stringify(documents, null, 2));
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalFiles: number;
    totalSize: number;
    lastUpdated: Date | null;
    cacheAge: number; // in milliseconds
  } {
    if (!this.manifest) {
      return {
        totalFiles: 0,
        totalSize: 0,
        lastUpdated: null,
        cacheAge: 0,
      };
    }

    return {
      totalFiles: this.manifest.totalFiles,
      totalSize: this.manifest.totalSize,
      lastUpdated: this.manifest.lastUpdated,
      cacheAge: Date.now() - this.manifest.lastUpdated.getTime(),
    };
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    if (await pathExists(this.manifestPath)) {
      await fs.unlink(this.manifestPath);
    }

    if (await pathExists(this.documentsPath)) {
      await fs.unlink(this.documentsPath);
    }

    this.manifest = null;
  }

  /**
   * Get manifest for inspection
   */
  getManifest(): CacheManifest | null {
    return this.manifest ? { ...this.manifest } : null;
  }
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
