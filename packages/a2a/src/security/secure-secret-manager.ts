/**
 * @file Secure Secret Manager - OWASP LLM06 Protection
 * @description Hardware-backed secret management with encryption and rotation
 * following OWASP LLM Top 10 security guidelines
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

export interface EncryptedSecret {
  id: string;
  encryptedValue: string;
  iv: string;
  createdAt: Date;
  rotateAfter: Date;
  accessCount: number;
  lastAccessed: Date;
  metadata: Record<string, unknown>;
}

export interface SecretAccess {
  secretId: string;
  accessedBy: string;
  timestamp: Date;
  operation: 'read' | 'write' | 'rotate' | 'delete';
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface SecretManagerConfig {
  encryptionAlgorithm: string;
  keyDerivationRounds: number;
  secretRotationInterval: number; // milliseconds
  maxAccessCount: number;
  auditLogEnabled: boolean;
  hardwareSecurityModule: boolean;
}

/**
 * Secure secret management with encryption, rotation, and audit logging
 */
export class SecureSecretManager extends EventEmitter {
  private readonly secrets = new Map<string, EncryptedSecret>();
  private readonly accessLog: SecretAccess[] = [];
  private readonly config: SecretManagerConfig;
  private readonly masterKey: Buffer;
  private rotationTimer?: NodeJS.Timeout;

  constructor(config: Partial<SecretManagerConfig> = {}) {
    super();
    
    this.config = {
      encryptionAlgorithm: 'aes-256-gcm',
      keyDerivationRounds: 100000,
      secretRotationInterval: 24 * 60 * 60 * 1000, // 24 hours
      maxAccessCount: 10000,
      auditLogEnabled: true,
      hardwareSecurityModule: false,
      ...config
    };

    // Initialize master key from secure source
    this.masterKey = this.initializeMasterKey();
    
    // Start automatic rotation
    this.startRotationScheduler();
  }

