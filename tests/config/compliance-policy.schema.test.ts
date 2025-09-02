import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compliancePolicySchema } from "../../schemas/compliance-policy.schema";

describe("compliance.policy.json", () => {
	it("matches schema", () => {
		const data = JSON.parse(
			readFileSync(
				join(process.cwd(), "config", "compliance.policy.json"),
				"utf8",
			),
		);
		const result = compliancePolicySchema.safeParse(data);
		expect(result.success).toBe(true);
	});
});
