#!/usr/bin/env node

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const GIT_COMMAND_TIMEOUT = 10000;

function readJsonSafe(p) {
  try {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function getMLXModels() {
  const cfg = readJsonSafe(path.resolve(process.cwd(), 'cortex-config.json'));
  const router = readJsonSafe(path.resolve(process.cwd(), 'claude-code-router-config.json'));
  const models = new Set();

  // Prefer models listed in the router config
  const providers = Array.isArray(router?.providers)
    ? router.providers
    : Array.isArray(router?.Providers)
      ? router.Providers
      : [];
  for (const pvd of providers) {
    try {
      if (pvd && pvd.name === 'mlx' && Array.isArray(pvd.models)) {
        pvd.models.forEach((m) => typeof m === 'string' && models.add(m));
      }
    } catch {}
  }

  // Also traverse cortex-config.json models to discover MLX-backed entries
  try {
    if (cfg && cfg.models && typeof cfg.models === 'object') {
      for (const [category, group] of Object.entries(cfg.models)) {
        if (group && typeof group === 'object') {
          for (const [modelKey, def] of Object.entries(group)) {
            if (
              def &&
              typeof def === 'object' &&
              typeof def.path === 'string' &&
              def.path.includes('mlx')
            ) {
              // Use category/key as a stable display name
              models.add(`${category}/${modelKey}`);
            }
          }
        }
      }
    }
  } catch {}

  return Array.from(models);
}

function getOllamaModels() {
  try {
    const out = execSync('ollama list --format json', {
      encoding: 'utf8',
      timeout: 5000,
    });
    const lines = out.trim().split(/\r?\n/);
    const names = [];
    for (const line of lines) {
      try {
        const j = JSON.parse(line);
        if (j && j.name) names.push(j.name);
      } catch {
        // skip
      }
    }
    return names;
  } catch (e) {
    return [];
  }
}

function runSqliteQuery(dbPath, sql) {
  const resolved = path.resolve(process.cwd(), dbPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`SQLite DB not found at ${resolved}`);
  }
  const cmd = `sqlite3 -json ${JSON.stringify(resolved)} ${JSON.stringify(sql)}`;
  const res = spawnSync('bash', ['-lc', cmd], {
    encoding: 'utf8',
    timeout: 8000,
  });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(res.stderr || 'sqlite3 error');
  const txt = (res.stdout || '').trim();
  try {
    return JSON.parse(txt || '[]');
  } catch {
    return [];
  }
}
const readline = require('readline');

class CortexMCPServer {
  constructor() {
    this.serverInfo = {
      name: 'cortex-operations',
      version: '1.0.0',
    };

    this.capabilities = {
      tools: {
        listChanged: false,
      },
    };

    this.tools = [
      {
        name: 'git_status',
        description: 'Get git repository status',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'git_diff',
        description: 'Get git diff output',
        inputSchema: {
          type: 'object',
          properties: {
            args: {
              type: 'array',
              items: { type: 'string' },
              description: 'Git diff arguments',
            },
          },
          required: [],
        },
      },
      {
        name: 'cortex_build',
        description: 'Run pnpm build',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'cortex_test',
        description: 'Run pnpm test',
        inputSchema: {
          type: 'object',
          properties: {
            args: {
              type: 'array',
              items: { type: 'string' },
              description: 'Test arguments',
            },
          },
          required: [],
        },
      },
      {
        name: 'cortex_lint',
        description: 'Run pnpm lint',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'memory_stats',
        description: 'Show memory stats (read-only)',
        inputSchema: {
          type: 'object',
          properties: {
            dbPath: {
              type: 'string',
              description: 'SQLite DB path',
              default: 'apps/cortex-os/data/cortex-ai.sqlite',
            },
          },
          required: [],
        },
      },
      {
        name: 'memory_list',
        description: 'List memory entries (read-only)',
        inputSchema: {
          type: 'object',
          properties: {
            dbPath: { type: 'string', default: 'apps/cortex-os/data/cortex-ai.sqlite' },
            limit: { type: 'number', default: 50 },
          },
          required: [],
        },
      },
      {
        name: 'memory_search',
        description: 'Search memory entries by text (read-only)',
        inputSchema: {
          type: 'object',
          properties: {
            dbPath: { type: 'string', default: 'apps/cortex-os/data/cortex-ai.sqlite' },
            q: { type: 'string' },
            limit: { type: 'number', default: 50 },
          },
          required: ['q'],
        },
      },
      {
        name: 'mlx_models',
        description: 'List configured MLX models (read-only)',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'ollama_models',
        description: 'List local Ollama models (read-only)',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
    ];
  }

  async handleInitialize(params) {
    return {
      protocolVersion: '2024-11-05',
      capabilities: this.capabilities,
      serverInfo: this.serverInfo,
    };
  }

  async handleListTools() {
    return {
      tools: this.tools,
    };
  }

  async handleCallTool(params) {
    const { name, arguments: args = {} } = params;

    try {
      let result;

      switch (name) {
        case 'git_status':
          result = execSync('git status --porcelain', {
            encoding: 'utf8',
            timeout: GIT_COMMAND_TIMEOUT,
          });
          break;

        case 'git_diff':
          const diffArgs = args.args || ['--cached'];
          const diffResult = spawnSync('git', ['diff', ...diffArgs], {
            encoding: 'utf8',
            timeout: 10000,
          });
          if (diffResult.error) throw diffResult.error;
          result = diffResult.stdout;
          break;

        case 'cortex_build':
          result = execSync('pnpm build', {
            encoding: 'utf8',
            timeout: 60000,
          });
          break;

        case 'cortex_test':
          const testArgs = args.args || [];
          const spawnResult = spawnSync('pnpm', ['test', ...testArgs], {
            encoding: 'utf8',
            timeout: 60000,
          });
          if (spawnResult.error) throw spawnResult.error;
          result = spawnResult.stdout;
          break;

        case 'cortex_lint':
          result = execSync('pnpm lint', {
            encoding: 'utf8',
            timeout: 30000,
          });
          break;

        case 'memory_stats': {
          const dbPath =
            args.dbPath || process.env.MEMORY_DB_PATH || 'apps/cortex-os/data/cortex-ai.sqlite';
          const rows = runSqliteQuery(
            dbPath,
            'SELECT COUNT(*) as total, SUM(LENGTH(value)) as totalBytes FROM memory;',
          );
          result = JSON.stringify(rows[0] || { total: 0, totalBytes: 0 });
          break;
        }

        case 'memory_list': {
          const dbPath =
            args.dbPath || process.env.MEMORY_DB_PATH || 'apps/cortex-os/data/cortex-ai.sqlite';
          const limit = Number(args.limit || 50);
          const rows = runSqliteQuery(
            dbPath,
            `SELECT key, namespace, value, createdAt FROM memory ORDER BY createdAt DESC LIMIT ${limit};`,
          );
          result = JSON.stringify(rows);
          break;
        }

        case 'memory_search': {
          const dbPath =
            args.dbPath || process.env.MEMORY_DB_PATH || 'apps/cortex-os/data/cortex-ai.sqlite';
          const q = String(args.q || '').replaceAll("'", "''");
          const limit = Number(args.limit || 50);
          const sql = `SELECT key, namespace, value, createdAt FROM memory
                       WHERE key LIKE '%${q}%' OR namespace LIKE '%${q}%' OR value LIKE '%${q}%'
                       ORDER BY createdAt DESC LIMIT ${limit};`;
          const rows = runSqliteQuery(dbPath, sql);
          result = JSON.stringify(rows);
          break;
        }

        case 'mlx_models': {
          result = JSON.stringify({ models: getMLXModels() });
          break;
        }

        case 'ollama_models': {
          result = JSON.stringify({ models: getOllamaModels() });
          break;
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: 'text',
            text:
              (typeof result === 'string' ? result : String(result)).trim() ||
              'Command completed successfully',
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async handleRequest(request) {
    const { id, method, params } = request;

    try {
      let result;

      switch (method) {
        case 'initialize':
          result = await this.handleInitialize(params);
          break;

        case 'tools/list':
          result = await this.handleListTools();
          break;

        case 'tools/call':
          result = await this.handleCallTool(params);
          break;

        default:
          throw new Error(`Method not found: ${method}`);
      }

      return {
        jsonrpc: '2.0',
        id,
        result,
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: method === 'initialize' ? -32602 : -32601,
          message: error.message,
        },
      };
    }
  }

  start() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on('line', async (line) => {
      try {
        const request = JSON.parse(line.trim());
        const response = await this.handleRequest(request);
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (error) {
        process.stderr.write(`JSON parse error: ${error.message}\n`);
      }
    });

    rl.on('close', () => {
      process.exit(0);
    });

    // Signal readiness
    process.stderr.write('Cortex MCP Server ready\n');
  }
}

// Start the server
const server = new CortexMCPServer();
server.start();
