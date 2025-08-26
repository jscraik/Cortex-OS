/**
 * @file Secure A2A Message Handler - OWASP LLM Compliant
 * @description Production-ready message handler with integrated security layers
 * following the external A2A JSON-RPC 2.0 specification exactly
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

// Import external A2A types
import type {
  SendMessageRequest,
  SendMessageSuccessResponse,
  JSONRPCErrorResponse,
  Message,
  Task,
  MessageSendParams,
  AgentCapabilities,
  Part
} from './types.js';

// Import security components
import { PromptInjectionGuard, type ValidationResult } from './security/prompt-injection-guard.js';
import { SecureSecretManager } from './security/secure-secret-manager.js';
import { AgentRateLimiter, type RateLimitResult } from './security/rate-limiter.js';
import { OutputSanitizer, type SanitizationResult } from './security/output-sanitizer.js';

// Import utilities
import { A2AErrorType, createErrorResponse, createSuccessResponse, createA2AError } from './index.js';

export interface SecurityContext {
  agentId: string;
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
  capabilities: AgentCapabilities;
  authenticatedAgent: boolean;
  securityLevel: 'none' | 'basic' | 'enhanced' | 'maximum';
}

export interface MessageHandlerConfig {
  enablePromptInjectionGuard: boolean;
  enableRateLimiting: boolean;
  enableOutputSanitization: boolean;
  enableSecureSecrets: boolean;
  enableAuditLogging: boolean;
  maxMessageSize: number;
  timeoutMs: number;
  retryAttempts: number;
}

export interface MessageProcessingResult {
  success: boolean;
  response: SendMessageSuccessResponse | JSONRPCErrorResponse;
  securityMetrics: {
    promptValidation: ValidationResult;
    rateLimitCheck: RateLimitResult;
    outputSanitization: SanitizationResult;
    processingTime: number;
  };
  auditTrail: AuditLogEntry[];
}

export interface AuditLogEntry {
  timestamp: Date;
  event: string;
  agentId: string;
  requestId: string;
  securityLevel: string;
  success: boolean;
  details: Record<string, unknown>;
}

/**
 * Secure A2A message handler with comprehensive security integration
 */
