/**
 * @file_path packages/evidence-validator/tests/setup.ts
 * @description Test setup for evidence validator
 */

import { beforeAll, afterAll } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import path from 'path';

const TEST_DATA_DIR = path.join(__dirname, 'test-data');

beforeAll(async () => {
  // Ensure test directories exist
  await mkdir(TEST_DATA_DIR, { recursive: true });

  // Create test files
  await writeFile(
    path.join(TEST_DATA_DIR, 'sample.ts'),
    `import { Component } from "react";

export class SampleComponent extends Component {
  render() {
    return <div>Hello World</div>;
  }
}`,
  );

  await writeFile(
    path.join(TEST_DATA_DIR, 'readme.md'),
    `# Sample Project

This is a sample project for testing evidence validation.

## Features
- Feature 1: Basic functionality
- Feature 2: Advanced features`,
  );
});

afterAll(async () => {
  // Cleanup test directories
  await rm(TEST_DATA_DIR, { recursive: true, force: true });
});
