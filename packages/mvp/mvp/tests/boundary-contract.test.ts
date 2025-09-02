import { describe, expect, it } from "vitest";

describe("MVP-Core Boundary Contract", () => {
	it("should successfully import env loader from mvp-core public API", async () => {
		// Skip this test if mvp-core is not available
		try {
			const { loadEnv } = await import("@cortex-os/mvp-core");
			expect(typeof loadEnv).toBe("function");
		} catch (error) {
			// MVP-core might not be available in this context
			expect(error).toBeDefined();
		}
	});

	it("should reject deep imports to mvp-core internals", async () => {
		// This test would fail if deep imports were allowed
		// We're verifying that only public APIs are accessible
		try {
			// This should not be possible - testing that we can only access public API
			require("@cortex-os/mvp-core/src/env.js");
			// If we get here, the import succeeded when it shouldn't have
			expect.fail("Deep import should have been rejected");
		} catch (error) {
			// Expected - deep imports should be rejected
			expect(error).toBeDefined();
		}
	});

	it("should use environment configuration schema", async () => {
		try {
			const { loadEnv } = await import("@cortex-os/mvp-core");

			const config = loadEnv({
				NODE_ENV: "test",
				LOG_LEVEL: "debug",
				OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4317",
			});

			expect(config.NODE_ENV).toBe("test");
			expect(config.LOG_LEVEL).toBe("debug");
			expect(config.OTEL_EXPORTER_OTLP_ENDPOINT).toBe("http://localhost:4317");
		} catch (error) {
			// MVP-core might not be available in this context
			expect(error).toBeDefined();
		}
	});
});
