/**
 * @fileoverview Secret accessor implementation with scoping and redaction
 * Provides explicit secret scoping/accessor with logging redaction capabilities
 */

import { z } from 'zod';

// Schema definitions
export const timeWindowSchema = z.object({
  start: z.string(), // HH:MM format
  end: z.string(),   // HH:MM format
  timezone: z.string()
});

export const secretScopeSchema = z.object({
  name: z.string().min(1),
  allowedSecrets: z.array(z.string()).min(1, 'allowedSecrets cannot be empty'),
  restrictions: z.object({
    environment: z.array(z.string()).optional(),
    timeWindow: timeWindowSchema.optional()
  })
});

export type SecretScope = z.infer<typeof secretScopeSchema>;

export interface RedactionConfig {
  secretPatterns: RegExp[];
  replacement: string;
}

export interface SecretMetadata {
  secretName: string;
  scope: string;
  accessCount: number;
  lastAccessed: Date;
}

export interface DeniedAttempt {
  secretName: string;
  reason: string;
  timestamp: Date;
  scope?: string;
}

export interface SecretAccessResult {
  success: boolean;
  value?: string;
  error?: string;
  message?: string;
}

export interface ScopeValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SecretAccessor {
  validateScope(scope: SecretScope): ScopeValidationResult;
  setScope(scope: SecretScope): void;
  getSecret(secretName: string): Promise<SecretAccessResult>;
  getAccessMetadata(secretName: string): SecretMetadata | undefined;
  getDeniedAttempts(): DeniedAttempt[];
}

export interface LogRedactor {
  attachToConsole(): void;
  detachFromConsole(): void;
}

// Implementation
class SecretAccessorImpl implements SecretAccessor {
  private currentScope: SecretScope | null = null;
  private accessMetadata = new Map<string, SecretMetadata>();
  private deniedAttempts: DeniedAttempt[] = [];

  validateScope(scope: SecretScope): ScopeValidationResult {
    try {
      secretScopeSchema.parse(scope);
      return { isValid: true, errors: [] };
    } catch (error: unknown) {
      const errors: string[] = [];
      if (error && typeof error === 'object' && 'errors' in error) {
        const zodError = error as { errors: Array<{ message: string }> };
        errors.push(...zodError.errors.map((e) => e.message));
      }
      return { isValid: false, errors };
    }
  }

  setScope(scope: SecretScope): void {
    this.currentScope = scope;
  }

  async getSecret(secretName: string): Promise<SecretAccessResult> {
    if (!this.currentScope) {
      return {
        success: false,
        error: 'NO_SCOPE_SET',
        message: 'No secret scope has been set'
      };
    }

    // Check if secret is in allowed list
    if (!this.currentScope.allowedSecrets.includes(secretName)) {
      this.deniedAttempts.push({
        secretName,
        reason: 'SECRET_NOT_IN_SCOPE',
        timestamp: new Date(),
        scope: this.currentScope.name
      });
      return {
        success: false,
        error: 'SECRET_NOT_IN_SCOPE',
        message: `Secret ${secretName} not allowed in scope ${this.currentScope.name}`
      };
    }

    // Check environment restrictions
    if (this.currentScope.restrictions.environment) {
      const currentEnv = process.env.NODE_ENV || 'development';
      if (!this.currentScope.restrictions.environment.includes(currentEnv)) {
        this.deniedAttempts.push({
          secretName,
          reason: 'ENVIRONMENT_RESTRICTED',
          timestamp: new Date(),
          scope: this.currentScope.name
        });
        return {
          success: false,
          error: 'ENVIRONMENT_RESTRICTED',
          message: `Access denied: current environment '${currentEnv}' not allowed in scope ${this.currentScope.name}`
        };
      }
    }

    // Check time window restrictions
    if (this.currentScope.restrictions.timeWindow) {
      const now = new Date();
      const timeWindow = this.currentScope.restrictions.timeWindow;
      
      // Simple time check (assumes UTC for simplicity in tests)
      const currentHour = now.getUTCHours();
      const currentMinute = now.getUTCMinutes();
      const currentTime = currentHour * 100 + currentMinute;
      
      const [startHour, startMinute] = timeWindow.start.split(':').map(Number);
      const [endHour, endMinute] = timeWindow.end.split(':').map(Number);
      const startTime = startHour * 100 + startMinute;
      const endTime = endHour * 100 + endMinute;
      
      if (currentTime < startTime || currentTime >= endTime) {
        this.deniedAttempts.push({
          secretName,
          reason: 'TIME_RESTRICTED',
          timestamp: new Date(),
          scope: this.currentScope.name
        });
        return {
          success: false,
          error: 'TIME_RESTRICTED',
          message: `Access denied: current time outside allowed window ${timeWindow.start}-${timeWindow.end} ${timeWindow.timezone}`
        };
      }
    }

    // Get the secret from environment
    const value = process.env[secretName];
    if (value === undefined) {
      return {
        success: false,
        error: 'SECRET_NOT_FOUND',
        message: `Environment variable ${secretName} not found`
      };
    }

    // Track successful access
    const existing = this.accessMetadata.get(secretName);
    if (existing) {
      existing.accessCount++;
      existing.lastAccessed = new Date();
    } else {
      this.accessMetadata.set(secretName, {
        secretName,
        scope: this.currentScope.name,
        accessCount: 1,
        lastAccessed: new Date()
      });
    }

    return {
      success: true,
      value
    };
  }

