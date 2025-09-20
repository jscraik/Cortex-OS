/**
 * @fileoverview Agent Network Error Types
 * @package @cortex-os/orchestration
 * @version 0.1.0
 * @company brAInwav
 */

// Agent Network Error Codes
export enum AgentNetworkErrorCode {
    CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
    AGENT_UNREACHABLE = 'AGENT_UNREACHABLE',
    AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
    AGENT_UNAUTHORIZED = 'AGENT_UNAUTHORIZED',
    INVALID_MESSAGE_FORMAT = 'INVALID_MESSAGE_FORMAT',
    MESSAGE_DELIVERY_FAILED = 'MESSAGE_DELIVERY_FAILED',
    NETWORK_PARTITION = 'NETWORK_PARTITION',
    NETWORK_SHUTDOWN = 'NETWORK_SHUTDOWN',
    ROUTING_FAILURE = 'ROUTING_FAILURE',
    AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
    PROTOCOL_MISMATCH = 'PROTOCOL_MISMATCH',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Agent Network Error Interface
export interface AgentNetworkErrorDetails {
    readonly code: AgentNetworkErrorCode;
    readonly message: string;
    readonly timestamp: Date;
    readonly agentId?: string;
    readonly networkId?: string;
    readonly retryable: boolean;
    readonly metadata?: Record<string, unknown>;
}

// Agent Network Error Class
export class AgentNetworkError extends Error {
    public readonly code: AgentNetworkErrorCode;
    public readonly timestamp: Date;
    public readonly agentId?: string;
    public readonly networkId?: string;
    public readonly retryable: boolean;
    public readonly metadata?: Record<string, unknown>;

    constructor(details: AgentNetworkErrorDetails) {
        super(details.message);
        this.name = 'AgentNetworkError';
        this.code = details.code;
        this.timestamp = details.timestamp;
        this.agentId = details.agentId;
        this.networkId = details.networkId;
        this.retryable = details.retryable;
        this.metadata = details.metadata;

        // Maintain proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AgentNetworkError);
        }
    }

    public toJSON(): AgentNetworkErrorDetails {
        return {
            code: this.code,
            message: this.message,
            timestamp: this.timestamp,
            agentId: this.agentId,
            networkId: this.networkId,
            retryable: this.retryable,
            metadata: this.metadata
        };
    }
}

// Helper function to create network errors
export const createAgentNetworkError = (
    code: AgentNetworkErrorCode,
    message: string,
    options?: {
        agentId?: string;
        networkId?: string;
        retryable?: boolean;
        metadata?: Record<string, unknown>;
    }
): AgentNetworkError => {
    return new AgentNetworkError({
        code,
        message,
        timestamp: new Date(),
        agentId: options?.agentId,
        networkId: options?.networkId,
        retryable: options?.retryable ?? false,
        metadata: options?.metadata
    });
};
