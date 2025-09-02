import { expect, test } from "vitest";
import { validateSecurity } from "./validateSecurity.js";

const baseManifest = {
	id: "test",
	transports: { sse: { url: "https://secure" } },
	scopes: [],
};

test("flags insecure transports", () => {
	const manifest = {
		...baseManifest,
		transports: { sse: { url: "http://insecure" } },
	};
	const result = validateSecurity(manifest);
	expect(result.valid).toBe(false);
	expect(result.errors.some((e) => e.path === "transports.sse.url")).toBe(true);
});

test("warns on dangerous scopes and missing security info", () => {
	const manifest = { ...baseManifest, scopes: ["system:exec"] };
	const result = validateSecurity(manifest);
	expect(result.valid).toBe(true);
	expect(result.warnings.some((w) => w.path === "scopes")).toBe(true);
	expect(
		result.warnings.some((w) => w.path === "security.sigstoreBundle"),
	).toBe(true);
});