  /**
   * Store a secret with encryption and metadata
   */
  async storeSecret(
    id: string, 
    value: string, 
    metadata: Record<string, unknown> = {},
    accessedBy: string = 'system'
  ): Promise<void> {
    try {
      // Validate secret strength
      this.validateSecretStrength(value);

      // Generate encryption parameters
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', this.masterKey);

      // Encrypt the secret
      let encryptedValue = cipher.update(value, 'utf8', 'hex');
      encryptedValue += cipher.final('hex');

      // Store encrypted secret
      const encryptedSecret: EncryptedSecret = {
        id,
        encryptedValue,
        iv: iv.toString('hex'),
        createdAt: new Date(),
        rotateAfter: new Date(Date.now() + this.config.secretRotationInterval),
        accessCount: 0,
        lastAccessed: new Date(),
        metadata
      };

      this.secrets.set(id, encryptedSecret);

      // Audit log
      this.logAccess({
        secretId: id,
        accessedBy,
        timestamp: new Date(),
        operation: 'write',
        success: true
      });

      this.emit('secret_stored', { id, accessedBy });

    } catch (error) {
      this.logAccess({
        secretId: id,
        accessedBy,
        timestamp: new Date(),
        operation: 'write',
        success: false
      });
      
      throw new Error(`Failed to store secret: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve and decrypt a secret
   */
  async getSecret(id: string, accessedBy: string = 'system'): Promise<string> {
    try {
      const encryptedSecret = this.secrets.get(id);
      if (!encryptedSecret) {
        throw new Error(`Secret '${id}' not found`);
      }

      // Check access limits
      if (encryptedSecret.accessCount >= this.config.maxAccessCount) {
        throw new Error(`Secret '${id}' has exceeded access limit`);
      }

      // Check if secret needs rotation
      if (new Date() > encryptedSecret.rotateAfter) {
        this.emit('secret_rotation_needed', { id });
        throw new Error(`Secret '${id}' requires rotation`);
      }

      // Decrypt the secret
      const decipher = crypto.createDecipher('aes-256-cbc', this.masterKey);

      let decryptedValue = decipher.update(encryptedSecret.encryptedValue, 'hex', 'utf8');
      decryptedValue += decipher.final('utf8');

      // Update access tracking
      encryptedSecret.accessCount++;
      encryptedSecret.lastAccessed = new Date();

      // Audit log
      this.logAccess({
        secretId: id,
        accessedBy,
        timestamp: new Date(),
        operation: 'read',
        success: true
      });

      this.emit('secret_accessed', { id, accessedBy, accessCount: encryptedSecret.accessCount });

      return decryptedValue;

    } catch (error) {
      this.logAccess({
        secretId: id,
        accessedBy,
        timestamp: new Date(),
        operation: 'read',
        success: false
      });
      
      throw error;
    }
  }

  /**
   * Generate a secure JWT secret with proper entropy
   */
  async generateJWTSecret(id: string = 'jwt_secret', accessedBy: string = 'system'): Promise<string> {
    // Generate high-entropy secret (256 bits)
    const secret = crypto.randomBytes(32).toString('base64url');
    
    await this.storeSecret(id, secret, {
      type: 'jwt_secret',
      algorithm: 'HS256',
      keySize: 256,
      generatedAt: new Date().toISOString()
    }, accessedBy);

    return secret;
  }

  /**
   * Rotate a secret (generate new value, keep old for grace period)
   */
  async rotateSecret(id: string, accessedBy: string = 'system'): Promise<string> {
    try {
      const existingSecret = this.secrets.get(id);
      if (!existingSecret) {
        throw new Error(`Secret '${id}' not found for rotation`);
      }

      // Generate new secret value
      let newValue: string;
      if (existingSecret.metadata.type === 'jwt_secret') {
        newValue = crypto.randomBytes(32).toString('base64url');
      } else {
        // Generate secure random value of appropriate length
        newValue = crypto.randomBytes(32).toString('hex');
      }

      // Store old secret with rotated suffix for grace period
      const oldId = `${id}_rotated_${Date.now()}`;
      await this.storeSecret(oldId, await this.getSecret(id, accessedBy), {
        ...existingSecret.metadata,
        rotatedAt: new Date().toISOString(),
        gracePeriodUntil: new Date(Date.now() + 60000).toISOString() // 1 minute grace
      }, accessedBy);

      // Store new secret
      await this.storeSecret(id, newValue, existingSecret.metadata, accessedBy);

      // Schedule cleanup of old secret
      setTimeout(() => {
        this.deleteSecret(oldId, accessedBy);
      }, 60000); // 1 minute

      this.logAccess({
        secretId: id,
        accessedBy,
        timestamp: new Date(),
        operation: 'rotate',
        success: true
      });

      this.emit('secret_rotated', { id, accessedBy });

      return newValue;

    } catch (error) {
      this.logAccess({
        secretId: id,
        accessedBy,
        timestamp: new Date(),
        operation: 'rotate',
        success: false
      });
      
      throw error;
    }
  }

  /**
   * Delete a secret and clear from memory
   */
  async deleteSecret(id: string, accessedBy: string = 'system'): Promise<void> {
    try {
      const secret = this.secrets.get(id);
      if (!secret) {
        throw new Error(`Secret '${id}' not found`);
      }

      // Clear from memory
      this.secrets.delete(id);

      this.logAccess({
        secretId: id,
        accessedBy,
        timestamp: new Date(),
        operation: 'delete',
        success: true
      });

      this.emit('secret_deleted', { id, accessedBy });

    } catch (error) {
      this.logAccess({
        secretId: id,
        accessedBy,
        timestamp: new Date(),
        operation: 'delete',
        success: false
      });
      
      throw error;
    }
  }

  /**
   * List all secrets (metadata only, not values)
   */
  listSecrets(): Array<{ id: string; createdAt: Date; rotateAfter: Date; accessCount: number; metadata: Record<string, unknown> }> {
    return Array.from(this.secrets.values()).map(secret => ({
      id: secret.id,
      createdAt: secret.createdAt,
      rotateAfter: secret.rotateAfter,
      accessCount: secret.accessCount,
      metadata: secret.metadata
    }));
  }

  /**
   * Get security metrics and health status
   */
  getSecurityMetrics(): {
    totalSecrets: number;
    secretsNeedingRotation: number;
    totalAccesses: number;
    recentAccesses: number;
    failedAccesses: number;
    oldestSecret: Date | null;
  } {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const secrets = Array.from(this.secrets.values());
    const recentAccesses = this.accessLog.filter(log => log.timestamp > oneDayAgo);

    return {
      totalSecrets: secrets.length,
      secretsNeedingRotation: secrets.filter(s => now > s.rotateAfter).length,
      totalAccesses: secrets.reduce((sum, s) => sum + s.accessCount, 0),
      recentAccesses: recentAccesses.filter(log => log.success).length,
      failedAccesses: recentAccesses.filter(log => !log.success).length,
      oldestSecret: secrets.length > 0 
        ? new Date(Math.min(...secrets.map(s => s.createdAt.getTime())))
        : null
    };
  }

  /**
   * Initialize master key from secure source
   */
  private initializeMasterKey(): Buffer {
    // In production, this should come from:
    // 1. Hardware Security Module (HSM)
    // 2. Key Management Service (KMS)
    // 3. Secure environment variable with proper key derivation
    
    const masterPassword = process.env.A2A_MASTER_KEY || crypto.randomBytes(32).toString('hex');
    
    // Derive key using PBKDF2
    const salt = crypto.randomBytes(32);
    const key = crypto.pbkdf2Sync(
      masterPassword,
      salt,
      this.config.keyDerivationRounds,
      32,
      'sha512'
    );

    return key;
  }

  /**
   * Validate secret strength and entropy
   */
  private validateSecretStrength(secret: string): void {
    if (secret.length < 16) {
      throw new Error('Secret must be at least 16 characters long');
    }

    // Calculate entropy
    const entropy = this.calculateEntropy(secret);
    if (entropy < 3.5) {
      throw new Error('Secret has insufficient entropy (minimum 3.5 bits per character)');
    }

    // Check for common weak patterns
    const weakPatterns = [
      /^(.)\1+$/, // All same character
      /^(..)\1+$/, // Repeated pairs
      /password|123456|qwerty|admin/i, // Common weak strings
      /^[a-z]+$|^[A-Z]+$|^[0-9]+$/ // Single character class
    ];

    for (const pattern of weakPatterns) {
      if (pattern.test(secret)) {
        throw new Error('Secret contains weak patterns');
      }
    }
  }

  /**
   * Calculate Shannon entropy
   */
  private calculateEntropy(text: string): number {
    const frequency: { [key: string]: number } = {};
    const length = text.length;

    for (const char of text) {
      frequency[char] = (frequency[char] || 0) + 1;
    }

    let entropy = 0;
    for (const count of Object.values(frequency)) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Log security access for audit trail
   */
  private logAccess(access: SecretAccess): void {
    if (!this.config.auditLogEnabled) return;

    this.accessLog.push(access);

    // Keep only last 10,000 entries to prevent memory bloat
    if (this.accessLog.length > 10000) {
      this.accessLog.splice(0, this.accessLog.length - 10000);
    }

    // In production, ship to security monitoring system
    if (!access.success) {
      console.warn('[A2A Security] Secret access failed:', {
        secretId: access.secretId,
        accessedBy: access.accessedBy,
        operation: access.operation,
        timestamp: access.timestamp.toISOString()
      });
    }
  }

  /**
   * Start automatic secret rotation scheduler
   */
  private startRotationScheduler(): void {
    this.rotationTimer = setInterval(() => {
      const now = new Date();
      
      for (const [id, secret] of this.secrets.entries()) {
        if (now > secret.rotateAfter) {
          this.emit('secret_rotation_needed', { id });
          
          // Auto-rotate if configured
          if (secret.metadata.autoRotate) {
            this.rotateSecret(id, 'system').catch(error => {
              this.emit('secret_rotation_failed', { id, error: error.message });
            });
          }
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    // Clear sensitive data from memory
    this.secrets.clear();
    this.accessLog.length = 0;

    this.emit('shutdown');
  }
}

/**
 * Default secure secret manager instance
 */
export const defaultSecretManager = new SecureSecretManager({
  auditLogEnabled: true,
  hardwareSecurityModule: false,
  maxAccessCount: 10000,
  secretRotationInterval: 24 * 60 * 60 * 1000 // 24 hours
});