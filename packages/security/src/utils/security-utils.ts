/**
 * @file Security Utilities
 * @description Utility functions for security operations
 */

/**
 * Generate a random nonce for cryptographic operations
 */
export function generateNonce(length = 32): string {
  const array = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto API
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate SPIFFE ID format
 */
export function isValidSpiffeId(spiffeId: string): boolean {
  const spiffeRegex = /^spiffe:\/\/[^/]+\/[^/]+.*$/;
  return spiffeRegex.test(spiffeId);
}

/**
 * Extract trust domain from SPIFFE ID
 */
export function extractTrustDomain(spiffeId: string): string | null {
  if (!isValidSpiffeId(spiffeId)) {
    return null;
  }

  const parts = spiffeId.split('/');
  return parts.length >= 3 ? parts[2] : null;
}

/**
 * Extract workload path from SPIFFE ID
 */
export function extractWorkloadPath(spiffeId: string): string | null {
  if (!isValidSpiffeId(spiffeId)) {
    return null;
  }

  const parts = spiffeId.split('/');
  return parts.length >= 4 ? '/' + parts.slice(3).join('/') : null;
}

/**
 * Check if a certificate is expired (simplified check)
 */
export function isCertificateExpired(certPem: string): boolean {
  try {
    // This is a simplified check - in production you'd parse the actual certificate
    const certLines = certPem.split('\n');
    const certBody = certLines.slice(1, -2).join('\n');

    // For now, we'll just check if the certificate contains valid PEM structure
    return (
      !certBody.includes('-----BEGIN CERTIFICATE-----') ||
      !certBody.includes('-----END CERTIFICATE-----')
    );
  } catch {
    return true;
  }
}

/**
 * Sanitize selectors for logging
 */
export function sanitizeSelectors(selectors: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(selectors)) {
    // Remove sensitive information from selectors
    if (
      key.toLowerCase().includes('secret') ||
      key.toLowerCase().includes('password') ||
      key.toLowerCase().includes('token')
    ) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Create a security context ID
 */
export function createSecurityContextId(): string {
  const timestamp = Date.now().toString(36);
  const random = generateNonce(8);
  return `sec-${timestamp}-${random}`;
}

/**
 * Validate security context
 */
export function validateSecurityContext(context: {
  spiffeId?: string;
  trustDomain?: string;
  workloadPath?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!context.spiffeId) {
    errors.push('SPIFFE ID is required');
  } else if (!isValidSpiffeId(context.spiffeId)) {
    errors.push('Invalid SPIFFE ID format');
  }

  if (!context.trustDomain) {
    errors.push('Trust domain is required');
  }

  if (!context.workloadPath) {
    errors.push('Workload path is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