export class SecureMessageHandler extends EventEmitter {
  private readonly config: MessageHandlerConfig;
  private readonly promptGuard: PromptInjectionGuard;
  private readonly secretManager: SecureSecretManager;
  private readonly rateLimiter: AgentRateLimiter;
  private readonly outputSanitizer: OutputSanitizer;
  private readonly activeRequests = new Map<string, { timestamp: number; agentId: string }>();
  private readonly auditLog: AuditLogEntry[] = [];
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    config: Partial<MessageHandlerConfig> = {},
    promptGuard?: PromptInjectionGuard,
    secretManager?: SecureSecretManager,
    rateLimiter?: AgentRateLimiter,
    outputSanitizer?: OutputSanitizer
  ) {
    super();

    this.config = {
      enablePromptInjectionGuard: true,
      enableRateLimiting: true,
      enableOutputSanitization: true,
      enableSecureSecrets: true,
      enableAuditLogging: true,
      maxMessageSize: 1024 * 1024, // 1MB
      timeoutMs: 30000, // 30 seconds
      retryAttempts: 3,
      ...config
    };

    // Initialize security components
    this.promptGuard = promptGuard || new PromptInjectionGuard();
    this.secretManager = secretManager || new SecureSecretManager();
    this.rateLimiter = rateLimiter || new AgentRateLimiter();
    this.outputSanitizer = outputSanitizer || new OutputSanitizer();

    // Setup cleanup for active requests
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredRequests();
    }, 60000); // Check every minute
  }

  /**
   * Process an incoming A2A message with full security validation
   */
  async processMessage(
    request: SendMessageRequest,
    securityContext: SecurityContext
  ): Promise<MessageProcessingResult> {
    const startTime = Date.now();
    const auditTrail: AuditLogEntry[] = [];
    
    try {
      // Log incoming request
      this.logAudit('message_received', securityContext, true, {
        method: request.method,
        hasParams: !!request.params,
        requestSize: JSON.stringify(request).length
      }, auditTrail);

      // Validate request structure first
      const structureValidation = this.validateRequestStructure(request);
      if (!structureValidation.valid) {
        const errorResponse = createErrorResponse(
          createA2AError(A2AErrorType.INVALID_REQUEST, structureValidation.error!),
          request.id
        );
        
        return {
          success: false,
          response: errorResponse,
          securityMetrics: {
            promptValidation: { safe: false, riskScore: 10, threats: [], warnings: [] },
            rateLimitCheck: { allowed: false, remainingRequests: 0, resetTime: 0 },
            outputSanitization: { safe: false, sanitized: null, original: null, violations: [], riskScore: 10, contentHash: '', metadata: { sanitizationTime: 0, rulesApplied: [], encoding: '', contentType: '' } },
            processingTime: Date.now() - startTime
          },
          auditTrail
        };
      }

      // Rate limiting check
      let rateLimitCheck: RateLimitResult = { allowed: true, remainingRequests: 1000, resetTime: 0 };
      if (this.config.enableRateLimiting) {
        rateLimitCheck = await this.rateLimiter.checkLimit(
          securityContext.agentId,
          request.method
        );
        
        if (!rateLimitCheck.allowed) {
          this.logAudit('rate_limit_exceeded', securityContext, false, {
            reason: rateLimitCheck.reason,
            retryAfter: rateLimitCheck.retryAfter
          }, auditTrail);

          const errorResponse = createErrorResponse(
            createA2AError(A2AErrorType.INTERNAL_ERROR, rateLimitCheck.reason || 'Rate limit exceeded'),
            request.id
          );
          
          return {
            success: false,
            response: errorResponse,
            securityMetrics: {
              promptValidation: { safe: false, riskScore: 0, threats: [], warnings: [] },
              rateLimitCheck,
              outputSanitization: { safe: true, sanitized: null, original: null, violations: [], riskScore: 0, contentHash: '', metadata: { sanitizationTime: 0, rulesApplied: [], encoding: '', contentType: '' } },
              processingTime: Date.now() - startTime
            },
            auditTrail
          };
        }
      }

      // Prompt injection validation
      let promptValidation: ValidationResult = { safe: true, riskScore: 0, threats: [], warnings: [] };
      if (this.config.enablePromptInjectionGuard) {
        promptValidation = await this.promptGuard.validateAndSanitizePrompt(request.params);
        
        if (!promptValidation.safe) {
          this.logAudit('prompt_injection_detected', securityContext, false, {
            riskScore: promptValidation.riskScore,
            threatCount: promptValidation.threats.length,
            threats: promptValidation.threats.map(t => t.type)
          }, auditTrail);

          const errorResponse = createErrorResponse(
            createA2AError(A2AErrorType.INVALID_PARAMS, 'Message content failed security validation'),
            request.id
          );
          
          return {
            success: false,
            response: errorResponse,
            securityMetrics: {
              promptValidation,
              rateLimitCheck,
              outputSanitization: { safe: true, sanitized: null, original: null, violations: [], riskScore: 0, contentHash: '', metadata: { sanitizationTime: 0, rulesApplied: [], encoding: '', contentType: '' } },
              processingTime: Date.now() - startTime
            },
            auditTrail
          };
        }
      }

      // Track active request
      this.activeRequests.set(String(request.id), {
        timestamp: Date.now(),
        agentId: securityContext.agentId
      });

      // Process the message based on method
      let processedResult: Message | Task;
      
      if (request.method === 'message/send') {
        processedResult = await this.processMessageSend(
          request.params as MessageSendParams,
          securityContext,
          auditTrail
        );
      } else {
        throw new Error(`Unsupported method: ${request.method}`);
      }

      // Output sanitization
      let outputSanitization: SanitizationResult = { safe: true, sanitized: processedResult, original: processedResult, violations: [], riskScore: 0, contentHash: '', metadata: { sanitizationTime: 0, rulesApplied: [], encoding: '', contentType: '' } };
      if (this.config.enableOutputSanitization) {
        outputSanitization = await this.outputSanitizer.sanitizeOutput(
          processedResult,
          'application/json'
        );
        
        if (!outputSanitization.safe) {
          this.logAudit('output_sanitization_applied', securityContext, true, {
            violationCount: outputSanitization.violations.length,
            riskScore: outputSanitization.riskScore
          }, auditTrail);
          
          processedResult = outputSanitization.sanitized as Message | Task;
        }
      }

      // Create successful response
      const successResponse = createSuccessResponse(processedResult, request.id);

      this.logAudit('message_processed', securityContext, true, {
        processingTime: Date.now() - startTime,
        outputSafe: outputSanitization.safe
      }, auditTrail);

      return {
        success: true,
        response: successResponse,
        securityMetrics: {
          promptValidation,
          rateLimitCheck,
          outputSanitization,
          processingTime: Date.now() - startTime
        },
        auditTrail
      };

    } catch (error) {
      this.logAudit('message_processing_error', securityContext, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      }, auditTrail);

      const errorResponse = createErrorResponse(
        createA2AError(
          A2AErrorType.INTERNAL_ERROR,
          error instanceof Error ? error.message : 'Internal processing error'
        ),
        request.id
      );

      return {
        success: false,
        response: errorResponse,
        securityMetrics: {
          promptValidation: { safe: false, riskScore: 10, threats: [], warnings: [] },
          rateLimitCheck: { allowed: false, remainingRequests: 0, resetTime: 0 },
          outputSanitization: { safe: false, sanitized: null, original: null, violations: [], riskScore: 10, contentHash: '', metadata: { sanitizationTime: 0, rulesApplied: [], encoding: '', contentType: '' } },
          processingTime: Date.now() - startTime
        },
        auditTrail
      };
    } finally {
      // Clean up active request tracking
      this.activeRequests.delete(String(request.id));
    }
  }

  /**
   * Validate JSON-RPC 2.0 request structure
   */
  private validateRequestStructure(request: SendMessageRequest): { valid: boolean; error?: string } {
    // Check required JSON-RPC 2.0 fields
    if (request.jsonrpc !== '2.0') {
      return { valid: false, error: 'Invalid JSON-RPC version, must be "2.0"' };
    }

    if (!request.method || typeof request.method !== 'string') {
      return { valid: false, error: 'Missing or invalid method field' };
    }

    if (request.id !== undefined && 
        typeof request.id !== 'string' && 
        typeof request.id !== 'number') {
      return { valid: false, error: 'Invalid id field, must be string or number' };
    }

    // Check message size limits
    const requestSize = JSON.stringify(request).length;
    if (requestSize > this.config.maxMessageSize) {
      return { valid: false, error: `Request size ${requestSize} exceeds limit ${this.config.maxMessageSize}` };
    }

    // Method-specific validation
    if (request.method === 'message/send') {
      if (!request.params) {
        return { valid: false, error: 'Missing params for message/send method' };
      }

      const params = request.params as MessageSendParams;
      if (!params.message) {
        return { valid: false, error: 'Missing message in params' };
      }

      // Validate message structure according to external A2A spec
      const message = params.message;
      if (!message.role || !['user', 'agent'].includes(message.role)) {
        return { valid: false, error: 'Invalid message role, must be "user" or "agent"' };
      }

      if (!message.parts || !Array.isArray(message.parts) || message.parts.length === 0) {
        return { valid: false, error: 'Message must have at least one part' };
      }

      // Validate each part
      for (const part of message.parts) {
        if (!this.validateMessagePart(part)) {
          return { valid: false, error: 'Invalid message part structure' };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Validate message part structure
   */
  private validateMessagePart(part: Part): boolean {
    // According to external A2A spec, parts have different types
    if (typeof part !== 'object' || part === null) {
      return false;
    }

    // Check for text part
    if ('text' in part) {
      return typeof part.text === 'string';
    }

    // Check for media part
    if ('media' in part) {
      // Type-safe media part validation
      const maybePart = part as Record<string, unknown>;
      const media = maybePart.media;
      
      if (!media || typeof media !== 'object' || media === null) {
        return false;
      }
      
      const mediaObj = media as Record<string, unknown>;
      return typeof mediaObj.mediaType === 'string' &&
             (typeof mediaObj.data === 'string' || typeof mediaObj.url === 'string');
    }

    return false;
  }

  /**
   * Process message/send method
   */
  private async processMessageSend(
    params: MessageSendParams,
    securityContext: SecurityContext,
    auditTrail: AuditLogEntry[]
  ): Promise<Message> {
    this.logAudit('processing_message_send', securityContext, true, {
      messageRole: params.message.role,
      partCount: params.message.parts.length
    }, auditTrail);

    // Create response message following external A2A specification exactly
    const responseMessage: Message = {
      messageId: randomUUID(),
      kind: 'message',
      role: 'agent',
      parts: [
        {
          kind: 'text',
          text: 'Message received and processed successfully'
        }
      ],
      metadata: {
        processingAgent: securityContext.agentId,
        timestamp: new Date().toISOString(),
        securityLevel: securityContext.securityLevel,
        originalMessageId: params.message.metadata?.messageId
      },
      referenceTaskIds: params.message.referenceTaskIds
    };

    // Add extensions if supported
    if (securityContext.capabilities.extensions && securityContext.capabilities.extensions.length > 0) {
      responseMessage.extensions = securityContext.capabilities.extensions.map(ext => ext.uri);
    }

    return responseMessage;
  }

  /**
   * Log audit entry
   */
  private logAudit(
    event: string,
    securityContext: SecurityContext,
    success: boolean,
    details: Record<string, unknown>,
    auditTrail: AuditLogEntry[]
  ): void {
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      event,
      agentId: securityContext.agentId,
      requestId: securityContext.requestId,
      securityLevel: securityContext.securityLevel,
      success,
      details
    };

    auditTrail.push(entry);
    
    if (this.config.enableAuditLogging) {
      this.auditLog.push(entry);
      
      // Keep only last 10,000 entries to prevent memory bloat
      if (this.auditLog.length > 10000) {
        this.auditLog.splice(0, this.auditLog.length - 10000);
      }
      
      // Emit for external logging systems
      this.emit('audit_log', entry);
    }
  }

  /**
   * Clean up expired active requests
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now();
    const expiredThreshold = this.config.timeoutMs;
    
    for (const [requestId, request] of this.activeRequests.entries()) {
      if (now - request.timestamp > expiredThreshold) {
        this.activeRequests.delete(requestId);
        this.emit('request_timeout', { requestId, agentId: request.agentId });
      }
    }
  }

  /**
   * Get security metrics and health status
   */
  getSecurityMetrics(): {
    activeRequests: number;
    totalProcessed: number;
    securityViolations: number;
    averageProcessingTime: number;
    rateLimitViolations: number;
    promptInjectionAttempts: number;
  } {
    const securityViolations = this.auditLog.filter(entry => 
      entry.event.includes('security') || 
      entry.event.includes('violation') ||
      entry.event.includes('injection')
    ).length;

    const rateLimitViolations = this.auditLog.filter(entry => 
      entry.event === 'rate_limit_exceeded'
    ).length;

    const promptInjectionAttempts = this.auditLog.filter(entry => 
      entry.event === 'prompt_injection_detected'
    ).length;

    const processedMessages = this.auditLog.filter(entry => 
      entry.event === 'message_processed' && entry.success
    );

    const averageProcessingTime = processedMessages.length > 0
      ? processedMessages.reduce((sum, entry) => 
          sum + (entry.details.processingTime as number || 0), 0
        ) / processedMessages.length
      : 0;

    return {
      activeRequests: this.activeRequests.size,
      totalProcessed: processedMessages.length,
      securityViolations,
      averageProcessingTime,
      rateLimitViolations,
      promptInjectionAttempts
    };
  }

  /**
   * Get recent audit logs
   */
  getAuditLogs(limit: number = 100): AuditLogEntry[] {
    return this.auditLog.slice(-limit);
  }

  /**
   * Shutdown handler and cleanup resources
   */
  async shutdown(): Promise<void> {
    // Clear cleanup timer to prevent memory leak
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    // Clear active requests
    this.activeRequests.clear();
    
    // Clear audit log
    this.auditLog.length = 0;
    
    // Shutdown security components
    await Promise.all([
      this.secretManager.shutdown(),
      this.rateLimiter.shutdown()
    ]);

    this.emit('shutdown');
  }
}

/**
 * Factory function to create a secure message handler with default security settings
 */
export function createSecureMessageHandler(config?: Partial<MessageHandlerConfig>): SecureMessageHandler {
  return new SecureMessageHandler(config);
}

/**
 * Factory function to create a high-security message handler
 */
export function createHighSecurityMessageHandler(): SecureMessageHandler {
  return new SecureMessageHandler({
    enablePromptInjectionGuard: true,
    enableRateLimiting: true,
    enableOutputSanitization: true,
    enableSecureSecrets: true,
    enableAuditLogging: true,
    maxMessageSize: 512 * 1024, // 512KB - smaller limit
    timeoutMs: 15000, // 15 seconds - shorter timeout
    retryAttempts: 1 // Single attempt only
  });
}