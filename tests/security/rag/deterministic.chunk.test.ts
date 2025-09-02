import { byChars } from "@cortex-os/rag/chunk";
import { expect, it } from "vitest";

it("produces deterministic chunks", () => {
	const text = "hello world".repeat(50);
	const a = byChars(text, 20, 5);
	const b = byChars(text, 20, 5);
	expect(a).toEqual(b);
});
