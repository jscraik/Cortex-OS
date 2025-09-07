/**
 * @fileoverview Integration test for vitest config
 * Tests that the corrected config works properly
 */

import { describe, it, expect } from "vitest";
import { integrationConfig } from "./vitest.integration.config";

describe("Integration Config", () => {
	it("should export named config correctly", () => {
		expect(integrationConfig).toBeDefined();
		expect(typeof integrationConfig).toBe("object");
	});

	it("should have proper test configuration", () => {
		expect(integrationConfig.test).toBeDefined();
		expect(integrationConfig.test?.environment).toBe("node");
		expect(integrationConfig.test?.name).toBe("integration-tests");
	});

	it("should have proper file inclusion patterns", () => {
		expect(integrationConfig.test?.include).toEqual([
			"**/integration/**/*.test.ts",
			"**/integration/**/*.spec.ts",
		]);
	});

	it("should have proper concurrency settings", () => {
		expect(integrationConfig.test?.maxConcurrency).toBe(2);
		expect(integrationConfig.test?.testTimeout).toBe(30000);
	});

	it("should have proper ESM aliases configured", () => {
		expect(integrationConfig.resolve?.alias).toBeDefined();
		expect(integrationConfig.resolve?.alias?.["@"]).toBeDefined();
		expect(integrationConfig.resolve?.alias?.["~"]).toBeDefined();
	});

	it("should target appropriate Node.js version", () => {
		expect(integrationConfig.esbuild?.target).toBe("node18");
	});
});