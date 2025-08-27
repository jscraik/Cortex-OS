/**
 * @file_path packages/evidence-validator/tests/setup.ts
 * @description Test setup for evidence validator
 */

import { beforeAll, afterAll } from "vitest";
import fs from "fs-extra";
import path from "path";

const TEST_DATA_DIR = path.join(__dirname, "test-data");

beforeAll(async () => {
  // Ensure test directories exist
  await fs.ensureDir(TEST_DATA_DIR);

  // Create test files
  await fs.writeFile(
    path.join(TEST_DATA_DIR, "sample.ts"),
    `import { Component } from "react";

export class SampleComponent extends Component {
  render() {
    return <div>Hello World</div>;
  }
}`,
  );

  await fs.writeFile(
    path.join(TEST_DATA_DIR, "readme.md"),
    `# Sample Project

This is a sample project for testing evidence validation.

## Features
- Feature 1: Basic functionality
- Feature 2: Advanced features`,
  );
});

afterAll(async () => {
  // Cleanup test directories
  await fs.remove(TEST_DATA_DIR);
});
