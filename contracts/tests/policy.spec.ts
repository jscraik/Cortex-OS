import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("model-gateway grant omits frontier rules", () => {
	const txt = readFileSync(".cortex/policy/model-gateway.json", "utf8");
	const g = JSON.parse(txt);
	expect(g.actions).not.toContain("frontier");
	expect(g.rules.allow_frontier).toBeUndefined();
	expect(g.rules.require_hitl_for_frontier).toBeUndefined();
});
