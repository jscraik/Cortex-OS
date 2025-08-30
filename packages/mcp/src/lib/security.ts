import { z } from 'zod';

// Data redaction patterns for strings
const SENSITIVE_PATTERNS = [
  // API key patterns
  /(["']?(?:apiKey|api_key|api-key)["']?\s*[:=]\s*["']?)([^"'}\s,)]+)(["']?)/gi,
  // Token patterns
  /(["']?(?:token|auth)["']?\s*[:=]\s*["']?)([^"'}\s,)]+)(["']?)/gi,
  // Password/secrets patterns
  /(["']?(?:password|secret|credential)["']?\s*[:=]\s*["']?)([^"'}\s,)]+)(["']?)/gi,
  // Authorization header patterns
  /(["']?authorization["']?\s*[:=]\s*["']?bearer\s+)([^"'}\s,)]+)(["']?)/gi,
];

const REDACT_KEY_REGEX = /key|password|token|secret|authorization|auth/i;

/**
 * Redact sensitive values in strings or objects recursively.
 */
export function redactSensitiveData(data: any): any {
  const redactString = (str: string): string => {
    let redacted = str;
    for (const pattern of SENSITIVE_PATTERNS) {
      redacted = redacted.replace(pattern, '$1[REDACTED]$3');
    }
    return redacted;
  };

  if (typeof data === 'string') {
    return redactString(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  if (data && typeof data === 'object') {
    const objSchema = z.record(z.any());
    objSchema.parse(data);

    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => {
        if (REDACT_KEY_REGEX.test(k)) {
          if (typeof v === 'string' && /^bearer\s+/i.test(v)) {
            return [k, 'bearer [REDACTED]'];
          }
          return [k, '[REDACTED]'];
        }
        return [k, redactSensitiveData(v)];
      }),
    );
  }

  return data;
}

/**
 * Validate API key format.
 *
 * By default, validates keys starting with "sk", "pk", or "ref", followed by a dash or underscore,
 * and at least 10 alphanumeric characters. This matches some common providers (e.g. Stripe, Plaid),
 * but may not cover all valid API key formats. You can provide a custom regex to support other providers.
 *
 * @param key - The API key to validate.
 * @param regex - Optional. A custom regex to validate the API key format.
 * @returns true if the key matches the regex, false otherwise.
 */
export function validateApiKey(
  key: string,
  regex: RegExp = /^(sk|pk|ref)[-_][A-Za-z0-9]{10,}$/,
): boolean {
  const schema = z.string().regex(regex);
  return schema.safeParse(key).success;
}

/**
 * Validate URL security rules.
 */
export function validateUrlSecurity(url: string): boolean {
  const urlSchema = z.string().url();
  const parsed = urlSchema.safeParse(url);
  if (!parsed.success) {
    return false;
  }

  try {
    const u = new URL(url);
    const isHttps = u.protocol === 'https:';
    
    // Comprehensive localhost and private network detection
    const hostname = u.hostname.toLowerCase();
    const isLocalhost = [
      'localhost', '127.0.0.1', '::1', '0.0.0.0'
    ].includes(hostname) || 
    /^127\./.test(hostname) || 
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname) ||
    hostname.includes('.local') ||
    hostname.includes('.internal');
    
    const allowedProtocol = isHttps || (u.protocol === 'http:' && isLocalhost);
    const hasAdminPath = u.pathname.toLowerCase().includes('/admin');
    const hasMetadataPath = u.pathname.toLowerCase().includes('/metadata');
    
    return allowedProtocol && !hasAdminPath && !hasMetadataPath;
  } catch {
    return false;
  }
}
