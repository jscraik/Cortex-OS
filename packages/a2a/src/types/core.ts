/**
 * @file Core A2A Protocol Types
 * @description Core agent definitions, capabilities, and provider information
 * Split from external-types.ts for better maintainability
 */

// --8<-- [start:AgentProvider]
/**
 * Represents the service provider of an agent.
 *
 * @TJS-examples [{ "organization": "Google", "url": "https://ai.google.dev" }]
 */
export interface AgentProvider {
  /** The name of the agent provider's organization. */
  organization: string;
  /** A URL for the agent provider's website or relevant documentation. */
  url: string;
}
// --8<-- [end:AgentProvider]

// --8<-- [start:AgentCapabilities]
/**
 * Defines optional capabilities supported by an agent.
 */
export interface AgentCapabilities {
  /** Indicates if the agent supports Server-Sent Events (SSE) for streaming responses. */
  streaming?: boolean;
  /** Indicates if the agent supports sending push notifications for asynchronous task updates. */
  pushNotifications?: boolean;
  /** Indicates if the agent provides a history of state transitions for a task. */
  stateTransitionHistory?: boolean;
  /** A list of protocol extensions supported by the agent. */
  extensions?: AgentExtension[];
}
// --8<-- [end:AgentCapabilities]

// --8<-- [start:AgentExtension]
/**
 * A declaration of a protocol extension supported by an Agent.
 *
 * @TJS-examples [{"uri": "https://developers.google.com/identity/protocols/oauth2", "description": "Google OAuth 2.0 authentication", "required": false}]
 */
export interface AgentExtension {
  /** The unique URI identifying the extension. */
  uri: string;
  /** A human-readable description of how this agent uses the extension. */
  description?: string;
  /**
   * If true, the client must understand and comply with the extension's requirements
   * to interact with the agent.
   */
  required?: boolean;
}
// --8<-- [end:AgentExtension]

// --8<-- [start:AgentSkill]
/**
 * A skill that an agent can perform.
 *
 * @TJS-examples [{ "name": "search_web", "description": "Search the web for information", "parameters": { "properties": { "query": { "type": "string" } }, "required": ["query"] } }]
 */
export interface AgentSkill {
  /** The name of the skill. Must be unique per agent. */
  name: string;
  /** A brief human-readable description of the skill. */
  description: string;
  /** A longer, more detailed description of the skill. */
  longDescription?: string;
  /**
   * JSON Schema for the parameters accepted by this skill.
   * If not provided, the skill accepts no parameters.
   */
  parameters?: object;
  /**
   * JSON Schema for the data returned by this skill.
   * If not provided, the skill returns no data.
   */
  response?: object;
  /** The agent-specific implementation identifier. */
  implementation?: string;
}
// --8<-- [end:AgentSkill]

// --8<-- [start:TransportProtocol]
/**
 * Transport protocol for agent communication.
 */
export enum TransportProtocol {
  HTTP = 'http',
  HTTPS = 'https',
  WS = 'ws',
  WSS = 'wss'
}
// --8<-- [end:TransportProtocol]

// --8<-- [start:AgentInterface]
/**
 * Defines how to connect to and interact with an agent.
 */
export interface AgentInterface {
  /** The primary transport protocol. */
  transport: TransportProtocol;
  /** The URI where the agent can be reached. */
  uri: string;
  /** Optional secondary transport configurations. */
  fallback?: {
    transport: TransportProtocol;
    uri: string;
  }[];
}
// --8<-- [end:AgentInterface]

// --8<-- [start:AgentCard]
/**
 * Comprehensive information about an agent and its capabilities.
 */
export interface AgentCard {
  /** Metadata about the agent. */
  agent: {
    /** The name of the agent. */
    name: string;
    /** The version of the agent. */
    version: string;
    /** A description of the agent. */
    description?: string;
    /** Information about the agent provider. */
    provider?: AgentProvider;
    /** Optional capabilities supported by the agent. */
    capabilities?: AgentCapabilities;
    /** Optional license information. */
    license?: string;
    /** Optional documentation URL. */
    documentation?: string;
    /** Optional tags for categorization. */
    tags?: string[];
  };
  
  /** How to connect to and interact with the agent. */
  interface: AgentInterface;
  
  /** A list of skills this agent can perform. */
  skills: AgentSkill[];
}