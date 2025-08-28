import { z } from 'zod';

/**
 * Redact sensitive values in an object recursively.
 */
export function redactSensitiveData<T extends Record<string, any>>(data: T): T {
  const objSchema = z.record(z.any());
  objSchema.parse(data);

  const redactKeys = /key|password|token|secret/i;

  const recurse = (value: any): any => {
    if (Array.isArray(value)) {
      return value.map(recurse);
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [
          k,
          redactKeys.test(k) ? '[REDACTED]' : recurse(v),
        ]),
      );
    }
    return value;
  };

  return recurse(data);
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
  regex: RegExp = /^(sk|pk|ref)[-_][A-Za-z0-9]{10,}/
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
    const isLocalhost =
      u.hostname === 'localhost' || u.hostname.startsWith('127.');
    const allowedProtocol = isHttps || (u.protocol === 'http:' && isLocalhost);
    const hasAdminPath = u.pathname.toLowerCase().includes('/admin');
    return allowedProtocol && !hasAdminPath;
  } catch {
    return false;
  }
}
