import type { Request, Response } from 'express';
import { z } from 'zod';
import { OAuthService, oauthUtils } from '../services/oauthService';
import { HttpError } from '../middleware/errorHandler';
import { authUtils } from '../auth';

// Validation schemas
const callbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});

const linkAccountSchema = z.object({
  providerId: z.string().min(1),
  code: z.string().min(1),
  state: z.string().optional(),
});

const unlinkAccountSchema = z.object({
  providerId: z.string().min(1),
  providerAccountId: z.string().min(1),
});

export class OAuthController {
  /**
   * Get all configured OAuth providers
   */
  static async getProviders(req: Request, res: Response): Promise<void> {
    try {
      const providers = OAuthService.getProviders();
      res.json({
        providers,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting OAuth providers:', error);
      res.status(500).json({
        error: 'Failed to fetch OAuth providers',
      });
    }
  }

  /**
   * Get OAuth URL for a specific provider
   */
  static async getOAuthURL(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;

      if (!OAuthService.isProviderEnabled(providerId)) {
        throw new HttpError(404, 'OAuth provider not found or disabled');
      }

      const url = OAuthService.getOAuthURL(providerId);

      if (!url) {
        throw new HttpError(500, 'Failed to generate OAuth URL');
      }

      // Generate state parameter for CSRF protection
      const state = oauthUtils.generateState();

      // Store state in session (in production, use Redis or similar)
      req.session = req.session || {};
      req.session.oauthState = {
        [providerId]: {
          state,
          expires: Date.now() + 10 * 60 * 1000, // 10 minutes
        },
      };

      res.json({
        url,
        state,
        providerId,
        callbackUrl: OAuthService.getCallbackURL(providerId),
        scopes: OAuthService.getScopes(providerId),
      });
    } catch (error) {
      if (error instanceof HttpError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        console.error('Error generating OAuth URL:', error);
        res.status(500).json({
          error: 'Failed to generate OAuth URL',
        });
      }
    }
  }

  /**
   * Handle OAuth callback from providers
   */
  static async handleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { providerId } = req.params;
      const { code, state } = callbackSchema.parse(req.query);

      if (!OAuthService.isProviderEnabled(providerId)) {
        throw new HttpError(404, 'OAuth provider not found or disabled');
      }

      // Validate state parameter
      const storedState = req.session?.oauthState?.[providerId]?.state;
      const stateExpires = req.session?.oauthState?.[providerId]?.expires;

      if (!storedState || !stateExpires || Date.now() > stateExpires) {
        throw new HttpError(400, 'Invalid or expired OAuth state');
      }

      if (!oauthUtils.validateState(state as string, storedState)) {
        throw new HttpError(400, 'Invalid OAuth state');
      }

      // Handle OAuth callback
      const result = await OAuthService.handleCallback(
        providerId,
        code as string,
        state as string
      );

      // Clear stored state
      if (req.session?.oauthState?.[providerId]) {
        delete req.session.oauthState[providerId];
      }

      // Redirect to frontend with success/error
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = new URL(`${frontendUrl}/auth/callback`);

      if (result.user && result.session) {
        redirectUrl.searchParams.set('success', 'true');
        redirectUrl.searchParams.set('provider', providerId);

        // Set session cookie
        res.cookie('session-token', result.session.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          domain: process.env.COOKIE_DOMAIN,
        });
      } else {
        redirectUrl.searchParams.set('success', 'false');
        redirectUrl.searchParams.set('error', 'authentication_failed');
      }

      res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('OAuth callback error:', error);

      // Redirect to frontend with error
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = new URL(`${frontendUrl}/auth/callback`);
      redirectUrl.searchParams.set('success', 'false');
      redirectUrl.searchParams.set('error', error instanceof Error ? error.message : 'unknown_error');

