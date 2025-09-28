import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import fg from 'fast-glob';
import * as yaml from 'yaml';
import { ZodError } from 'zod';
import { SubagentConfigSchema, type SubagentConfig } from './nO/contracts.js';

const TEMPLATE_GLOB = '**/*.{md,markdown,yaml,yml,json}';
const PROJECT_DIR = '.cortex/agents';

type TemplateFormat = 'markdown' | 'yaml' | 'yml' | 'json';

type TemplateScope = 'project' | 'user';

export interface AgentTemplate {
  name: string;
  config: SubagentConfig;
  prompt: string;
  scope: TemplateScope;
  filePath: string;
  metadata: {
    format: TemplateFormat;
    updatedAt: string;
  };
}

export type AgentTemplateMap = Map<string, AgentTemplate>;

export interface LoadAgentTemplatesOptions {
  projectDir?: string;
  userDir?: string;
  pattern?: string;
}

class AgentTemplateError extends Error {
  constructor(message: string, public readonly filePath: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AgentTemplateError';
  }
}

export async function loadAgentTemplates(opts: LoadAgentTemplatesOptions = {}): Promise<AgentTemplateMap> {
  const projectRoot = opts.projectDir ?? process.cwd();
  const userRoot = opts.userDir ?? path.join(os.homedir(), '.cortex/agents');
  const projectAgentsDir = path.join(projectRoot, PROJECT_DIR);
  const pattern = opts.pattern ?? TEMPLATE_GLOB;

  const result: AgentTemplateMap = new Map();
  const errors: AgentTemplateError[] = [];

  const scopes: Array<{ dir: string; scope: TemplateScope }> = [
    { dir: userRoot, scope: 'user' },
    { dir: projectAgentsDir, scope: 'project' },
  ];

  for (const entry of scopes) {
    const files = await listTemplateFiles(entry.dir, pattern);
    for (const file of files) {
      try {
        const template = await parseTemplate(file, entry.scope);
        result.set(template.name, template);
      } catch (error) {
        errors.push(toTemplateError(error, file));
      }
    }
  }

  if (errors.length > 0) {
    const details = errors.map((err) => `${err.filePath}: ${String(err.cause ?? err.message)}`).join('; ');
    throw new AgentTemplateError(`brAInwav agent template validation failed: ${details}`, errors[0]?.filePath, errors);
  }

  return result;
}

