---
title: Authentication
sidebar_label: Authentication
---

# Authentication System

The Cortex WebUI uses [Better Auth](https://better-auth.com) for modern, secure authentication and session management.

## Features

- **Email/Password Authentication**: Traditional login with secure password handling
- **OAuth Providers**: Support for GitHub, Google, Microsoft, Discord
- **Session Management**: Secure sessions with automatic refresh
- **Password Reset**: Email-based password reset functionality
- **Two-Factor Authentication**: Optional 2FA support
- **Organization Support**: Multi-tenant organization management
- **Magic Links**: Passwordless authentication via email

## Configuration

### Backend Configuration

The backend authentication is configured in `backend/src/auth/index.ts`:

```typescript
import { betterAuth } from 'better-auth';
import { bearer, magicLink, organization, twoFactor } from 'better-auth/plugins';

export const auth = betterAuth({
  database: createBetterAuthAdapter(),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BASE_URL,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: env.NODE_ENV === 'production',
    sendResetPassword: async ({ user, url, token }) => {
      // Email sending logic
    },
    onPasswordReset: async ({ user }) => {
      // Post-reset logic
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  plugins: [
    bearer(),
    organization(),
    twoFactor({
      issuer: 'brAInwav Cortex-OS',
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // Magic link email logic
      },
    }),
  ],
});
```

### Frontend Configuration

The frontend auth client is configured in `frontend/src/lib/auth.ts`:

```typescript
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NODE_ENV === 'production'
    ? 'https://your-domain.com'
    : 'http://localhost:3001',
});

export const { useSession, signIn, signUp, signOut } = authClient;
```

## Usage

### Authentication Hook

Use the `useAuth` hook in React components:

```typescript
import { useAuth } from '@/lib/auth';

function MyComponent() {
  const {
    user,
    isAuthenticated,
    isPending,
    signIn,
    signOut
  } = useAuth();

  if (isPending) return <div>`Loading...&lt;/div&gt;`;

  if (!isAuthenticated) {
    return (
      <button onClick={() => signIn.email({ email, password })}>
        Sign In
      </button>
    );
  }

  return (
    <div>
      Welcome, {user.name}!
      <button onClick={() => signOut()}>Sign `Out&lt;/button&gt;`
    </div>
  );
}
```

### Session Management

```typescript
// Get current session
const session = useSession();

// Check authentication status
if (session.data?.user) {
  // User is authenticated
}

// Sign in with email/password
await authClient.signIn.email({
  email: 'user@example.com',
  password: 'password',
});

// Sign in with OAuth
await authClient.signIn.social({
  provider: 'github',
});

// Sign out
await authClient.signOut();
```

### Password Reset & Management

```typescript
// Request password reset
await authClient.forgetPassword({
  email: 'user@example.com',
});

// Reset password with token
await authClient.resetPassword({
  newPassword: 'newPassword',
  token: 'reset-token',
});

// Change password (authenticated user)
await authClient.changePassword({
  newPassword: 'newPassword',
  currentPassword: 'currentPassword',
});
```

## API Endpoints

Better Auth automatically provides these endpoints:

### Authentication
- `POST /api/auth/sign-up/email` - Email/password registration
- `POST /api/auth/sign-in/email` - Email/password login
- `POST /api/auth/sign-in/social` - OAuth login
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/session` - Get current session

### Password Management
- `POST /api/auth/forget-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/change-password` - Change password (authenticated)

### OAuth
- `GET /api/auth/signin/{provider}` - Initiate OAuth flow
- `GET /api/auth/callback/{provider}` - OAuth callback

### Organizations (if enabled)
- `GET /api/auth/organizations` - List user organizations
- `POST /api/auth/organizations` - Create organization
- `POST /api/auth/organizations/{id}/members` - Add member

## Environment Variables

Required environment variables:

```bash
# Backend (.env)
BETTER_AUTH_SECRET=your-secret-key
BASE_URL=http://localhost:3001
DATABASE_URL=file:./dev.db

# OAuth providers (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Security Features

- **CSRF Protection**: Automatic CSRF protection for all requests
- **Secure Cookies**: HttpOnly, Secure, and SameSite cookie attributes
- **Session Security**: Automatic session rotation and validation
- **Rate Limiting**: Built-in rate limiting for auth endpoints
- **Password Security**: Secure password hashing with bcrypt
- **Email Verification**: Optional email verification for new accounts

## Error Handling

Common error codes:

- `UNAUTHORIZED` - Invalid credentials or expired session
- `EMAIL_NOT_VERIFIED` - Email verification required
- `RATE_LIMITED` - Too many requests
- `INVALID_TOKEN` - Invalid or expired token
- `USER_EXISTS` - Email already registered

## Migration from Legacy JWT

If migrating from a legacy JWT system:

1. Update authentication endpoints to use Better Auth format
2. Replace JWT middleware with Better Auth session validation
3. Update frontend to use Better Auth React hooks
4. Migrate user data using Better Auth adapter patterns

## Troubleshooting

### Common Issues

1. **Session not persisting**: Check cookie configuration and domain settings
2. **OAuth redirect errors**: Verify callback URLs in provider settings
3. **Email sending failures**: Check email service configuration
4. **Database errors**: Ensure database schema is up to date

### Debug Mode

Enable debug logging:

```typescript
export const auth = betterAuth({
  // ... other config
  advanced: {
    debug: process.env.NODE_ENV === 'development',
  },
});
```

## brAInwav Integration

All authentication events include brAInwav branding and are integrated with the Cortex-OS ecosystem:

- User registration events are published to the A2A event bus
- Authentication monitoring is integrated with the observability system
- All auth-related logs include "brAInwav" context for proper identification
