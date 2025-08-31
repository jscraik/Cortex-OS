/**
 * A2A Agent Interfaces
 * Defines the core interfaces for agent-to-agent communication and coordination
 */

export interface AgentInterface {
  id: string;
  name: string;
  capabilities: AgentCapabilities;
  status: 'online' | 'offline' | 'busy';
  metadata: Record<string, any>;
}

export interface AgentCapabilities {
  skills: AgentSkill[];
  supportedProtocols: TransportProtocol[];
  maxConcurrentTasks: number;
  streaming?: boolean;
  pushNotifications?: boolean;
  stateTransitionHistory?: boolean;
  extensions?: Array<{
    uri: string;
    description: string;
    required?: boolean;
  }>;
  resourceLimits: {
    memoryMB: number;
    cpuPercent: number;
    timeoutMs: number;
  };
}

export interface AgentSkill {
  name: string;
  description: string;
  longDescription?: string;
  parameters: Record<string, any>;
  returns?: string;
  response?: Record<string, any>;
  implementation?: string;
}

export interface AgentExtension {
  name: string;
  version: string;
  capabilities: string[];
  endpoints: AgentEndpoint[];
}

export interface AgentEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
}

export interface AgentProvider {
  register(agent: AgentInterface): Promise<void>;
  unregister(agentId: string): Promise<void>;
  discover(capabilities?: string[]): Promise<AgentInterface[]>;
  getAgent(agentId: string): Promise<AgentInterface | null>;
}

export interface AgentCard {
  agent: {
    name: string;
    version: string;
    description: string;
    provider: {
      organization: string;
      url: string;
    };
    capabilities: AgentCapabilities;
    license?: string;
    documentation?: string;
    tags?: string[];
  };
  interface: {
    transport: TransportProtocol;
    uri: string;
  };
  skills: AgentSkill[];
}

export enum TransportProtocol {
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  MQTT = 'mqtt',
  GRPC = 'grpc',
  LOCAL = 'local',
}

export interface A2AMessage {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification' | 'error';
  protocol: TransportProtocol;
  payload: any;
  timestamp: Date;
  correlationId?: string;
  ttl?: number;
  // Additional properties for skill execution
  action?: string;
  params?: Record<string, any>;
}

export interface A2ARequest extends A2AMessage {
  type: 'request';
  method: string;
  parameters: Record<string, any>;
}

export interface A2AResponse extends A2AMessage {
  type: 'response';
  status: 'success' | 'error';
  result?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
