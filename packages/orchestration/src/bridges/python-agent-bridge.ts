/**
 * @file_path packages/orchestration/src/bridges/python-agent-bridge.ts
 * @description Bridge for communicating with Python agents via IPC
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-03
 * @version 1.0.0
 * @status active
 * @ai_generated_by claude-3.5-sonnet
 * @ai_provenance_hash implementation_phase_1
 */

import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import winston from 'winston';

export interface PythonAgentConfig {
  pythonPath?: string;
  bridgeScriptPath?: string;
  bridgeModule?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface AgentTaskPayload {
  coordinationId: string;
  phaseId: string;
  phaseName: string;
  requirements: string[];
  dependencies?: string[];
  metadata?: Record<string, unknown>;
  agentType?: 'langgraph' | 'crewai' | 'autogen';
}

export interface AgentTaskResult {
  success: boolean;
  data: Record<string, unknown>;
  errors: string[];
  duration_ms: number;
  agent_id: string;
  timestamp: string;
}

export interface AgentBridgeMessage {
  type: 'result' | 'error' | 'query_response';
  from: string;
  payload: {
    coordinationId?: string;
    queryId?: string;
    result?: AgentTaskResult;
    error?: string;
    data?: unknown;
    id?: string;
  };
}

/**
 * Bridge for Python-TypeScript IPC communication with AI agents
 */
export class PythonAgentBridge extends EventEmitter {
  private logger: winston.Logger;
  private config: PythonAgentConfig;
  private pythonProcess: ChildProcess | null = null;
  private isInitialized = false;
  private pendingTasks = new Map<
    string,
    {
      resolve: (result: AgentTaskResult) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  private pendingQueries = new Map<
    string,
    {
      resolve: (data: unknown) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();

  constructor(config: Partial<PythonAgentConfig> = {}) {
    super();

    this.config = {
      pythonPath: config.pythonPath || 'python3',
      bridgeScriptPath:
        config.bridgeScriptPath ||
        path.resolve(process.cwd(), 'packages/python-agents/src/agent_bridge.py'),
      bridgeModule: config.bridgeModule || 'src.agent_bridge',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
    };

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'python-agent-bridge.log' }),
      ],
    });
  }

  /**
   * Initialize the Python agent bridge
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.logger.info('Initializing Python Agent Bridge');

    try {
      await this.startPythonProcess();
      this.isInitialized = true;
      this.logger.info('Python Agent Bridge initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Python Agent Bridge', { error });
      throw error;
    }
  }

  /**
   * Execute a task using a Python agent
   */
  async executeAgentTask(payload: AgentTaskPayload): Promise<AgentTaskResult> {
    if (!this.isInitialized) {
      throw new Error('Python Agent Bridge not initialized');
    }

    return new Promise((resolve, reject) => {
      const coordinationId = payload.coordinationId;

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingTasks.delete(coordinationId);
        reject(new Error(`Agent task timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      // Store pending task
      this.pendingTasks.set(coordinationId, { resolve, reject, timeout });

      // Send task to Python agent using the canonical bridge protocol
      const message = { type: 'task-assignment', payload };

      this.sendMessageToPython(message);
    });
  }

  /**
   * Query agent status and capabilities
   */
  async queryAgents(queryType: 'status'): Promise<Record<string, unknown>>;
  async queryAgents(queryType: 'capabilities'): Promise<Record<string, string[]>>;
  async queryAgents(
    queryType: 'status' | 'capabilities',
  ): Promise<Record<string, unknown> | Record<string, string[]>> {
    if (!this.isInitialized) {
      throw new Error('Python Agent Bridge not initialized');
    }

    return new Promise((resolve, reject) => {
      const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingQueries.delete(queryId);
        reject(new Error(`Agent query timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      // Store pending query
      this.pendingQueries.set(queryId, {
        resolve: resolve as (data: unknown) => void,
        reject,
        timeout,
      });

      // Send query to Python agent
      const message = {
        type: 'agent-query',
        payload: { queryType, queryId },
      };

      this.sendMessageToPython(message);
    });
  }


  /**
   * Get agent status
   */
  async getAgentStatus(): Promise<Record<string, unknown>> {
    return this.queryAgents('status');
  }

  /**
   * Get agent capabilities
   */
  async getAgentCapabilities(): Promise<Record<string, string[]>> {
    return this.queryAgents('capabilities');
  }

  /**
   * Shutdown the Python agent bridge
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Python Agent Bridge');

    // Send shutdown message
    if (this.pythonProcess && !this.pythonProcess.killed) {
      const message = { type: 'shutdown', payload: {} };
      this.sendMessageToPython(message);
    }

    // Clean up pending tasks and queries
    this.cleanupPendingOperations();

    // Kill Python process
    if (this.pythonProcess) {
      this.pythonProcess.kill('SIGTERM');

      // Force kill after 5 seconds if not terminated
      setTimeout(() => {
        if (this.pythonProcess && !this.pythonProcess.killed) {
          this.pythonProcess.kill('SIGKILL');
        }
      }, 5000);
    }

    this.isInitialized = false;
    this.logger.info('Python Agent Bridge shutdown completed');
  }

  private async startPythonProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.info('Starting Python agent process', {
        pythonPath: this.config.pythonPath,
        scriptPath: this.config.bridgeScriptPath,
      });

      const pythonArgs = ['-m', this.config.bridgeModule!];

      // Discover monorepo root (so tests run from package still resolve python paths)
      const findRepoRoot = (): string => {
        let dir = process.cwd();
        while (true) {
          if (
            fs.existsSync(path.join(dir, 'pnpm-workspace.yaml')) ||
            fs.existsSync(path.join(dir, 'turbo.json')) ||
            fs.existsSync(path.join(dir, '.git'))
          ) {
            return dir;
          }
          const parent = path.dirname(dir);
          if (parent === dir) return process.cwd();
          dir = parent;
        }
      };

      const repoRoot = findRepoRoot();
      const pythonPathParts = [
        // Add the parent so that `src` is recognized as a package (src.__init__.py)
        path.resolve(repoRoot, 'packages/python-agents'),
        // Add src itself to support legacy absolute imports (e.g., 'base_agent')
        path.resolve(repoRoot, 'packages/python-agents/src'),
      ];
      const existingPyPath = process.env.PYTHONPATH || '';
      if (existingPyPath) pythonPathParts.push(existingPyPath);

      this.pythonProcess = spawn(this.config.pythonPath!, pythonArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Ensure local package imports work regardless of current working directory
          PYTHONPATH: pythonPathParts.filter(Boolean).join(path.delimiter),
        },
      });

      // Handle process startup
      this.pythonProcess.on('spawn', () => {
        this.logger.info('Python agent process spawned successfully');
        this.setupProcessHandlers();
        resolve();
      });

      this.pythonProcess.on('error', (error) => {
        this.logger.error('Python agent process error', { error });
        reject(error);
      });

      // Handle process exit during startup
      this.pythonProcess.on('exit', (code, signal) => {
        if (!this.isInitialized) {
          reject(
            new Error(`Python agent process exited during startup: code=${code}, signal=${signal}`),
          );
        }
      });
    });
  }

  private setupProcessHandlers(): void {
    if (!this.pythonProcess) return;

    // Handle stdout messages
    this.pythonProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      const lines = output.split('\n').filter((line: string) => line.trim());

      for (const line of lines) {
        if (line.startsWith('PYTHON_BRIDGE:')) {
          try {
            const messageJson = line.replace('PYTHON_BRIDGE:', '').trim();
            const message: AgentBridgeMessage = JSON.parse(messageJson);
            this.handlePythonMessage(message);
          } catch (error) {
            this.logger.error('Failed to parse Python message', {
              line,
              error,
            });
          }
        } else {
          // Regular Python output (for debugging)
          this.logger.debug('Python output', { output: line });
        }
      }
    });

    // Handle stderr
    this.pythonProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      this.logger.warn('Python stderr', { error });
    });

    // Handle process exit
    this.pythonProcess.on('exit', (code, signal) => {
      this.logger.info('Python agent process exited', { code, signal });
      this.isInitialized = false;
      this.cleanupPendingOperations();
      this.emit('processExit', { code, signal });
    });

    // Handle process close
    this.pythonProcess.on('close', (code, signal) => {
      this.logger.info('Python agent process closed', { code, signal });
      this.pythonProcess = null;
    });
  }

  private handlePythonMessage(message: AgentBridgeMessage): void {
    this.logger.info('Received message from Python', { message });
    const { type, payload } = message;

    switch (type) {
      case 'result':
        this.handleTaskResult(payload);
        break;
      case 'error':
        this.handleTaskError(payload);
        break;
      case 'query_response':
        this.handleQueryResponse(payload);
        break;
      default:
        this.logger.warn('Unknown message type from Python', { type, payload });
    }
  }

  private handleTaskResult(payload: {
    coordinationId?: string;
    result?: AgentTaskResult;
  }): void {
    this.logger.info('Handling task result', { payload });
    const { coordinationId, result } = payload;

    if (!coordinationId || !result) {
      this.logger.warn('Malformed task result payload', { payload });
      return;
    }

    const pendingTask = this.pendingTasks.get(coordinationId);
    if (pendingTask) {
      clearTimeout(pendingTask.timeout);
      this.pendingTasks.delete(coordinationId);
      pendingTask.resolve(result);
    } else {
      this.logger.warn('Received result for unknown coordination ID', {
        coordinationId,
      });
    }
  }

  private handleTaskError(payload: { coordinationId?: string; error?: string }): void {
    const coordinationId = payload.coordinationId;
    const error = payload.error ?? 'Unknown error from Python agent';

    if (!coordinationId) {
      this.logger.warn('Received error without coordination ID', { payload });
      return;
    }

    const pendingTask = this.pendingTasks.get(coordinationId);
    if (pendingTask) {
      clearTimeout(pendingTask.timeout);
      this.pendingTasks.delete(coordinationId);
      pendingTask.reject(new Error(error));
    } else {
      this.logger.warn('Received error for unknown coordination ID', {
        coordinationId,
        error,
      });
    }
  }

  private handleQueryResponse(payload: { queryId?: string; data?: unknown }): void {
    const queryId = payload.queryId;
    const data = payload.data;

    if (!queryId) {
      this.logger.warn('Received query response without query ID', { payload });
      return;
    }

    const pendingQuery = this.pendingQueries.get(queryId);
    if (pendingQuery) {
      clearTimeout(pendingQuery.timeout);
      this.pendingQueries.delete(queryId);
      pendingQuery.resolve(data);
    } else {
      this.logger.warn('Received query response for unknown query ID', {
        queryId,
      });
    }
  }

  private sendMessageToPython(message: unknown): void {
    if (!this.pythonProcess?.stdin) {
      throw new Error('Python process not available');
    }

    try {
      const messageJson = JSON.stringify(message as Record<string, unknown>);
      this.pythonProcess.stdin.write(messageJson + '\n');
      this.logger.debug('Sent message to Python', { message });
    } catch (error) {
      this.logger.error('Failed to send message to Python', { error });
      throw error;
    }
  }

  private cleanupPendingOperations(): void {
    // Clean up pending tasks
    for (const [_coordinationId, pendingTask] of this.pendingTasks) {
      clearTimeout(pendingTask.timeout);
      pendingTask.reject(new Error('Python agent bridge shutdown'));
    }
    this.pendingTasks.clear();

    // Clean up pending queries
    for (const [_queryId, pendingQuery] of this.pendingQueries) {
      clearTimeout(pendingQuery.timeout);
      pendingQuery.reject(new Error('Python agent bridge shutdown'));
    }
    this.pendingQueries.clear();
  }

  /**
   * Get bridge statistics
   */
  getStatistics(): {
    isInitialized: boolean;
    pendingTasks: number;
    pendingQueries: number;
    processId: number | null;
  } {
    return {
      isInitialized: this.isInitialized,
      pendingTasks: this.pendingTasks.size,
      pendingQueries: this.pendingQueries.size,
      processId: this.pythonProcess?.pid || null,
    };
  }
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
