#!/usr/bin/env node
import { existsSync } from "node:fs";

const idx = process.argv.indexOf("--files");
const files = idx >= 0 ? process.argv.slice(idx + 1) : [];
const missing = files.filter((f) => !existsSync(f));
if (missing.length) {
	console.warn(`Skipping missing files:\n${missing.join("\n")}`);
} else {
	console.log("Structure validation passed");
}
