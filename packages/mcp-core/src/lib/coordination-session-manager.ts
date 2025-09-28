export enum CoordinationRole {
        COORDINATOR = 'coordinator',
        EXECUTOR = 'executor',
        VALIDATOR = 'validator',
        OBSERVER = 'observer',
}

export enum CoordinationStrategy {
        SEQUENTIAL = 'sequential',
        PARALLEL = 'parallel',
        ADAPTIVE = 'adaptive',
        HIERARCHICAL = 'hierarchical',
}

export interface SecurityContext {
        readonly isolationLevel: 'strict' | 'moderate' | 'relaxed';
        readonly permissions: {
                readonly canCreateAgents: boolean;
                readonly canManageWorkspace: boolean;
                readonly canAccessHistory: boolean;
                readonly canEmitEvents: boolean;
        };
        readonly accessControls: {
                readonly allowedAgentIds: string[];
                readonly restrictedResources: string[];
                readonly maxConcurrentOperations: number;
        };
}

export interface AgentMetadata {
        readonly createdBy: 'brAInwav';
        readonly lastActive: Date;
        readonly trustLevel: number;
}

export interface Agent {
        readonly id: string;
        readonly name: string;
        readonly role: CoordinationRole;
        readonly status: 'available' | 'busy' | 'offline' | 'error';
        readonly capabilities: string[];
        readonly workspaceId?: string;
        readonly sessionId?: string;
        readonly metadata: AgentMetadata;
}

export interface CoordinationTask {
        readonly id: string;
        readonly name: string;
        readonly description: string;
        assignedAgent?: string;
        readonly dependencies: string[];
        status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
        readonly priority: number;
        readonly estimatedDuration: number;
        readonly metadata: Record<string, unknown>;
}

export interface CoordinationSessionMetadata {
        readonly createdBy: 'brAInwav';
        readonly createdAt: Date;
        readonly updatedAt: Date;
        readonly nOArchitecture: boolean;
        readonly workspaceId?: string;
        readonly sessionId?: string;
}

export interface CoordinationSession {
        readonly id: string;
        readonly name: string;
        readonly description?: string;
        readonly strategy: CoordinationStrategy;
        readonly agents: Agent[];
        readonly tasks: CoordinationTask[];
        readonly securityContext: SecurityContext;
        readonly metadata: CoordinationSessionMetadata;
        readonly status: 'active' | 'completed' | 'failed' | 'cancelled';
}

export interface CoordinationSessionManagerOptions {
        readonly maxSessions?: number;
        readonly agentLimit?: number;
        readonly taskLimit?: number;
}

export class CoordinationSessionManager {
        private readonly sessions = new Map<string, CoordinationSession>();
        private readonly maxSessions: number;
        private readonly agentLimit: number;
        private readonly taskLimit: number;

        constructor(options: CoordinationSessionManagerOptions = {}) {
                this.maxSessions = options.maxSessions ?? 100;
                this.agentLimit = options.agentLimit ?? 50;
                this.taskLimit = options.taskLimit ?? 200;
        }

        saveSession(session: CoordinationSession): CoordinationSession {
                const limitedSession = this.applyLimits(session);
                this.sessions.set(session.id, limitedSession);
                this.enforceSessionLimit();
                return limitedSession;
        }

        getSession(coordinationId: string): CoordinationSession | undefined {
                return this.sessions.get(coordinationId);
        }

        deleteSession(coordinationId: string): boolean {
                return this.sessions.delete(coordinationId);
        }

        listSessions(): CoordinationSession[] {
                return Array.from(this.sessions.values());
        }

        reset(): void {
                this.sessions.clear();
        }

        private applyLimits(session: CoordinationSession): CoordinationSession {
                const limitedAgents = session.agents.slice(0, this.agentLimit);
                const limitedTasks = session.tasks.slice(-this.taskLimit);

                return {
                        ...session,
                        agents: limitedAgents,
                        tasks: limitedTasks,
                };
        }

        private enforceSessionLimit(): void {
                while (this.sessions.size > this.maxSessions) {
                        const oldestKey = this.sessions.keys().next().value as string | undefined;
                        if (!oldestKey) break;
                        this.sessions.delete(oldestKey);
                }
        }
}
