import { configManager } from "./config.js";

export type AdapterId = "mlx" | "openai" | "anthropic" | "ollama";

export interface AdapterInfo {
  id: AdapterId;
  label: string;
  kind: "local" | "cloud";
  models: string[];
}

export interface CurrentModel {
  adapter: AdapterId;
  model: string;
}

const BUILTIN_ADAPTERS: AdapterInfo[] = [
  {
    id: "mlx",
    label: "Apple MLX (local)",
    kind: "local",
    models: ["phi3-mini", "qwen3-coder-1.5b", "llama3.1:8b-mlx"],
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    kind: "local",
    models: ["llama3.1:8b", "qwen2.5-coder:7b", "phi3:3.8b"],
  },
  {
    id: "openai",
    label: "OpenAI",
    kind: "cloud",
    models: ["gpt-4o-mini", "o4-mini", "gpt-4.1-mini"],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    kind: "cloud",
    models: ["claude-3.5-sonnet", "claude-3.5-haiku"],
  },
];

export async function listAdapters(): Promise<AdapterInfo[]> {
  // In the future, merge dynamic registry from config with builtin
  return BUILTIN_ADAPTERS;
}

export async function getCurrent(): Promise<CurrentModel> {
  const adapter = (await configManager.getValue("models.current.adapter")) as
    | AdapterId
    | undefined;
  const model = (await configManager.getValue("models.current.model")) as
    | string
    | undefined;
  if (adapter && model) return { adapter, model };

  // Initialize default if missing
  const def: CurrentModel = { adapter: "mlx", model: "phi3-mini" };
  await setCurrent(def.adapter, def.model);
  return def;
}

export async function setCurrent(
  adapter: AdapterId,
  model?: string,
): Promise<CurrentModel> {
  const adapters = await listAdapters();
  const info = adapters.find((a) => a.id === adapter);
  if (!info) throw new Error(`Unknown adapter: ${adapter}`);
  const nextModel =
    model && info.models.includes(model)
      ? model
      : (info.models[0] ?? "default");
  await configManager.set("models.current.adapter", adapter);
  await configManager.set("models.current.model", nextModel);
  return { adapter, model: nextModel };
}

export function formatCurrent(current: CurrentModel): string {
  return `${current.adapter}:${current.model}`;
}