      res.redirect(redirectUrl.toString());
    }
  }

  /**
   * Get user's connected OAuth accounts
   */
  static async getUserAccounts(req: Request, res: Response): Promise<void> {
    try {
      const request = new Request(req.url, {
        method: req.method,
        headers: new Headers(req.headers as any),
      });

      const session = await authUtils.getSession(request);

      if (!session) {
        throw new HttpError(401, 'Authentication required');
      }

      const accounts = await OAuthService.getUserAccounts(session.userId);

      res.json({
        accounts,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof HttpError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        console.error('Error fetching user OAuth accounts:', error);
        res.status(500).json({
          error: 'Failed to fetch OAuth accounts',
        });
      }
    }
  }

  /**
   * Link OAuth account to user
   */
  static async linkAccount(req: Request, res: Response): Promise<void> {
    try {
      const request = new Request(req.url, {
        method: req.method,
        headers: new Headers(req.headers as any),
        body: JSON.stringify(req.body),
      });

      const session = await authUtils.getSession(request);

      if (!session) {
        throw new HttpError(401, 'Authentication required');
      }

      const { providerId, code, state } = linkAccountSchema.parse(req.body);

      if (!OAuthService.isProviderEnabled(providerId)) {
        throw new HttpError(404, 'OAuth provider not found or disabled');
      }

      const result = await OAuthService.linkAccount(
        session.userId,
        providerId,
        code,
        state
      );

      res.json({
        success: true,
        account: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof HttpError) {
        res.status(error.statusCode).json({ error: error.message });
      } else if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      } else {
        console.error('Error linking OAuth account:', error);
        res.status(500).json({
          error: 'Failed to link OAuth account',
        });
      }
    }
  }

  /**
   * Unlink OAuth account from user
   */
  static async unlinkAccount(req: Request, res: Response): Promise<void> {
    try {
      const request = new Request(req.url, {
        method: req.method,
        headers: new Headers(req.headers as any),
      });

      const session = await authUtils.getSession(request);

      if (!session) {
        throw new HttpError(401, 'Authentication required');
      }

      const { providerId, providerAccountId } = unlinkAccountSchema.parse(req.body);

      const success = await OAuthService.unlinkAccount(
        session.userId,
        providerId,
        providerAccountId
      );

      if (success) {
        res.json({
          success: true,
          message: 'OAuth account unlinked successfully',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: 'Failed to unlink OAuth account',
        });
      }
    } catch (error) {
      if (error instanceof HttpError) {
        res.status(error.statusCode).json({ error: error.message });
      } else if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      } else {
        console.error('Error unlinking OAuth account:', error);
        res.status(500).json({
          error: 'Failed to unlink OAuth account',
        });
      }
    }
  }

  /**
   * Refresh OAuth access token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { providerId, refreshToken } = req.body;

      if (!providerId || !refreshToken) {
        throw new HttpError(400, 'Provider ID and refresh token are required');
      }

      if (!OAuthService.isProviderEnabled(providerId)) {
        throw new HttpError(404, 'OAuth provider not found or disabled');
      }

      const result = await OAuthService.refreshToken(providerId, refreshToken);

      res.json({
        success: true,
        tokens: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof HttpError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        console.error('Error refreshing OAuth token:', error);
        res.status(500).json({
          error: 'Failed to refresh OAuth token',
        });
      }
    }
  }

  /**
   * Revoke OAuth access
   */
  static async revokeAccess(req: Request, res: Response): Promise<void> {
    try {
      const { providerId, accessToken } = req.body;

      if (!providerId || !accessToken) {
        throw new HttpError(400, 'Provider ID and access token are required');
      }

      if (!OAuthService.isProviderEnabled(providerId)) {
        throw new HttpError(404, 'OAuth provider not found or disabled');
      }

      const success = await OAuthService.revokeAccess(providerId, accessToken);

      if (success) {
        res.json({
          success: true,
          message: 'OAuth access revoked successfully',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: 'Failed to revoke OAuth access',
        });
      }
    } catch (error) {
      if (error instanceof HttpError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        console.error('Error revoking OAuth access:', error);
        res.status(500).json({
          error: 'Failed to revoke OAuth access',
        });
      }
    }
  }

  /**
   * Validate OAuth configuration
   */
  static async validateConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const validation = OAuthService.validateConfiguration();

      res.json({
        valid: validation.valid,
        errors: validation.errors,
        providers: OAuthService.getProviders(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error validating OAuth configuration:', error);
      res.status(500).json({
        error: 'Failed to validate OAuth configuration',
      });
    }
  }
}