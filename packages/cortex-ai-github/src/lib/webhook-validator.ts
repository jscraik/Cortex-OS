/**
 * Webhook signature validation utilities
 * Cross-platform (Node.js + Cloudflare Workers) functional approach
 */

export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
}

// Cross-platform HMAC implementation
const createHmac = async (algorithm: string, key: string, data: Uint8Array): Promise<string> => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // Cloudflare Workers / Web Crypto API
    const keyBuffer = new TextEncoder().encode(key);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    // Node.js
    const { createHmac } = await import('node:crypto');
    return createHmac(algorithm, key).update(data).digest('hex');
  }
};

// Cross-platform timing-safe comparison
const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

export const validateWebhookSignature = async (
  payload: Uint8Array,
  signature: string,
  secret: string
): Promise<WebhookValidationResult> => {
  if (!signature || !signature.startsWith('sha256=')) {
    return { isValid: false, error: 'Missing or invalid signature format' };
  }

  try {
    const expectedSignature = await createHmac('sha256', secret, payload);
    const receivedSignature = signature.replace('sha256=', '');

    const isValid = timingSafeEqual(expectedSignature, receivedSignature);

    return { isValid, error: isValid ? undefined : 'Signature mismatch' };
  } catch (error) {
    return {
      isValid: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

export const validateWebhookHeaders = (
  headers: Record<string, string | undefined>
): WebhookValidationResult => {
  const required = ['x-github-event', 'x-github-delivery', 'x-hub-signature-256'];
  const missing = required.filter(header => !headers[header]);

  if (missing.length > 0) {
    return { isValid: false, error: `Missing required headers: ${missing.join(', ')}` };
  }

  return { isValid: true };
};

export const createWebhookValidator = (secret: string) => ({
  validateSignature: (payload: Uint8Array, signature: string) =>
    validateWebhookSignature(payload, signature, secret),
  validateHeaders: validateWebhookHeaders,
});
