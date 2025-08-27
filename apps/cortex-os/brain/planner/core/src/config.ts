import { promises as fs } from "node:fs";
import * as path from "node:path";

export type JsonObject = { [key: string]: any };

function getRepoRoot(): string {
  // Assume this file lives under <repo>/packages/cortex-core/src/config.ts
  // Resolve repo root three levels up from this file
  return path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "../../..",
  );
}

function deepGet(obj: JsonObject, keyPath: string): any {
  if (!keyPath) return obj;
  return keyPath
    .split(".")
    .reduce((acc: any, k) => (acc == null ? undefined : acc[k]), obj);
}

function deepSet(obj: JsonObject, keyPath: string, value: any): JsonObject {
  const parts = keyPath.split(".");
  let cur: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof cur[p] !== "object" || cur[p] === null) cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
  return obj;
}

export class ConfigManager {
  private static instance: ConfigManager | null = null;
  private readonly configPath: string;
  private baseline: JsonObject = {};

  private constructor() {
    // Primary config file at repo root
    this.configPath = path.resolve(getRepoRoot(), "cortex-config.json");
  }

  static getInstance(): ConfigManager {
    if (!this.instance) this.instance = new ConfigManager();
    return this.instance;
  }

  async loadFile(): Promise<JsonObject> {
    try {
      const raw = await fs.readFile(this.configPath, "utf-8");
      const json = JSON.parse(raw);
      if (Object.keys(this.baseline).length === 0) {
        // Keep the first loaded copy as baseline for reset()
        this.baseline = JSON.parse(raw);
      }
      return json;
    } catch (err: any) {
      if (err.code === "ENOENT") {
        // Initialize with defaults
        const defaults: JsonObject = {};
        await this.saveFile(defaults);
        this.baseline = { ...defaults };
        return defaults;
      }
      throw err;
    }
  }

  async saveFile(config: JsonObject): Promise<void> {
    const content = JSON.stringify(config, null, 2) + "\n";
    await fs.writeFile(this.configPath, content, "utf-8");
  }

  getValueSync = (key: string): any => {
    throw new Error(
      "getValueSync is not supported in ESM context; use getValue()",
    );
  };

  async getValue(key: string): Promise<any> {
    const cfg = await this.loadFile();
    return deepGet(cfg, key);
  }

  async set(key: string, value: any): Promise<void> {
    const cfg = await this.loadFile();
    deepSet(cfg, key, value);
    await this.saveFile(cfg);
  }

  async getAll(): Promise<JsonObject> {
    return this.loadFile();
  }

  async reset(): Promise<void> {
    await this.saveFile(this.baseline || {});
  }
}

export const configManager = ConfigManager.getInstance();
