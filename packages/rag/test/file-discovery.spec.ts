import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { discoverFiles } from "../src/pipeline/file-discovery";

describe("discoverFiles", () => {
	it("applies include and exclude globs", async () => {
		const dir = await fs.mkdtemp(join(tmpdir(), "rag-glob-"));
		await fs.writeFile(join(dir, "a.ts"), "");
		await fs.writeFile(join(dir, "b.md"), "");
		const files = await discoverFiles({
			root: dir,
			include: ["**/*.ts"],
			exclude: ["**/*.md"],
		});
		expect(files).toHaveLength(1);
		await fs.rm(dir, { recursive: true, force: true });
	});

	it("honors includePriority to override excludes", async () => {
		const dir = await fs.mkdtemp(join(tmpdir(), "rag-priority-"));
		await fs.writeFile(join(dir, "a.ts"), "");
		const files = await discoverFiles({
			root: dir,
			include: ["a.ts"],
			exclude: ["**/*.ts"],
			includePriority: true,
		});
		expect(files).toHaveLength(1);
		await fs.rm(dir, { recursive: true, force: true });
	});
});
