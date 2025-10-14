/* eslint-disable no-console */
import fs from "node:fs";
import yaml from "yaml";
import { RouterConfigSchema } from "../src/schemas";

function loadConfig(path: string) {
  const raw = fs.readFileSync(path, "utf8");
  return path.endsWith(".json") ? JSON.parse(raw) : yaml.parse(raw);
}

const path = process.argv[2] || "configs/router.config.yaml";
try {
  const cfg = loadConfig(path);
  const parsed = RouterConfigSchema.parse(cfg);
  console.log("✅ router.config validated:", path);
  // emit normalized JSON (useful for diffs/snapshots)
  fs.writeFileSync(path + ".normalized.json", JSON.stringify(parsed, null, 2));
  console.log("📝 normalized →", path + ".normalized.json");
  process.exit(0);
} catch (err: any) {
  console.error("❌ Invalid router config:", err?.errors ?? err?.message ?? err);
  process.exit(1);
}
