import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { ServerInfoSchema, type ServerInfo } from "@cortex-os/mcp-core";

function registryPath(): string {
  const base = process.env.CORTEX_HOME
    || (process.env.XDG_CONFIG_HOME ? join(process.env.XDG_CONFIG_HOME, "cortex-os") : join(process.env.HOME || ".", ".config", "cortex-os"));
  return join(base, "mcp", "servers.json");
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const buf = await fs.readFile(file, "utf8");
    return JSON.parse(buf) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2));
}

export async function readAll(): Promise<ServerInfo[]> {
  const file = registryPath();
  const data = await readJson<{ servers: ServerInfo[] }>(file, { servers: [] });
  return data.servers.map((s) => ServerInfoSchema.parse(s));
}

export async function upsert(si: ServerInfo): Promise<void> {
  const servers = await readAll();
  const next = servers.filter((s) => s.name !== si.name);
  next.push(ServerInfoSchema.parse(si));
  await writeJson(registryPath(), { servers: next });
}

export async function remove(name: string): Promise<boolean> {
  const servers = await readAll();
  const next = servers.filter((s) => s.name !== name);
  await writeJson(registryPath(), { servers: next });
  return next.length !== servers.length;
}