async function listTemplateFiles(dir: string, pattern: string): Promise<string[]> {
  try {
    const stats = await fs.stat(dir);
    if (!stats.isDirectory()) {
      return [];
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const found = await fg(pattern, { cwd: dir, onlyFiles: true, dot: true });
  return found
    .map((rel) => path.join(dir, rel))
    .sort((a, b) => a.localeCompare(b));
}

async function parseTemplate(filePath: string, scope: TemplateScope): Promise<AgentTemplate> {
  const format = detectFormat(filePath);
  const rawText = await fs.readFile(filePath, 'utf8');
  const parsed = ingestTemplate(rawText, format);
  const resolvedName = resolveName(parsed.data, filePath);
  const prompt = resolvePrompt(parsed, filePath);

  const configInput = buildConfigInput({
    filePath,
    scope,
    name: resolvedName,
    data: parsed.data,
    prompt,
  });

  let config: SubagentConfig;
  try {
    config = SubagentConfigSchema.parse(configInput);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AgentTemplateError(`brAInwav agent template schema violation: ${error.message}`, filePath, error);
    }
    throw new AgentTemplateError('brAInwav agent template parsing failure', filePath, error);
  }

  const stats = await fs.stat(filePath);

  return {
    name: config.name,
    config,
    prompt,
    scope,
    filePath,
    metadata: {
      format,
      updatedAt: stats.mtime.toISOString(),
    },
  };
}

function ingestTemplate(raw: string, format: TemplateFormat): { data: Record<string, unknown>; content: string } {
  if (format === 'markdown') {
    const parsed = parseMarkdownWithFrontMatter(raw);
    return {
      data: parsed.data,
      content: parsed.body.trim(),
    };
  }

  if (format === 'json') {
    const data = JSON.parse(raw) as Record<string, unknown>;
    return { data, content: '' };
  }

  const loaded = yaml.parse(raw);
  if (typeof loaded !== 'object' || loaded === null) {
    throw new Error('Expected YAML agent template to resolve to an object.');
  }
  return { data: loaded as Record<string, unknown>, content: '' };
}

function resolveName(data: Record<string, unknown>, filePath: string): string {
  const provided = asString(data.name);
  if (provided) {
    return provided.trim();
  }
  const base = path.basename(filePath);
  return base.replace(path.extname(base), '');
}

function resolvePrompt(parsed: { data: Record<string, unknown>; content: string }, filePath: string): string {
  const { data, content } = parsed;
  const direct = asString(data.systemPrompt) ?? asString((data as Record<string, unknown>).prompt);
  if (direct && direct.trim().length > 0) {
    return direct.trim();
  }
  if (content.trim().length > 0) {
    return content.trim();
  }
  throw new Error(`Template ${filePath} is missing a system prompt or markdown body.`);
}

function buildConfigInput(args: {
  filePath: string;
  scope: TemplateScope;
  name: string;
  data: Record<string, unknown>;
  prompt: string;
}): Partial<SubagentConfig> & { path: string; name: string; scope: TemplateScope; systemPrompt: string; description: string } {
  const { filePath, scope, name, data, prompt } = args;
  const description = requireString(data.description, 'description');
  const tools = extractStringArray(data.tools);
  const capabilities = extractStringArray(data.capabilities);

  const input: Partial<SubagentConfig> & {
    path: string;
    name: string;
    scope: TemplateScope;
    systemPrompt: string;
    description: string;
  } = {
    name,
    description,
    systemPrompt: prompt,
    scope,
    path: filePath,
  };

  if (tools) input.tools = tools;
  if (capabilities) input.capabilities = capabilities;

  const model = asString(data.model);
  if (model) input.model = model;

  const temperature = asNumber(data.temperature);
  if (typeof temperature === 'number') input.temperature = temperature;

  const maxTokens = asNumber(data.maxTokens ?? (data as Record<string, unknown>)['max_tokens']);
  if (typeof maxTokens === 'number') input.maxTokens = maxTokens;

  const maxConcurrency = asInteger(data.maxConcurrency ?? (data as Record<string, unknown>)['max_concurrency']);
  if (typeof maxConcurrency === 'number') input.maxConcurrency = maxConcurrency;

  const timeout = asInteger(data.timeout ?? (data as Record<string, unknown>)['timeout_ms']);
  if (typeof timeout === 'number') input.timeout = timeout;

  return input;
}

function detectFormat(filePath: string): TemplateFormat {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.md' || ext === '.markdown') return 'markdown';
  if (ext === '.yml') return 'yml';
  if (ext === '.yaml') return 'yaml';
  return 'json';
}

function parseMarkdownWithFrontMatter(raw: string): { data: Record<string, unknown>; body: string } {
  if (!raw.trimStart().startsWith('---')) {
    return { data: {}, body: raw.trim() };
  }

  const lines = raw.split(/\r?\n/);
  if (lines.length === 0 || lines[0]?.trim() !== '---') {
    return { data: {}, body: raw.trim() };
  }

  let closingIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i]?.trim() === '---') {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    return { data: {}, body: raw.trim() };
  }

  const frontMatter = lines.slice(1, closingIndex).join('\n');
  const body = lines.slice(closingIndex + 1).join('\n');
  const data = frontMatter.trim().length > 0 ? yaml.parse(frontMatter) : {};

  if (typeof data !== 'object' || data === null) {
    return { data: {}, body: body.trim() };
  }

  return { data: data as Record<string, unknown>, body };
}

function extractStringArray(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
}

function requireString(value: unknown, field: string): string {
  const str = asString(value);
  if (!str) {
    throw new Error(`Missing required field '${field}'.`);
  }
  return str;
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asInteger(value: unknown): number | undefined {
  const parsed = asNumber(value);
  if (typeof parsed === 'number') {
    return Math.trunc(parsed);
  }
  return undefined;
}

function toTemplateError(error: unknown, filePath: string): AgentTemplateError {
  if (error instanceof AgentTemplateError) {
    return error;
  }
  return new AgentTemplateError('brAInwav agent template parsing failure', filePath, error);
}

export { AgentTemplateError };
