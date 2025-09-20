/**
 * @fileoverview Agent Registry Error Types
 * @package @cortex-os/orchestration
 * @version 0.1.0
 * @company brAInwav
 */

// Agent Registry Error Codes
export enum AgentRegistryErrorCode {
    AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
    AGENT_ALREADY_EXISTS = 'AGENT_ALREADY_EXISTS',
    INVALID_AGENT_CONFIG = 'INVALID_AGENT_CONFIG',
    REGISTRATION_FAILED = 'REGISTRATION_FAILED',
    DEREGISTRATION_FAILED = 'DEREGISTRATION_FAILED',
    CAPABILITY_MISMATCH = 'CAPABILITY_MISMATCH',
    VERSION_INCOMPATIBLE = 'VERSION_INCOMPATIBLE',
    HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
    RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    REGISTRY_UNAVAILABLE = 'REGISTRY_UNAVAILABLE',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Agent Registry Error Interface
export interface AgentRegistryErrorDetails {
    readonly code: AgentRegistryErrorCode;
    readonly message: string;
    readonly timestamp: Date;
    readonly agentId?: string;
    readonly registryId?: string;
    readonly retryable: boolean;
    readonly metadata?: Record<string, unknown>;
}

// Agent Registry Error Class
export class AgentRegistryError extends Error {
    public readonly code: AgentRegistryErrorCode;
    public readonly timestamp: Date;
    public readonly agentId?: string;
    public readonly registryId?: string;
    public readonly retryable: boolean;
    public readonly metadata?: Record<string, unknown>;

    constructor(details: AgentRegistryErrorDetails) {
        super(details.message);
        this.name = 'AgentRegistryError';
        this.code = details.code;
        this.timestamp = details.timestamp;
        this.agentId = details.agentId;
        this.registryId = details.registryId;
        this.retryable = details.retryable;
        this.metadata = details.metadata;

        // Maintain proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AgentRegistryError);
        }
    }

    public toJSON(): AgentRegistryErrorDetails {
        return {
            code: this.code,
            message: this.message,
            timestamp: this.timestamp,
            agentId: this.agentId,
            registryId: this.registryId,
            retryable: this.retryable,
            metadata: this.metadata
        };
    }
}

// Helper function to create registry errors
export const createAgentRegistryError = (
    code: AgentRegistryErrorCode,
    message: string,
    options?: {
        agentId?: string;
        registryId?: string;
        retryable?: boolean;
        metadata?: Record<string, unknown>;
    }
): AgentRegistryError => {
    return new AgentRegistryError({
        code,
        message,
        timestamp: new Date(),
        agentId: options?.agentId,
        registryId: options?.registryId,
        retryable: options?.retryable ?? false,
        metadata: options?.metadata
    });
};

// Static helper methods for common error scenarios
export class AgentRegistryErrorHelpers {
    static agentAlreadyExists(agentId: string): AgentRegistryError {
        return createAgentRegistryError(
            AgentRegistryErrorCode.AGENT_ALREADY_EXISTS,
            `Agent ${agentId} is already registered`,
            { agentId, retryable: false }
        );
    }

    static agentNotFound(agentId: string, operation?: string): AgentRegistryError {
        return createAgentRegistryError(
            AgentRegistryErrorCode.AGENT_NOT_FOUND,
            `Agent ${agentId} not found${operation ? ` for operation: ${operation}` : ''}`,
            { agentId, retryable: false }
        );
    }

    static registrationFailed(agentId: string, reason: string): AgentRegistryError {
        return createAgentRegistryError(
            AgentRegistryErrorCode.REGISTRATION_FAILED,
            `Failed to register agent ${agentId}: ${reason}`,
            { agentId, retryable: true }
        );
    }

    static deregistrationFailed(agentId: string, reason: string): AgentRegistryError {
        return createAgentRegistryError(
            AgentRegistryErrorCode.DEREGISTRATION_FAILED,
            `Failed to deregister agent ${agentId}: ${reason}`,
            { agentId, retryable: true }
        );
    }

    static capabilityMismatch(agentId: string, requiredCapability: string): AgentRegistryError {
        return createAgentRegistryError(
            AgentRegistryErrorCode.CAPABILITY_MISMATCH,
            `Agent ${agentId} does not have required capability: ${requiredCapability}`,
            { agentId, retryable: false }
        );
    }

    static healthCheckFailed(agentId: string, reason: string): AgentRegistryError {
        return createAgentRegistryError(
            AgentRegistryErrorCode.HEALTH_CHECK_FAILED,
            `Health check failed for agent ${agentId}: ${reason}`,
            { agentId, retryable: true }
        );
    }

    static registryUnavailable(reason: string): AgentRegistryError {
        return createAgentRegistryError(
            AgentRegistryErrorCode.REGISTRY_UNAVAILABLE,
            `Agent registry is unavailable: ${reason}`,
            { retryable: true }
        );
    }
}
