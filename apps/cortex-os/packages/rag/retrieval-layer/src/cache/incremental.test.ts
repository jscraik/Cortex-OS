/**
 * @file_path packages/retrieval-layer/src/cache/incremental.test.ts
 * @description Tests for incremental indexing cache
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IncrementalIndexCache } from './incremental';
import { writeFile, remove, ensureDir } from 'fs-extra';
import * as path from 'path';

describe('Incremental Index Cache', () => {
  let cache: IncrementalIndexCache;
  let testCacheDir: string;
  let testFilesDir: string;

  beforeEach(async () => {
    testCacheDir = path.join(__dirname, '../../../tests/cache-test');
    testFilesDir = path.join(__dirname, '../../../tests/test-files');
    cache = new IncrementalIndexCache(testCacheDir);

    // Ensure test directories exist
    await ensureDir(testFilesDir);

    // Create test files
    await writeFile(path.join(testFilesDir, 'test1.ts'), `export const greeting = "Hello World";`);

    await writeFile(
      path.join(testFilesDir, 'test2.md'),
      `# Test Document\n\nThis is a test markdown file.`,
    );

    await cache.initialize();
  });

  afterEach(async () => {
    await remove(testCacheDir);
    await remove(testFilesDir);
  });

  describe('Cache Initialization', () => {
    it('should initialize with empty manifest for new cache', async () => {
      const manifest = cache.getManifest();

      expect(manifest).toBeDefined();
      expect(manifest!.entries).toHaveLength(0);
      expect(manifest!.totalFiles).toBe(0);
      expect(manifest!.version).toBe('1.0.0');
    });

    it('should load existing manifest if present', async () => {
      const testFiles = [path.join(testFilesDir, 'test1.ts'), path.join(testFilesDir, 'test2.md')];

      // Update manifest with test files
      await cache.updateManifest(testFiles);

      // Create new cache instance to test loading
      const newCache = new IncrementalIndexCache(testCacheDir);
      await newCache.initialize();

      const manifest = newCache.getManifest();
      expect(manifest!.entries).toHaveLength(2);
      expect(manifest!.totalFiles).toBe(2);
    });
  });

  describe('File Change Detection', () => {
    it('should detect new files as changed', async () => {
      const filePath = path.join(testFilesDir, 'test1.ts');
      const hasChanged = await cache.hasFileChanged(filePath);

      expect(hasChanged).toBe(true);
    });

    it('should detect unchanged files after manifest update', async () => {
      const filePath = path.join(testFilesDir, 'test1.ts');

      // Update manifest
      await cache.updateManifest([filePath]);

      // Check if file is detected as unchanged
      const hasChanged = await cache.hasFileChanged(filePath);
      expect(hasChanged).toBe(false);
    });

    it('should detect file content changes', async () => {
      const filePath = path.join(testFilesDir, 'test1.ts');

      // Update manifest with original content
      await cache.updateManifest([filePath]);

      // Modify file content
      await writeFile(filePath, `export const greeting = "Hello Universe";`);

      // Check if change is detected
      const hasChanged = await cache.hasFileChanged(filePath);
      expect(hasChanged).toBe(true);
    });

    it('should handle deleted files', async () => {
      const filePath = path.join(testFilesDir, 'deleted.ts');
      await writeFile(filePath, "console.log('test');");

      // Update manifest
      await cache.updateManifest([filePath]);

      // Delete file
      await remove(filePath);

      // Should detect as changed
      const hasChanged = await cache.hasFileChanged(filePath);
      expect(hasChanged).toBe(true);
    });
  });

  describe('Batch Change Detection', () => {
    it('should categorize files into changed/unchanged/deleted', async () => {
      const files = [path.join(testFilesDir, 'test1.ts'), path.join(testFilesDir, 'test2.md')];

      // Update manifest with original files
      await cache.updateManifest(files);

      // Modify one file
      await writeFile(path.join(testFilesDir, 'test1.ts'), `export const greeting = "Modified";`);

      // Add a new file
      const newFile = path.join(testFilesDir, 'test3.js');
      await writeFile(newFile, "console.log('new file');");

      const allFiles = [...files, newFile];
      const changes = await cache.getChangedFiles(allFiles);

      expect(changes.changed).toContain(path.join(testFilesDir, 'test1.ts'));
      expect(changes.changed).toContain(newFile);
      expect(changes.unchanged).toContain(path.join(testFilesDir, 'test2.md'));
      expect(changes.deleted).toHaveLength(0);
    });

    it('should detect deleted files', async () => {
      const files = [path.join(testFilesDir, 'test1.ts'), path.join(testFilesDir, 'test2.md')];

      // Update manifest
      await cache.updateManifest(files);

      // Remove one file from the list (simulating deletion)
      const currentFiles = [path.join(testFilesDir, 'test1.ts')];
      const changes = await cache.getChangedFiles(currentFiles);

      expect(changes.deleted).toContain(path.join(testFilesDir, 'test2.md'));
      expect(changes.unchanged).toContain(path.join(testFilesDir, 'test1.ts'));
    });
  });

  describe('Manifest Management', () => {
    it('should generate correct manifest entries', async () => {
      const filePath = path.join(testFilesDir, 'test1.ts');
      const entry = await cache.generateManifestEntry(filePath);

      expect(entry.path).toBe(path.relative(process.cwd(), filePath));
      expect(entry.size).toBeGreaterThan(0);
      expect(entry.mtime).toBeGreaterThan(0);
      expect(entry.hash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash
    });

    it('should update manifest with file list', async () => {
      const files = [path.join(testFilesDir, 'test1.ts'), path.join(testFilesDir, 'test2.md')];

      await cache.updateManifest(files);

      const manifest = cache.getManifest();
      expect(manifest!.entries).toHaveLength(2);
      expect(manifest!.totalFiles).toBe(2);
      expect(manifest!.totalSize).toBeGreaterThan(0);
    });
  });

  describe('Cache Statistics', () => {
    it('should provide accurate cache statistics', async () => {
      const files = [path.join(testFilesDir, 'test1.ts'), path.join(testFilesDir, 'test2.md')];

      await cache.updateManifest(files);
      const stats = cache.getCacheStats();

      expect(stats.totalFiles).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.lastUpdated).toBeDefined();
      expect(stats.cacheAge).toBeGreaterThanOrEqual(0);
    });

    it('should return empty stats for uninitialized cache', () => {
      const emptyCache = new IncrementalIndexCache('/tmp/nonexistent');
      const stats = emptyCache.getCacheStats();

      expect(stats.totalFiles).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.lastUpdated).toBeNull();
      expect(stats.cacheAge).toBe(0);
    });
  });

  describe('Document Caching', () => {
    it('should save and load cached documents', async () => {
      const documents = [
        {
          id: 'doc1',
          path: 'test1.ts',
          content: 'test content',
          metadata: {},
        },
        {
          id: 'doc2',
          path: 'test2.md',
          content: 'markdown content',
          metadata: {},
        },
      ];

      await cache.saveCachedDocuments(documents);
      const loaded = await cache.loadCachedDocuments();

      expect(loaded).toHaveLength(2);
      expect(loaded[0].id).toBe('doc1');
      expect(loaded[1].id).toBe('doc2');
    });

    it('should return empty array for missing document cache', async () => {
      const loaded = await cache.loadCachedDocuments();
      expect(loaded).toHaveLength(0);
    });
  });

  describe('Cache Clearing', () => {
    it('should clear cache files and reset state', async () => {
      const files = [path.join(testFilesDir, 'test1.ts')];
      await cache.updateManifest(files);

      await cache.clearCache();

      const manifest = cache.getManifest();
      expect(manifest).toBeNull();

      const stats = cache.getCacheStats();
      expect(stats.totalFiles).toBe(0);
    });
  });
});
