import fs from 'node:fs';
import path from 'node:path';
import * as YAML from 'yaml';
import { z } from 'zod';

const ServerSchema = z.object({
  port: z.number().int().positive().max(65535).default(3000),
});

const CircuitOptionsSchema = z.object({
  threshold: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
});

const BreakersSchema = z
  .object({
    ollama: CircuitOptionsSchema.optional(),
    mlx: CircuitOptionsSchema.optional(),
  })
  .partial()
  .optional();

const AISchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  breakers: BreakersSchema,
});

const SecuritySchema = z.object({
  bcryptRounds: z.number().int().positive().default(10),
});

export const AppConfigSchema = z.object({
  server: ServerSchema,
  ai: AISchema.default({}),
  security: SecuritySchema,
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export function validateConfig(cfg: unknown): AppConfig {
  return AppConfigSchema.parse(cfg);
}

function parseNum(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

type BreakerOptions = { threshold?: number; timeout?: number };
type Breakers = { ollama?: BreakerOptions; mlx?: BreakerOptions };

function assignBreaker(
  ai: Partial<AppConfig['ai']> | undefined,
  key: keyof Breakers,
  opts: BreakerOptions,
): Partial<AppConfig['ai']> {
  const prevBreakers: Breakers = ai?.breakers ? { ...ai.breakers } : {};
  const prevForKey = prevBreakers[key] ?? {};
  const merged: Breakers = { ...prevBreakers, [key]: { ...prevForKey, ...opts } };
  return { ...(ai ?? {}), breakers: merged };
}

function loadEnv(): Partial<AppConfig> {
  const envCfg: Partial<AppConfig> = {};
  const envPort = parseNum(process.env.PRP_PORT);
  const envProvider = process.env.PRP_AI_PROVIDER;
  const envModel = process.env.PRP_AI_MODEL;
  const envMaxTokens = parseNum(process.env.PRP_MAX_TOKENS);
  const envBcrypt = parseNum(process.env.PRP_BCRYPT_ROUNDS);

  if (envPort !== undefined) envCfg.server = { ...(envCfg.server ?? {}), port: envPort } as AppConfig['server'];
  if (envProvider) envCfg.ai = { ...(envCfg.ai ?? {}), provider: envProvider } as AppConfig['ai'];
  if (envModel) envCfg.ai = { ...(envCfg.ai ?? {}), model: envModel } as AppConfig['ai'];
  if (envMaxTokens !== undefined)
    envCfg.ai = { ...(envCfg.ai ?? {}), maxTokens: envMaxTokens } as AppConfig['ai'];

  // Breakers via env
  const ollamaThresh = parseNum(process.env.PRP_AI_BREAKERS_OLLAMA_THRESHOLD);
  const ollamaTimeout = parseNum(process.env.PRP_AI_BREAKERS_OLLAMA_TIMEOUT);
  if (ollamaThresh !== undefined || ollamaTimeout !== undefined) {
    envCfg.ai = assignBreaker(envCfg.ai, 'ollama', {
      ...(ollamaThresh !== undefined ? { threshold: ollamaThresh } : {}),
      ...(ollamaTimeout !== undefined ? { timeout: ollamaTimeout } : {}),
    });
  }
  const mlxThresh = parseNum(process.env.PRP_AI_BREAKERS_MLX_THRESHOLD);
  const mlxTimeout = parseNum(process.env.PRP_AI_BREAKERS_MLX_TIMEOUT);
  if (mlxThresh !== undefined || mlxTimeout !== undefined) {
    envCfg.ai = assignBreaker(envCfg.ai, 'mlx', {
      ...(mlxThresh !== undefined ? { threshold: mlxThresh } : {}),
      ...(mlxTimeout !== undefined ? { timeout: mlxTimeout } : {}),
    });
  }

  if (envBcrypt !== undefined)
    envCfg.security = { ...(envCfg.security ?? {}), bcryptRounds: envBcrypt } as AppConfig['security'];
  return envCfg;
}

// (removed duplicate assignBreaker)

export function loadConfig(_filePath?: string, defaults?: Partial<AppConfig>): AppConfig {
  // Load from file if provided (supports .json, .yaml/.yml). Precedence: env > file > defaults
  const env = loadEnv();
  let fileCfg: Partial<AppConfig> = {};
  if (_filePath) {
    const ext = path.extname(_filePath).toLowerCase();
    const raw = fs.readFileSync(_filePath, 'utf8');
    if (ext === '.json') {
      fileCfg = JSON.parse(raw);
    } else if (ext === '.yaml' || ext === '.yml') {
      fileCfg = YAML.parse(raw) as Partial<AppConfig>;
    }
  }
  const merged = {
    server: {
      port: 3000,
      ...(defaults?.server ?? {}),
      ...(fileCfg.server ?? {}),
      ...(env.server ?? {}),
    },
    ai: { ...(defaults?.ai ?? {}), ...(fileCfg.ai ?? {}), ...(env.ai ?? {}) },
    security: {
      bcryptRounds: 10,
      ...(defaults?.security ?? {}),
      ...(fileCfg.security ?? {}),
      ...(env.security ?? {}),
    },
  } satisfies Partial<AppConfig>;
  return validateConfig(merged);
}
