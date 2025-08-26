/**
 * @file_path packages/orchestration/src/crewai-coordinator.ts
 * @description CrewAI integration for role-based multi-agent coordination with hierarchical decision-making
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-03
 * @version 1.0.0
 * @status active
 * @ai_generated_by claude-3.5-sonnet
 * @ai_provenance_hash phase2_crewai_integration
 */

import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';
import path from 'path';
import { v4 as uuid } from 'uuid';
import winston from 'winston';
import { z } from 'zod';
import {
  PythonAgentBridge,
  AgentTaskPayload,
  AgentTaskResult,
} from './bridges/python-agent-bridge.js';
import { AgentRole } from './types.js';

// CrewAI specific schemas
const CrewAIAgentSchema = z.object({
  id: z.string(),
  role: z.string(),
  goal: z.string(),
  backstory: z.string(),
  allowDelegation: z.boolean().default(true),
  verbose: z.boolean().default(false),
  maxIter: z.number().default(5),
  memory: z.boolean().default(true),
  tools: z.array(z.string()).default([]),
  decisionMaking: z.enum(['hierarchical', 'democratic']).default('hierarchical'),
  conflictResolution: z
    .enum(['consensus-based', 'authority-based', 'voting'])
    .default('consensus-based'),
});

const CrewAITaskSchema = z.object({
  description: z.string(),
  agent: z.string(),
  expectedOutput: z.string(),
  tools: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  asyncExecution: z.boolean().default(false),
});

const CrewAICrewSchema = z.object({
  agents: z.array(CrewAIAgentSchema),
  tasks: z.array(CrewAITaskSchema),
  process: z.enum(['sequential', 'hierarchical']).default('sequential'),
  verbose: z.boolean().default(false),
  memory: z.boolean().default(true),
});

export type CrewAIAgent = z.infer<typeof CrewAIAgentSchema>;
export type CrewAITask = z.infer<typeof CrewAITaskSchema>;
export type CrewAICrew = z.infer<typeof CrewAICrewSchema>;

export interface CrewAIConfig {
  pythonPath?: string;
  crewaiScriptPath?: string;
  timeout?: number;
  maxRetries?: number;
  enableLogging?: boolean;
  logLevel?: string;
}

export interface CrewAICoordinationRequest {
  coordinationId: string;
  agents: CrewAIAgent[];
  tasks: CrewAITask[];
  process: 'sequential' | 'hierarchical';
  context?: Record<string, unknown>;
}

export interface CrewAICoordinationResult {
  coordinationId: string;
  success: boolean;
  results: Record<string, unknown>;
  agentOutputs: Record<string, unknown>;
  executionTime: number;
  errors: string[];
}

/**
 * CrewAI Coordinator for role-based multi-agent coordination
 * Provides hierarchical decision-making and specialized agent roles
 */
export class CrewAICoordinator extends EventEmitter {
  private logger!: winston.Logger;
  private config: CrewAIConfig;
  private pythonBridge!: PythonAgentBridge;
  private activeCrews!: Map<string, ChildProcess>;
  private agentRoles!: Map<string, AgentRole>;

