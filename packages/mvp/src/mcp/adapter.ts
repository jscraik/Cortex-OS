/**
 * @file mcp/adapter.ts
 * @description MCP Adapter for Cortex Kernel Integration
 */

import { PRPState } from '../state.js';

export interface Neuron {
  id: string;
  role: string;
  phase: 'strategy' | 'build' | 'evaluation';
  dependencies: string[];
  tools: string[];
  requiresLLM?: boolean;
  execute(state: any, context: any): Promise<NeuronResult>;
}

export interface NeuronResult {
  output: any;
  evidence: any[];
  nextSteps: string[];
  artifacts: any[];
  metrics: ExecutionMetrics;
}

export interface ExecutionMetrics {
  startTime: string;
  endTime: string;
  duration: number;
  toolsUsed: string[];
  filesCreated: number;
  filesModified: number;
  commandsExecuted: number;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  execute(params: any, context: MCPContext): Promise<any>;
}

export interface MCPContext {
  prpState: PRPState;
  workingDirectory: string;
  toolsEnabled: string[];
  securityPolicy: {
    allowFileSystem: boolean;
    allowNetwork: boolean;
    allowExecution: boolean;
  };
}

export interface PRPOrchestrator {
  getNeuronCount(): number;
  executeNeuron?(neuronId: string, state: PRPState, context: any): Promise<any>;
}

export class MCPAdapter {
  private tools: Map<string, MCPTool> = new Map();
  private contexts: Map<string, MCPContext> = new Map();

  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  createContext(
    prpState: PRPState,
    options: {
      workingDirectory?: string;
      enabledTools?: string[];
      securityPolicy?: Partial<MCPContext['securityPolicy']>;
    } = {},
  ): MCPContext {
    const context: MCPContext = {
      prpState,
      workingDirectory: options.workingDirectory || process.cwd(),
      toolsEnabled: options.enabledTools || Array.from(this.tools.keys()),
      securityPolicy: {
        allowFileSystem: true,
        allowNetwork: false,
        allowExecution: true,
        ...options.securityPolicy,
      },
    };

    this.contexts.set(prpState.runId, context);
    return context;
  }

  async executeTool(
    toolName: string,
    params: any,
    runId: string,
  ): Promise<{
    result: any;
    evidence: { toolName: string; params: any; result: any; timestamp: string };
  }> {
    const tool = this.tools.get(toolName);
    if (!tool) throw new Error(`MCP tool not found: ${toolName}`);

    const context = this.contexts.get(runId);
    if (!context) throw new Error(`MCP context not found for run: ${runId}`);

    if (!context.toolsEnabled.includes(toolName)) {
      throw new Error(`MCP tool not enabled: ${toolName}`);
    }

    const result = await tool.execute(params, context);
    const evidence = {
      toolName,
      params,
      result,
      timestamp: new Date().toISOString(),
    };
    return { result, evidence };
  }

  createNeuronFromTool(tool: MCPTool, phase: 'strategy' | 'build' | 'evaluation'): Neuron {
    return {
      id: `mcp-${tool.name}`,
      role: `mcp-tool-${tool.name}`,
      phase,
      dependencies: [],
      tools: [tool.name],
      requiresLLM: false,
      execute: async (state: PRPState, context: any) => {
        this.createContext(state, { workingDirectory: context.workingDirectory });
        const params = this.extractToolParams(state.blueprint, tool);
        const execution = await this.executeTool(tool.name, params, state.runId);
        return {
          output: { toolName: tool.name, result: execution.result, mcpIntegration: true },
          evidence: [
            {
              id: `mcp-${tool.name}-${Date.now()}`,
              type: 'command',
              source: `mcp-${tool.name}`,
              content: JSON.stringify(execution.evidence),
              timestamp: new Date().toISOString(),
              phase,
            },
          ],
          nextSteps: [`Review ${tool.name} output`],
          artifacts: [],
          metrics: {
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            duration: 0,
            toolsUsed: [tool.name],
            filesCreated: 0,
            filesModified: 0,
            commandsExecuted: 1,
          },
        };
      },
    };
  }

