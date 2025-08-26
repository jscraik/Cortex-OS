/**
 * @file_path packages/retrieval-layer/tests/setup.ts
 * @description Test setup for retrieval layer
 */

import { beforeAll, afterAll } from "vitest";
import fs from "fs-extra";
import path from "path";

const TEST_DATA_DIR = path.join(__dirname, "test-data");
const TEST_CACHE_DIR = path.join(__dirname, "test-cache");

beforeAll(async () => {
  // Ensure test directories exist
  await fs.ensureDir(TEST_DATA_DIR);
  await fs.ensureDir(TEST_CACHE_DIR);
});

afterAll(async () => {
  // Cleanup test directories
  await fs.remove(TEST_DATA_DIR);
  await fs.remove(TEST_CACHE_DIR);
});