  constructor(config: Partial<CrewAIConfig> = {}) {
    super();

    this.config = {
      pythonPath: 'python3',
      crewaiScriptPath:
        process.env.CREWAI_SCRIPT_PATH || path.join(__dirname, '../../../scripts/crewai-bridge.py'),
      timeout: 300000, // 5 minutes
      maxRetries: 3,
      enableLogging: true,
      logLevel: 'info',
      ...config,
    };

    this.setupLogger();
    this.initializeDataStructures();
    this.initializePythonBridge();
  }

  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: this.config.logLevel,
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      defaultMeta: { service: 'crewai-coordinator' },
      transports: [new winston.transports.Console()],
    });
  }

  private initializeDataStructures(): void {
    this.activeCrews = new Map();
    this.agentRoles = new Map([
      ['architect', AgentRole.SPECIALIST],
      ['coder', AgentRole.EXECUTOR],
      ['analyst', AgentRole.PLANNER],
      ['tester', AgentRole.VALIDATOR],
      ['coordinator', AgentRole.COORDINATOR],
    ]);
  }

  private initializePythonBridge(): void {
    this.pythonBridge = new PythonAgentBridge({
      pythonPath: this.config.pythonPath,
      bridgeScriptPath: this.config.crewaiScriptPath,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });

    this.pythonBridge.on('result', (result: AgentTaskResult) => {
      this.handleCrewResult(result);
    });

    this.pythonBridge.on('error', (error: string) => {
      this.logger.error('CrewAI Python bridge error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Create and configure a CrewAI crew for role-based coordination
   */
  async createCrew(request: CrewAICoordinationRequest): Promise<string> {
    try {
      this.logger.info('Creating CrewAI crew', {
        coordinationId: request.coordinationId,
      });

      // Validate the crew configuration
      const crewConfig: CrewAICrew = {
        agents: request.agents,
        tasks: request.tasks,
        process: request.process,
        verbose: this.config.enableLogging || false,
        memory: true,
      };

      CrewAICrewSchema.parse(crewConfig);

      // Create the crew via Python bridge
      const taskPayload: AgentTaskPayload = {
        coordinationId: request.coordinationId,
        phaseId: uuid(),
        phaseName: 'crew-creation',
        requirements: ['create-crew'],
        metadata: {
          crewConfig,
          context: request.context,
        },
        agentType: 'crewai',
      };

      await this.pythonBridge.executeTask(taskPayload);

      this.emit('crew-created', {
        coordinationId: request.coordinationId,
        agentCount: request.agents.length,
        taskCount: request.tasks.length,
      });

      return request.coordinationId;
    } catch (error) {
      this.logger.error('Failed to create CrewAI crew:', error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`CrewAI crew creation failed: ${msg}`);
    }
  }

  /**
   * Execute a coordination task using CrewAI hierarchical decision-making
   */
  async coordinateExecution(coordinationId: string): Promise<CrewAICoordinationResult> {
    try {
      this.logger.info('Starting CrewAI coordination execution', {
        coordinationId,
      });

      const taskPayload: AgentTaskPayload = {
        coordinationId,
        phaseId: uuid(),
        phaseName: 'crew-execution',
        requirements: ['execute-crew'],
        metadata: {
          enableHierarchicalDecisionMaking: true,
          conflictResolution: 'consensus-based',
        },
        agentType: 'crewai',
      };

      const result = await this.pythonBridge.executeTask(taskPayload);

      const coordinationResult: CrewAICoordinationResult = {
        coordinationId,
        success: result.success,
        results: result.data,
        agentOutputs: (result.data.agentOutputs || {}) as Record<string, unknown>,
        executionTime: result.duration_ms,
        errors: result.errors,
      };

      this.emit('coordination-completed', coordinationResult);
      return coordinationResult;
    } catch (error) {
      this.logger.error('CrewAI coordination execution failed:', error);
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`CrewAI coordination failed: ${msg}`);
    }
  }

  /**
   * Handle specialized agent roles (Architect, Coder, Analyst, Tester)
   */
  async assignSpecializedRole(
    agentId: string,
    role: string,
    capabilities: string[],
  ): Promise<void> {
    const specializedConfig = this.createSpecializedAgentConfig(role, capabilities);

    const taskPayload: AgentTaskPayload = {
      coordinationId: agentId,
      phaseId: uuid(),
      phaseName: 'role-assignment',
      requirements: ['assign-specialized-role'],
      metadata: {
        agentId,
        role,
        capabilities,
        config: specializedConfig,
      },
      agentType: 'crewai',
    };

    await this.pythonBridge.executeTask(taskPayload);

    this.emit('role-assigned', { agentId, role, capabilities });
  }

  /**
   * Implement conflict resolution and consensus mechanisms
   */
  async resolveConflict(
    coordinationId: string,
    conflictType: string,
    conflictData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    this.logger.info('Resolving CrewAI coordination conflict', {
      coordinationId,
      conflictType,
    });

    const taskPayload: AgentTaskPayload = {
      coordinationId,
      phaseId: uuid(),
      phaseName: 'conflict-resolution',
      requirements: ['resolve-conflict'],
      metadata: {
        conflictType,
        conflictData,
        resolutionStrategy: 'consensus-based',
      },
      agentType: 'crewai',
    };

    const result = await this.pythonBridge.executeTask(taskPayload);

    this.emit('conflict-resolved', {
      coordinationId,
      conflictType,
      resolution: result.data,
    });

    return result.data;
  }

  private createSpecializedAgentConfig(role: string, capabilities: string[]): CrewAIAgent {
    const roleConfigs = {
      architect: {
        goal: 'Design robust, scalable, and maintainable software architectures',
        backstory:
          'Experienced architect with deep knowledge of design patterns and system architecture',
        tools: ['code-analysis', 'pattern-matcher', 'dependency-analyzer'],
      },
      coder: {
        goal: 'Implement high-quality, tested, and documented code',
        backstory:
          'Senior developer with expertise in multiple programming languages and best practices',
        tools: ['code-generator', 'refactor-tool', 'test-generator'],
      },
      analyst: {
        goal: 'Analyze requirements and provide detailed specifications',
        backstory:
          'Business analyst with strong technical background and requirement engineering skills',
        tools: ['requirement-analyzer', 'specification-generator', 'stakeholder-mapper'],
      },
      tester: {
        goal: 'Ensure software quality through comprehensive testing strategies',
        backstory: 'QA engineer with expertise in testing methodologies and automation',
        tools: ['test-planner', 'test-generator', 'quality-validator'],
      },
    };

    const validRoles = ['architect', 'coder', 'analyst', 'tester'] as const;
    const typedRole = (validRoles as readonly string[]).includes(role)
      ? (role as (typeof validRoles)[number])
      : 'architect';
    const config = roleConfigs[typedRole];

    return {
      id: uuid(),
      role,
      goal: config.goal,
      backstory: config.backstory,
      allowDelegation: true,
      verbose: this.config.enableLogging || false,
      maxIter: 5,
      memory: true,
      tools: [...config.tools, ...capabilities],
      decisionMaking: 'hierarchical',
      conflictResolution: 'consensus-based',
    };
  }

  private handleCrewResult(result: AgentTaskResult): void {
    this.logger.info('CrewAI coordination result received', {
      coordinationId: result.agent_id,
      success: result.success,
      duration: result.duration_ms,
    });

    this.emit('result', result);
  }

  /**
   * Clean up resources and active crews
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down CrewAI coordinator');

    // Terminate active crews
    for (const [coordinationId, process] of this.activeCrews) {
      this.logger.info('Terminating crew process', { coordinationId });
      process.kill('SIGTERM');
    }

    this.activeCrews.clear();
    await this.pythonBridge.shutdown();

    this.emit('shutdown-complete');
  }
}

// © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