  private extractToolParams(blueprint: PRPState['blueprint'], tool: MCPTool): any {
    return {
      title: blueprint.title,
      description: blueprint.description,
      requirements: blueprint.requirements,
      toolName: tool.name,
    };
  }

  getAvailableTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  getContext(runId: string): MCPContext | undefined {
    return this.contexts.get(runId);
  }

  cleanupContext(runId: string): void {
    this.contexts.delete(runId);
  }
}

// Default tools
export const createDefaultMCPTools = (): MCPTool[] => [
  {
    name: 'read_file',
    description: 'Read file content safely within the working directory',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        encoding: { type: 'string', enum: ['utf8', 'utf-8', 'base64'], default: 'utf8' },
      },
      required: ['path'],
    },
    execute: async (
      params: { path: string; encoding?: BufferEncoding },
      context: MCPContext,
    ): Promise<{ content: string; bytes: number; fullPath: string }> => {
      if (!context.securityPolicy.allowFileSystem)
        throw new Error('File system access not allowed');
      const fs = await import('fs');
      const pathMod = await import('path');
      const wd = context.workingDirectory || process.cwd();
      const fullPath = pathMod.resolve(wd, params.path);
      const relative = pathMod.relative(wd, fullPath);
      if (relative.startsWith('..') || pathMod.isAbsolute(relative)) {
        throw new Error(`Access denied: ${params.path} is outside working directory`);
      }
      await fs.promises.access(fullPath, fs.constants.R_OK);
      const encoding = (params.encoding || 'utf8') as BufferEncoding;
      const data = await fs.promises.readFile(fullPath, encoding);
      const stat = await fs.promises.stat(fullPath);
      return { content: data, bytes: stat.size, fullPath };
    },
  },
  {
    name: 'code_analysis',
    description: 'Analyze code quality with ESLint when available',
    inputSchema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string' } },
        code: { type: 'string' },
        language: { type: 'string' },
        cwd: { type: 'string' },
        configPath: { type: 'string' },
      },
      required: [],
    },
    execute: async (params: any, context: MCPContext) => {
      try {
        const { ESLint } = (await import('eslint')) as any;
        const cwd = (params.cwd as string) || context.workingDirectory || process.cwd();
        const eslint = new ESLint({ cwd, overrideConfigFile: params.configPath });
        const targets: string[] =
          Array.isArray(params.files) && params.files.length > 0 ? params.files : ['.'];
        const results = await eslint.lintFiles(targets);
        const formatter = await eslint.loadFormatter('stylish');
        const textReport = await formatter.format(results);
        const errorCount = results.reduce((a: number, r: any) => a + r.errorCount, 0);
        const warningCount = results.reduce((a: number, r: any) => a + r.warningCount, 0);
        const issues = results.flatMap((r: any) =>
          r.messages.map((m: any) => ({
            filePath: r.filePath,
            ruleId: m.ruleId,
            severity: m.severity === 2 ? 'error' : 'warning',
            message: m.message,
            line: m.line,
            column: m.column,
          })),
        );
        return {
          tool: 'eslint',
          errorCount,
          warningCount,
          issues,
          summary: `${errorCount} errors, ${warningCount} warnings`,
          report: textReport,
        };
      } catch {
        const code: string = (params.code as string) || '';
        const lines = code ? code.split('\n') : [];
        return {
          tool: 'heuristic',
          errorCount: 0,
          warningCount: 0,
          issues: [],
          summary: 'ESLint not available; returned heuristic metrics',
          metrics: { linesOfCode: lines.length },
        };
      }
    },
  },
  {
    name: 'test_runner',
    description: 'Execute tests (Vitest/Jest) with optional coverage',
    inputSchema: {
      type: 'object',
      properties: {
        testPath: { type: 'string' },
        framework: { type: 'string', enum: ['vitest', 'jest', 'auto'], default: 'auto' },
        coverage: { type: 'boolean', default: true },
        cwd: { type: 'string' },
      },
    },
    execute: async (params: any, context: MCPContext) => {
      if (!context.securityPolicy.allowExecution) throw new Error('Code execution not allowed');
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      const cwd = (params.cwd as string) || context.workingDirectory || process.cwd();
      const coverage = params.coverage !== false;
      const framework = (params.framework || 'auto') as string;
      const escape = (s: string) => s.replaceAll('"', '\\"');

      let cmd = '';
      if (framework === 'vitest' || framework === 'auto') {
        try {
          await execAsync('pnpm vitest --version', { cwd, timeout: 5000 });
          const cov = coverage ? '--coverage' : '';
          const target = params.testPath ? ` ${escape(params.testPath)}` : '';
          cmd = `pnpm vitest run --reporter=json ${cov}${target}`.trim();
        } catch {}
      }
      if (!cmd && (framework === 'jest' || framework === 'auto')) {
        try {
          await execAsync('pnpm jest --version', { cwd, timeout: 5000 });
          const cov = coverage ? '--coverage' : '';
          const target = params.testPath ? ` ${escape(params.testPath)}` : '';
          cmd = `pnpm jest --runInBand --reporters=json ${cov}${target}`.trim();
        } catch {}
      }
      if (!cmd) {
        const cov = coverage ? '-- --coverage' : '';
        const target = params.testPath ? ` ${escape(params.testPath)}` : '';
        cmd = `pnpm test${target}${cov}`.trim();
      }

      try {
        const started = Date.now();
        const { stdout, stderr } = await execAsync(cmd, { cwd, maxBuffer: 10 * 1024 * 1024 });
        const duration = Date.now() - started;
        let summary: any = undefined;
        try {
          summary = JSON.parse(stdout);
        } catch {}
        let coveragePct: number | undefined = undefined;
        try {
          const fs = await import('fs');
          const pathMod = await import('path');
          const covPath = pathMod.join(cwd, 'coverage', 'coverage-summary.json');
          if (fs.existsSync(covPath)) {
            const cov = JSON.parse(await fs.promises.readFile(covPath, 'utf8'));
            const totals = cov.total || {};
            const keys = ['statements', 'branches', 'functions', 'lines'] as const;
            const vals = keys.map((k) => totals[k]?.pct).filter((v: any) => typeof v === 'number');
            if (vals.length)
              coveragePct = Math.round(
                vals.reduce((a: number, b: number) => a + b, 0) / vals.length,
              );
          }
        } catch {}
        let passed = 0,
          failed = 0,
          total = 0;
        if (summary && summary.numPassedTests !== undefined) {
          passed = summary.numPassedTests;
          failed = summary.numFailedTests || 0;
          total = summary.numTotalTests || passed + failed;
        }
        return {
          command: cmd,
          durationMs: duration,
          stdout: summary ? undefined : stdout,
          stderr: stderr || undefined,
          totals: { passed, failed, total },
          coverage: coveragePct,
        };
      } catch (err: any) {
        return {
          command: cmd,
          error: err?.message || String(err),
          stdout: err?.stdout,
          stderr: err?.stderr,
        };
      }
    },
  },
];

// Discover MCP servers from .cortex context (optional)
export async function discoverMCPServers(
  fromDir?: string,
): Promise<{ name: string; url: string; type: string }[]> {
  try {
    const fs = await import('fs');
    const pathMod = await import('path');
    const root = fromDir || process.cwd();
    const cfgPath = pathMod.join(root, '.cortex', 'mcp.runtime.json');
    if (!fs.existsSync(cfgPath)) return [];
    const raw = await fs.promises.readFile(cfgPath, 'utf8');
    const json = JSON.parse(raw);
    const servers = json?.servers || {};
    return Object.keys(servers)
      .map((k) => ({
        name: servers[k].name || k,
        url: servers[k].url,
        type: servers[k].type || servers[k].transport || 'http',
      }))
      .filter((s) => !!s.url);
  } catch {
    return [];
  }
}