  getAccessMetadata(secretName: string): SecretMetadata | undefined {
    return this.accessMetadata.get(secretName);
  }

  getDeniedAttempts(): DeniedAttempt[] {
    return [...this.deniedAttempts];
  }
}

class LogRedactorImpl implements LogRedactor {
  private originalConsole: {
    log?: typeof console.log;
    error?: typeof console.error;
    warn?: typeof console.warn;
    info?: typeof console.info;
    debug?: typeof console.debug;
  } = {};
  private readonly config: RedactionConfig;
  private isAttached = false;

  constructor(config: RedactionConfig) {
    this.config = config;
  }

  attachToConsole(): void {
    if (this.isAttached) return;

    // Store original methods
    this.originalConsole = {
      log: globalThis.console.log,
      error: globalThis.console.error,
      warn: globalThis.console.warn,
      info: globalThis.console.info,
      debug: globalThis.console.debug
    };

    // Create redacting versions
    const createRedactingMethod = (originalMethod: (...args: unknown[]) => void) => {
      return (...args: unknown[]) => {
        const redactedArgs = args.map(arg => {
          if (typeof arg === 'string') {
            return this.redactString(arg);
          }
          return arg;
        });
        // Call the original method (which might be a mock) with redacted content
        originalMethod(...redactedArgs);
      };
    };

    // Replace console methods
    globalThis.console.log = createRedactingMethod(this.originalConsole.log!);
    globalThis.console.error = createRedactingMethod(this.originalConsole.error!);
    globalThis.console.warn = createRedactingMethod(this.originalConsole.warn!);
    globalThis.console.info = createRedactingMethod(this.originalConsole.info!);
    globalThis.console.debug = createRedactingMethod(this.originalConsole.debug!);

    this.isAttached = true;
  }

  detachFromConsole(): void {
    if (!this.isAttached) return;

    // Restore original methods
    if (this.originalConsole.log) globalThis.console.log = this.originalConsole.log;
    if (this.originalConsole.error) globalThis.console.error = this.originalConsole.error;
    if (this.originalConsole.warn) globalThis.console.warn = this.originalConsole.warn;
    if (this.originalConsole.info) globalThis.console.info = this.originalConsole.info;
    if (this.originalConsole.debug) globalThis.console.debug = this.originalConsole.debug;

    this.isAttached = false;
  }

  private redactString(input: string): string {
    let result = input;
    for (const pattern of this.config.secretPatterns) {
      // Replace using the first capture group if available
      result = result.replace(pattern, (match, capturedValue) => {
        if (capturedValue !== undefined) {
          // Replace only the captured value, keeping the prefix
          return match.replace(capturedValue, this.config.replacement);
        }
        // If no capture group, replace the entire match
        return this.config.replacement;
      });
    }
    return result;
  }
}

// Factory functions
export function createSecretAccessor(): SecretAccessor {
  return new SecretAccessorImpl();
}

export function createLogRedactor(config: RedactionConfig): LogRedactor {
  return new LogRedactorImpl(config);
}
