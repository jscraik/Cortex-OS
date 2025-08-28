/**
 * ASBR Authentication System
 * Loopback-only scoped token authentication with TTL and least privilege
 */

import { readFile, writeFile } from 'fs/promises';
import { randomBytes, createHash } from 'crypto';
import { getConfigPath, pathExists } from '../xdg/index.js';
import { AuthenticationError, AuthorizationError, ValidationError } from '../types/index.js';

export interface TokenInfo {
  id: string;
  token: string;
  scopes: string[];
  expiresAt: string;
  createdAt: string;
  lastUsed?: string;
}

export interface TokensConfig {
  tokens: TokenInfo[];
  version: string;
}

/**
 * Authentication middleware for Express
 */
export function createAuthMiddleware() {
  return async (req: any, res: any, next: any) => {
    // Only allow loopback connections
    const clientIp = req.ip || req.socket?.remoteAddress;
    if (!isLoopbackAddress(clientIp)) {
      res.status(403).json({ error: 'Access denied: loopback only' });
      return;
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const tokenInfo = await validateToken(token);

      // Update last used timestamp
      await updateTokenUsage(tokenInfo.id);

      // Add token info to request
      req.auth = {
        tokenId: tokenInfo.id,
        scopes: tokenInfo.scopes,
      };

      next();
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Authentication failed' });
      }
    }
  };
}

/**
 * Middleware to check if token has required scopes
 */
export function requireScopes(...requiredScopes: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hasAllScopes = requiredScopes.every(
      (scope) => req.auth.scopes.includes(scope) || req.auth.scopes.includes('*'),
    );

    if (!hasAllScopes) {
      res.status(403).json({
        error: 'Insufficient privileges',
        required: requiredScopes,
        available: req.auth.scopes,
      });
      return;
    }

    next();
  };
}

/**
 * Check if an IP address is a loopback address
 */
export function isLoopbackAddress(ip: string): boolean {
  if (!ip) return false;

  // Remove IPv6 prefix if present
  const cleanIp = ip.replace(/^::ffff:/, '');

  // Check for IPv4 loopback
  if (cleanIp === '127.0.0.1' || cleanIp.startsWith('127.')) {
    return true;
  }

  // Check for IPv6 loopback
  if (cleanIp === '::1' || cleanIp === 'localhost') {
    return true;
  }

  return false;
}

/**
 * Generate a new scoped token
 */
export async function generateToken(scopes: string[], ttlHours: number = 24): Promise<TokenInfo> {
  const tokenBytes = randomBytes(32);
  const token = tokenBytes.toString('base64url');
  const id = createHash('sha256').update(token).digest('hex').substring(0, 16);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

  const tokenInfo: TokenInfo = {
    id,
    token,
    scopes: [...scopes], // Copy array to prevent mutations
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  };

  await saveToken(tokenInfo);
  return tokenInfo;
}

/**
 * Validate a token and return its info
 */
export async function validateToken(token: string): Promise<TokenInfo> {
  const tokens = await loadTokens();
  const tokenInfo = tokens.find((t) => t.token === token);

  if (!tokenInfo) {
    throw new AuthenticationError('Invalid token');
  }

  const now = new Date();
  const expiresAt = new Date(tokenInfo.expiresAt);

  if (now > expiresAt) {
    // Remove expired token
    await revokeToken(tokenInfo.id);
    throw new AuthenticationError('Token expired');
  }

  return tokenInfo;
}

/**
 * Revoke a token by ID
 */
export async function revokeToken(tokenId: string): Promise<void> {
  const tokens = await loadTokens();
  const filteredTokens = tokens.filter((t) => t.id !== tokenId);
  await saveTokens(filteredTokens);
}

/**
 * Clean up expired tokens
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const tokens = await loadTokens();
  const now = new Date();

  const activeTokens = tokens.filter((t) => new Date(t.expiresAt) > now);
  const expiredCount = tokens.length - activeTokens.length;

  if (expiredCount > 0) {
    await saveTokens(activeTokens);
  }

  return expiredCount;
}

/**
 * Update token usage timestamp
 */
async function updateTokenUsage(tokenId: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;

  const tokens = await loadTokens();
  const token = tokens.find((t) => t.id === tokenId);

  if (token) {
    token.lastUsed = new Date().toISOString();
    await saveTokens(tokens);
  }
}

/**
 * Save a new token
 */
async function saveToken(tokenInfo: TokenInfo): Promise<void> {
  const tokens = await loadTokens();
  tokens.push(tokenInfo);
  await saveTokens(tokens);
}

/**
 * Load all tokens from config
 */
async function loadTokens(): Promise<TokenInfo[]> {
  const tokensPath = getConfigPath('tokens.json');

  if (!(await pathExists(tokensPath))) {
    return [];
  }

  try {
    const content = await readFile(tokensPath, 'utf-8');
    const config: TokensConfig = JSON.parse(content);
    return config.tokens || [];
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: failed to load tokens (${msg}). Using empty token set.`);
    return [];
  }
}

/**
 * Save tokens to config
 */
async function saveTokens(tokens: TokenInfo[]): Promise<void> {
  const tokensPath = getConfigPath('tokens.json');
  const config: TokensConfig = {
    tokens,
    version: '1.0.0',
  };

  try {
    await writeFile(tokensPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new ValidationError(`Failed to save tokens: ${msg}`);
  }
}

/**
 * Initialize authentication system with a default admin token
 */
export async function initializeAuth(): Promise<TokenInfo> {
  const tokens = await loadTokens();

  // Check if we already have an admin token
  const adminToken = tokens.find(
    (t) => t.scopes.includes('*') && new Date(t.expiresAt) > new Date(),
  );

  if (adminToken) {
    return adminToken;
  }

  // Generate new admin token with full privileges
  return await generateToken(['*'], 24 * 30); // 30 days
}
